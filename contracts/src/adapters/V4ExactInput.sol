// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPoolManager, IUnlockCallback, PoolKey, SwapParams} from "../interfaces/IUniswapV4.sol";

/// @notice Shared exact-input single-pool swap against the Uniswap v4 PoolManager.
///         The caller must already hold `amountIn` of the input token in this contract.
abstract contract V4ExactInput is IUnlockCallback {
    using SafeERC20 for IERC20;

    uint160 internal constant MIN_SQRT_PRICE = 4295128739;
    uint160 internal constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342;

    IPoolManager public immutable POOL_MANAGER;

    error NotPoolManager();
    error TooLittleOut(uint256 got, uint256 want);

    constructor(address poolManager) {
        POOL_MANAGER = IPoolManager(poolManager);
    }

    struct SwapData {
        PoolKey key;
        bool zeroForOne;
        uint256 amountIn;
        uint256 minOut;
        address to;
    }

    function _swapExactIn(PoolKey memory key, address tokenIn, uint256 amountIn, uint256 minOut, address to)
        internal
        returns (uint256 amountOut)
    {
        bool zeroForOne = tokenIn == key.currency0;
        bytes memory result = POOL_MANAGER.unlock(
            abi.encode(SwapData({key: key, zeroForOne: zeroForOne, amountIn: amountIn, minOut: minOut, to: to}))
        );
        amountOut = abi.decode(result, (uint256));
    }

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        if (msg.sender != address(POOL_MANAGER)) revert NotPoolManager();
        SwapData memory d = abi.decode(data, (SwapData));

        int256 delta = POOL_MANAGER.swap(
            d.key,
            SwapParams({
                zeroForOne: d.zeroForOne,
                amountSpecified: -int256(d.amountIn),
                sqrtPriceLimitX96: d.zeroForOne ? MIN_SQRT_PRICE + 1 : MAX_SQRT_PRICE - 1
            }),
            ""
        );
        int128 amount0 = int128(delta >> 128);
        int128 amount1 = int128(delta);

        address tokenIn = d.zeroForOne ? d.key.currency0 : d.key.currency1;
        address tokenOut = d.zeroForOne ? d.key.currency1 : d.key.currency0;
        uint256 owed = uint256(uint128(-(d.zeroForOne ? amount0 : amount1)));
        uint256 got = uint256(uint128(d.zeroForOne ? amount1 : amount0));
        if (got < d.minOut) revert TooLittleOut(got, d.minOut);

        POOL_MANAGER.sync(tokenIn);
        IERC20(tokenIn).safeTransfer(address(POOL_MANAGER), owed);
        POOL_MANAGER.settle();
        POOL_MANAGER.take(tokenOut, d.to, got);
        return abi.encode(got);
    }
}
