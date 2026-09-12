// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @notice Chainlink-style price feed.
interface IPriceFeed {
    function latestRoundData() external view returns (uint80, int256 answer, uint256, uint256 updatedAt, uint80);
    function decimals() external view returns (uint8);
}

/// @notice Swaps SPY into a stock token. Implemented per venue (Uniswap v4 on Robinhood Chain).
interface ISwapper {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut);
}

/// @title The Press
/// @notice Receives $CHAIR trading fees in SPY. The Chair picks a stock. Anyone presses BRRR to buy it.
///         Holders claim their share against Merkle roots posted by the Tally.
///
/// No owner, no pause, no upgrades. The only privileged key is the tally key, and all it can do is
/// post roots (which wait ROOT_DELAY) and hand itself to a new address.
contract Press is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- fixed rules ----------
    uint256 public constant MIN_GAP = 5 minutes; // between prints, and from launch to first print
    uint256 public constant ROOT_DELAY = 5 minutes; // a posted root waits this long before claims
    uint256 public constant DECAY = 2 hours; // takeover price falls to the minimum over this time
    uint256 public constant PREMIUM_BPS = 11_000; // takeover starts at 110% of the sitting Chair's buy
    uint256 public constant SALARY_BPS = 200; // 2% of each print to the Chair
    uint256 public constant TIP_BPS = 10; // 0.1% of each print to whoever presses BRRR
    uint256 public constant MAX_SLIPPAGE_BPS = 100; // swap must land within 1% of Chainlink
    uint256 public constant MAX_STALE = 1 hours; // a feed older than this blocks BRRR
    uint256 public constant BPS = 10_000;

    IERC20 public immutable CHAIR;
    IERC20 public immutable SPY;
    IPriceFeed public immutable SPY_FEED;
    ISwapper public immutable SWAPPER;
    address public immutable DESK; // the only address that can seat a Chair
    uint256 public immutable LAUNCH_TIME;
    uint256 public immutable PRINT_THRESHOLD; // SPY needed before BRRR
    uint256 public immutable MIN_TAKEOVER; // SPY

    // ---------- allowed picks ----------
    mapping(address => IPriceFeed) public feedOf; // stock token => feed; zero means not allowed
    address[] public stockList;

    // ---------- the Chair ----------
    address public chair;
    address public pick; // stock token, defaults to SPY when the seat is empty
    uint256 public stakeSpy; // SPY the Chair spent to take the seat
    uint256 public stakeChair; // $CHAIR the Chair received and must keep holding
    uint256 public seatedAt;

    // ---------- prints ----------
    uint256 public lastPrint;
    uint256 public printCount;
    mapping(address => uint256) public forHolders; // stock => total ever set aside for holders
    mapping(address => uint256) public claimedTotal; // stock => total ever claimed

    // ---------- the Tally ----------
    address public tallyKey;
    bytes32 public activeRoot;
    bytes32 public pendingRoot;
    uint256 public pendingAt;
    mapping(address => mapping(address => uint256)) public claimed; // holder => stock => claimed

    // ---------- events ----------
    event Seated(address indexed chair, uint256 spySpent, uint256 chairBought, address indexed pick);
    event Vacated(address indexed chair, string reason);
    event PickChanged(address indexed chair, address indexed pick);
    event Print(
        uint256 indexed n,
        address indexed stock,
        uint256 spyIn,
        uint256 stockOut,
        uint256 toHolders,
        address chair,
        address presser
    );
    event RootPosted(bytes32 indexed root, uint256 activeAfter);
    event RootActivated(bytes32 indexed root);
    event Claimed(address indexed holder, address indexed stock, uint256 amount);
    event TallyKeyTransferred(address indexed from, address indexed to);

    error NotDesk();
    error NotChair();
    error NotTally();
    error NotAllowed();
    error TooSoon();
    error NotEnough();
    error StaleFeed();
    error BadFeed();
    error StakeStillHeld();
    error NothingToClaim();
    error BadProof();
    error OverCap();
    error ZeroAddress();

    constructor(
        address chairToken,
        address spy,
        address spyFeed,
        address swapper,
        address desk,
        address tally,
        uint256 printThreshold,
        uint256 minTakeover,
        address[] memory stocks,
        address[] memory feeds
    ) {
        if (
            chairToken == address(0) || spy == address(0) || spyFeed == address(0) || swapper == address(0)
                || desk == address(0) || tally == address(0)
        ) revert ZeroAddress();
        require(stocks.length == feeds.length, "length");
        CHAIR = IERC20(chairToken);
        SPY = IERC20(spy);
        SPY_FEED = IPriceFeed(spyFeed);
        SWAPPER = ISwapper(swapper);
        DESK = desk;
        tallyKey = tally;
        LAUNCH_TIME = block.timestamp;
        lastPrint = block.timestamp;
        PRINT_THRESHOLD = printThreshold;
        MIN_TAKEOVER = minTakeover;
        pick = spy;
        // SPY itself is always an allowed pick.
        feedOf[spy] = IPriceFeed(spyFeed);
        stockList.push(spy);
        for (uint256 i = 0; i < stocks.length; i++) {
            if (stocks[i] == address(0) || feeds[i] == address(0)) revert ZeroAddress();
            feedOf[stocks[i]] = IPriceFeed(feeds[i]);
            stockList.push(stocks[i]);
        }
    }

    // =====================================================================
    // The Chair
    // =====================================================================

    /// @notice How much SPY a takeover needs right now.
    function takeoverPrice() public view returns (uint256) {
        if (chair == address(0)) return MIN_TAKEOVER;
        uint256 start = (stakeSpy * PREMIUM_BPS) / BPS;
        if (start <= MIN_TAKEOVER) return MIN_TAKEOVER;
        uint256 elapsed = block.timestamp - seatedAt;
        if (elapsed >= DECAY) return MIN_TAKEOVER;
        return start - ((start - MIN_TAKEOVER) * elapsed) / DECAY;
    }

    /// @notice True while the Chair still holds at least the $CHAIR they bought to take the seat.
    function chairHoldsStake() public view returns (bool) {
        if (chair == address(0)) return false;
        return CHAIR.balanceOf(chair) >= stakeChair;
    }

    /// @notice Called by the desk after it has bought $CHAIR for `who` with `spySpent` SPY.
    function seat(address who, uint256 spySpent, uint256 chairBought, address newPick) external {
        if (msg.sender != DESK) revert NotDesk();
        if (spySpent < takeoverPrice()) revert NotEnough();
        if (address(feedOf[newPick]) == address(0)) revert NotAllowed();
        if (chair != address(0)) emit Vacated(chair, "outbid");
        chair = who;
        pick = newPick;
        stakeSpy = spySpent;
        stakeChair = chairBought;
        seatedAt = block.timestamp;
        emit Seated(who, spySpent, chairBought, newPick);
    }

    /// @notice The Chair can change their pick at any time.
    function setPick(address newPick) external {
        if (msg.sender != chair) revert NotChair();
        if (address(feedOf[newPick]) == address(0)) revert NotAllowed();
        pick = newPick;
        emit PickChanged(msg.sender, newPick);
    }

    /// @notice Anyone can remove a Chair that no longer holds their stake.
    function removeChair() external {
        if (chair == address(0)) revert NotChair();
        if (chairHoldsStake()) revert StakeStillHeld();
        _vacate("sold stake");
    }

    function _vacate(string memory reason) internal {
        emit Vacated(chair, reason);
        chair = address(0);
        pick = address(SPY);
        stakeSpy = 0;
        stakeChair = 0;
        seatedAt = 0;
    }

    // =====================================================================
    // BRRR
    // =====================================================================

    /// @notice True when BRRR would succeed on the timing and balance rules (not the price feed).
    function canPrint() public view returns (bool) {
        return block.timestamp >= LAUNCH_TIME + MIN_GAP && block.timestamp >= lastPrint + MIN_GAP
            && SPY.balanceOf(address(this)) >= PRINT_THRESHOLD;
    }

    /// @notice Spend the whole SPY balance on the Chair's pick and set it aside for holders.
    function brrr() external nonReentrant {
        if (block.timestamp < LAUNCH_TIME + MIN_GAP || block.timestamp < lastPrint + MIN_GAP) revert TooSoon();
        uint256 spyIn = SPY.balanceOf(address(this));
        if (spyIn < PRINT_THRESHOLD) revert NotEnough();

        if (chair != address(0) && !chairHoldsStake()) _vacate("sold stake");
        address stock = pick;
        address sittingChair = chair;

        uint256 out;
        if (stock == address(SPY)) {
            out = spyIn;
        } else {
            uint256 expected = _expectedOut(stock, spyIn);
            uint256 minOut = (expected * (BPS - MAX_SLIPPAGE_BPS)) / BPS;
            uint256 before = IERC20(stock).balanceOf(address(this));
            SPY.forceApprove(address(SWAPPER), spyIn);
            SWAPPER.swap(address(SPY), stock, spyIn, minOut, address(this));
            out = IERC20(stock).balanceOf(address(this)) - before;
            if (out < minOut) revert NotEnough();
        }

        uint256 salary = sittingChair == address(0) ? 0 : (out * SALARY_BPS) / BPS;
        uint256 tip = (out * TIP_BPS) / BPS;
        uint256 toHolders = out - salary - tip;

        lastPrint = block.timestamp;
        printCount += 1;
        forHolders[stock] += toHolders;

        if (salary > 0) IERC20(stock).safeTransfer(sittingChair, salary);
        if (tip > 0) IERC20(stock).safeTransfer(msg.sender, tip);

        emit Print(printCount, stock, spyIn, out, toHolders, sittingChair, msg.sender);
    }

    /// @dev Expected stock out for `spyIn`, from the two Chainlink feeds, adjusted for token decimals.
    function _expectedOut(address stock, uint256 spyIn) internal view returns (uint256) {
        uint256 spyPrice = _price(SPY_FEED);
        uint256 stockPrice = _price(feedOf[stock]);
        uint8 spyDec = IERC20Metadata(address(SPY)).decimals();
        uint8 stockDec = IERC20Metadata(stock).decimals();
        // spyIn * spyPrice / stockPrice, moved from SPY decimals to stock decimals.
        uint256 value = spyIn * spyPrice; // in SPY-decimals * feed-decimals
        uint256 outRaw = value / stockPrice; // in SPY decimals
        if (stockDec >= spyDec) return outRaw * (10 ** (stockDec - spyDec));
        return outRaw / (10 ** (spyDec - stockDec));
    }

    function _price(IPriceFeed feed) internal view returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        if (answer <= 0) revert BadFeed();
        if (block.timestamp - updatedAt > MAX_STALE) revert StaleFeed();
        // All feeds are expected to share one decimals value (8 on Chainlink). Ratios cancel it out.
        return uint256(answer);
    }

    // =====================================================================
    // The Tally and claims
    // =====================================================================

    /// @notice Post a new Merkle root of running totals. It becomes claimable after ROOT_DELAY.
    function postRoot(bytes32 root) external {
        if (msg.sender != tallyKey) revert NotTally();
        _activatePending();
        pendingRoot = root;
        pendingAt = block.timestamp;
        emit RootPosted(root, block.timestamp + ROOT_DELAY);
    }

    function transferTallyKey(address to) external {
        if (msg.sender != tallyKey) revert NotTally();
        if (to == address(0)) revert ZeroAddress();
        emit TallyKeyTransferred(tallyKey, to);
        tallyKey = to;
    }

    /// @notice Anyone can flip a pending root to active once its delay has passed.
    function activateRoot() external {
        _activatePending();
    }

    function _activatePending() internal {
        if (pendingRoot != bytes32(0) && block.timestamp >= pendingAt + ROOT_DELAY) {
            activeRoot = pendingRoot;
            pendingRoot = bytes32(0);
            emit RootActivated(activeRoot);
        }
    }

    /// @notice The root claims are checked against right now.
    function currentRoot() public view returns (bytes32) {
        if (pendingRoot != bytes32(0) && block.timestamp >= pendingAt + ROOT_DELAY) return pendingRoot;
        return activeRoot;
    }

    /// @notice Claim everything owed of `stock`. `cumulative` is the running total in the active root.
    ///         Leaf format matches OpenZeppelin StandardMerkleTree with types (address, address, uint256).
    function claim(address stock, uint256 cumulative, bytes32[] calldata proof) external nonReentrant {
        _activatePending();
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, stock, cumulative))));
        if (!MerkleProof.verify(proof, activeRoot, leaf)) revert BadProof();
        uint256 already = claimed[msg.sender][stock];
        if (cumulative <= already) revert NothingToClaim();
        uint256 owed = cumulative - already;
        if (claimedTotal[stock] + owed > forHolders[stock]) revert OverCap();
        claimed[msg.sender][stock] = cumulative;
        claimedTotal[stock] += owed;
        IERC20(stock).safeTransfer(msg.sender, owed);
        emit Claimed(msg.sender, stock, owed);
    }

    // =====================================================================
    // Views
    // =====================================================================

    function stocks() external view returns (address[] memory) {
        return stockList;
    }

    function isAllowed(address stock) external view returns (bool) {
        return address(feedOf[stock]) != address(0);
    }

    function pressBalance() external view returns (uint256) {
        return SPY.balanceOf(address(this));
    }
}
