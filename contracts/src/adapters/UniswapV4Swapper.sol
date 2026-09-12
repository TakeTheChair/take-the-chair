// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PoolKey} from "../interfaces/IUniswapV4.sol";
import {V4ExactInput} from "./V4ExactInput.sol";

/// @title SPY -> stock token swapper
/// @notice The Press calls `swap` during BRRR. Each allowed stock has one Uniswap v4 pool key
///         against SPY, fixed at deploy. The Press separately checks the result against Chainlink.
contract UniswapV4Swapper is V4ExactInput {
    using SafeERC20 for IERC20;

    address public immutable SPY;
    mapping(address => PoolKey) public keyOf; // stock => SPY/stock pool

    error NoPool(address stock);
    error BadInput();

    constructor(address poolManager, address spy, address[] memory stocks, uint24[] memory fees, int24[] memory tickSpacings, address[] memory hooks)
        V4ExactInput(poolManager)
    {
        SPY = spy;
        require(stocks.length == fees.length && fees.length == tickSpacings.length && tickSpacings.length == hooks.length, "length");
        for (uint256 i = 0; i < stocks.length; i++) {
            (address c0, address c1) = spy < stocks[i] ? (spy, stocks[i]) : (stocks[i], spy);
            keyOf[stocks[i]] = PoolKey({currency0: c0, currency1: c1, fee: fees[i], tickSpacing: tickSpacings[i], hooks: hooks[i]});
        }
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut)
    {
        if (tokenIn != SPY) revert BadInput();
        PoolKey memory key = keyOf[tokenOut];
        if (key.currency0 == address(0)) revert NoPool(tokenOut);
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        amountOut = _swapExactIn(key, tokenIn, amountIn, minOut, to);
    }
}
