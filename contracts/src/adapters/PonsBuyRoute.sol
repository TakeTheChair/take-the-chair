// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPonsV2LaunchFactory, IPonsV2BondingCurve, LaunchedToken, GraduationPhase} from "../interfaces/IPons.sol";
import {PoolKey} from "../interfaces/IUniswapV4.sol";
import {V4ExactInput} from "./V4ExactInput.sol";

/// @title SPY -> $CHAIR buy route
/// @notice Used by the takeover desk. Buys on the Pons bonding curve before graduation and on
///         the graduated Uniswap v4 pool (with the Pons hook) afterwards. Reads everything it
///         needs from the Pons factory, so nothing is hardcoded per launch.
contract PonsBuyRoute is V4ExactInput {
    using SafeERC20 for IERC20;

    IPonsV2LaunchFactory public immutable FACTORY;
    IERC20 public immutable SPY;
    IERC20 public immutable CHAIR;

    error UnknownLaunch();
    error NotTradeable();

    constructor(address factory, address spy, address chairToken) V4ExactInput(IPonsV2LaunchFactory(factory).poolManager()) {
        FACTORY = IPonsV2LaunchFactory(factory);
        SPY = IERC20(spy);
        CHAIR = IERC20(chairToken);
    }

    function buy(uint256 spyIn, uint256 minChairOut, address to) external returns (uint256 chairOut) {
        LaunchedToken memory launch = FACTORY.getLaunchedToken(address(CHAIR));
        if (!launch.exists || launch.pairToken != address(SPY)) revert UnknownLaunch();
        SPY.safeTransferFrom(msg.sender, address(this), spyIn);

        if (launch.phase == GraduationPhase.NotGraduated && !IPonsV2BondingCurve(launch.curve).graduated()) {
            SPY.forceApprove(launch.curve, spyIn);
            chairOut = IPonsV2BondingCurve(launch.curve).buy(spyIn, minChairOut, to);
            // The curve refunds any unspent quote to msg.sender (this contract); pass it on.
            uint256 left = SPY.balanceOf(address(this));
            if (left != 0) SPY.safeTransfer(to, left);
            return chairOut;
        }
        if (launch.phase != GraduationPhase.PoolCreated) revert NotTradeable();

        (address c0, address c1) = address(SPY) < address(CHAIR)
            ? (address(SPY), address(CHAIR))
            : (address(CHAIR), address(SPY));
        PoolKey memory key =
            PoolKey({currency0: c0, currency1: c1, fee: launch.poolFee, tickSpacing: launch.tickSpacing, hooks: FACTORY.memeHook()});
        chairOut = _swapExactIn(key, address(SPY), spyIn, minChairOut, to);
    }
}
