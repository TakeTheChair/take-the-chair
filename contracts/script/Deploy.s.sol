// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Press} from "../src/Press.sol";
import {TakeoverDesk} from "../src/TakeoverDesk.sol";
import {UniswapV4Swapper} from "../src/adapters/UniswapV4Swapper.sol";
import {PonsBuyRoute} from "../src/adapters/PonsBuyRoute.sol";

/// @notice Deploys the buy route, the swapper, the takeover desk and the Press on Robinhood Chain (4663)
///         and wires them together.
///
///   CHAIR_TOKEN=0x... TALLY_KEY=0x... SPY_FEED=0x... \
///   forge script script/Deploy.s.sol --rpc-url https://rpc.mainnet.chain.robinhood.com --broadcast --verify
///
/// The Robinhood Chain addresses below come from docs.robinhood.com/chain, developers.uniswap.org
/// and github.com/ponsdotdev/ponsfamily. The $CHAIR token address only exists once Pons creates it,
/// so it is read from the environment, as is the Tally wallet.
contract Deploy is Script {
    // Robinhood Chain: Pons V2 launch factory and the Uniswap v4 PoolManager.
    address constant PONS_FACTORY = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;
    address constant POOL_MANAGER = 0x8366a39CC670B4001A1121B8F6A443A643e40951;

    // Robinhood stock tokens (mainnet, 18 decimals).
    address constant SPY = 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;

    // Chainlink tokenized-equity feeds (8 decimals, 24/5).
    address constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address constant TSLA_FEED = 0x4A1166a659A55625345e9515b32adECea5547C38;
    address constant AAPL_FEED = 0x6B22A786bAa607d76728168703a39Ea9C99f2cD0;

    // Uniswap v4 SPY/stock pools the Press buys through. Standard 0.30% tier, no hook.
    uint24 constant POOL_FEE = 3000;
    int24 constant TICK_SPACING = 60;

    uint256 constant PRINT_THRESHOLD = 5e18; // 5 SPY before BRRR
    uint256 constant MIN_TAKEOVER = 0.5e18; // 0.5 SPY

    function picks() internal pure returns (address[] memory stocks, address[] memory feeds) {
        stocks = new address[](3);
        feeds = new address[](3);
        (stocks[0], feeds[0]) = (NVDA, NVDA_FEED);
        (stocks[1], feeds[1]) = (TSLA, TSLA_FEED);
        (stocks[2], feeds[2]) = (AAPL, AAPL_FEED);
    }

    function deploySwapper(address[] memory stocks) internal returns (address) {
        uint24[] memory fees = new uint24[](stocks.length);
        int24[] memory spacings = new int24[](stocks.length);
        address[] memory hooks = new address[](stocks.length);
        for (uint256 i = 0; i < stocks.length; i++) {
            fees[i] = POOL_FEE;
            spacings[i] = TICK_SPACING;
        }
        return address(new UniswapV4Swapper(POOL_MANAGER, SPY, stocks, fees, spacings, hooks));
    }

    function run() external {
        address chairToken = vm.envAddress("CHAIR_TOKEN");
        (address[] memory stocks, address[] memory feeds) = picks();

        vm.startBroadcast();
        PonsBuyRoute route = new PonsBuyRoute(PONS_FACTORY, SPY, chairToken);
        address swapper = deploySwapper(stocks);
        TakeoverDesk desk = new TakeoverDesk(SPY, chairToken, address(route));
        Press press = new Press(
            chairToken,
            SPY,
            vm.envAddress("SPY_FEED"), // docs.chain.link/data-feeds/price-feeds/addresses?network=robinhood
            swapper,
            address(desk),
            PONS_FACTORY,
            vm.envAddress("TALLY_KEY"),
            PRINT_THRESHOLD,
            MIN_TAKEOVER,
            stocks,
            feeds
        );
        desk.setPress(address(press));
        vm.stopBroadcast();

        console.log("Press:", address(press));
        console.log("TakeoverDesk:", address(desk));
        console.log("Next: set the Pons creator fee recipient for $CHAIR to the Press address,");
        console.log("then paste Press and desk into lib/site.ts and tally/config.json.");
    }
}
