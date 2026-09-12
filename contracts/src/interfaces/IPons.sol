// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Minimal surface of the Pons V2 launchpad, copied from github.com/ponsdotdev/ponsfamily.

enum GraduationPhase {
    NotGraduated,
    Swept,
    PoolCreated,
    Rescued
}

struct LaunchedToken {
    address token;
    address curve;
    address deployer;
    address creatorFeeRecipient;
    address pairToken;
    uint256 graduationThreshold;
    uint24 poolFee;
    int24 tickSpacing;
    uint16 creatorTaxBps;
    bool buybackEnabled;
    GraduationPhase phase;
    uint256 sweptQuote;
    uint256 sweptTokens;
    uint256 sweptAt;
    bool exists;
}

interface IPonsV2LaunchFactory {
    function getLaunchedToken(address token) external view returns (LaunchedToken memory);
    function feeEscrow() external view returns (address);
    function memeHook() external view returns (address);
    function poolManager() external view returns (address);
}

interface IPonsV2BondingCurve {
    function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) external payable returns (uint256);
    function graduated() external view returns (bool);
}

/// @notice Creator fees are credited here, not pushed. The recipient claims them.
interface IPonsV2FeeEscrow {
    function claimToken(address token) external returns (uint256 amount);
    function balanceOfToken(address recipient, address token) external view returns (uint256);
}
