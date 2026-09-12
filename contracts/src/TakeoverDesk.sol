// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPress {
    function takeoverPrice() external view returns (uint256);
    function seat(address who, uint256 spySpent, uint256 chairBought, address pick) external;
}

/// @notice Buys $CHAIR with SPY. One implementation per venue: the Pons bonding curve before
///         graduation, Uniswap v4 after. Must send the $CHAIR to `to` and return how much it sent.
interface IBuyRoute {
    function buy(uint256 spyIn, uint256 minChairOut, address to) external returns (uint256 chairOut);
}

/// @title The takeover desk
/// @notice The only way to take the Chair. Buys $CHAIR for the caller, then seats them in the Press.
contract TakeoverDesk is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable SPY;
    IERC20 public immutable CHAIR;
    IBuyRoute public immutable ROUTE;
    address public press; // set once, right after the Press is deployed

    error PressAlreadySet();
    error NotEnough();
    error NotPress();

    event Takeover(address indexed who, uint256 spyIn, uint256 chairOut, address indexed pick);

    constructor(address spy, address chairToken, address route) {
        SPY = IERC20(spy);
        CHAIR = IERC20(chairToken);
        ROUTE = IBuyRoute(route);
    }

    /// @dev Desk and Press reference each other, so the Press address is filled in once after deploy.
    function setPress(address p) external {
        if (press != address(0)) revert PressAlreadySet();
        press = p;
    }

    /// @notice Spend `spyIn` SPY on $CHAIR and take the seat. Reverts if below the takeover price.
    function takeover(uint256 spyIn, uint256 minChairOut, address pick) external nonReentrant {
        if (spyIn < IPress(press).takeoverPrice()) revert NotEnough();
        SPY.safeTransferFrom(msg.sender, address(this), spyIn);
        SPY.forceApprove(address(ROUTE), spyIn);
        uint256 before = CHAIR.balanceOf(msg.sender);
        ROUTE.buy(spyIn, minChairOut, msg.sender);
        uint256 got = CHAIR.balanceOf(msg.sender) - before;
        if (got < minChairOut) revert NotEnough();
        IPress(press).seat(msg.sender, spyIn, got, pick);
        emit Takeover(msg.sender, spyIn, got, pick);
    }
}
