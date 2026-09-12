// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockToken is ERC20 {
    uint8 private immutable _dec;
    constructor(string memory n, uint8 d) ERC20(n, n) { _dec = d; }
    function decimals() public view override returns (uint8) { return _dec; }
    function mint(address to, uint256 a) external { _mint(to, a); }
}

contract MockFeed {
    int256 public answer; uint256 public updatedAt;
    constructor(int256 a) { answer = a; updatedAt = block.timestamp; }
    function set(int256 a) external { answer = a; updatedAt = block.timestamp; }
    function setStale(uint256 t) external { updatedAt = t; }
    function decimals() external pure returns (uint8) { return 8; }
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (0, answer, 0, updatedAt, 0);
    }
}

/// Swaps at a rate the test controls: out = in * rateBps / 10000 * decimalsAdj.
contract MockSwapper {
    uint256 public rateBps = 10_000; // 1:1 by value after the test sets prices equal
    uint256 public outPerIn; // explicit: stock out per 1e18 SPY in
    function setOutPerIn(uint256 v) external { outPerIn = v; }
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256, address to) external returns (uint256 out) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        out = amountIn * outPerIn / 1e18;
        MockToken(tokenOut).mint(to, out);
    }
}

/// Buys $CHAIR at a fixed rate and forwards a slice of SPY to the Press as "fees".
contract MockRoute {
    IERC20 immutable spy; MockToken immutable chair; address press;
    uint256 public chairPerSpy = 1_000_000e18; // 1 SPY -> 1,000,000 CHAIR
    uint256 public feeBps = 200;
    constructor(address s, address c) { spy = IERC20(s); chair = MockToken(c); }
    function setPress(address p) external { press = p; }
    function buy(uint256 spyIn, uint256, address to) external returns (uint256 out) {
        spy.transferFrom(msg.sender, address(this), spyIn);
        if (press != address(0)) spy.transfer(press, spyIn * feeBps / 10_000);
        out = spyIn * chairPerSpy / 1e18;
        chair.mint(to, out);
    }
}

contract MockEscrow {
    mapping(address => mapping(address => uint256)) public balanceOfToken; // recipient => token => amount

    function credit(address recipient, address token, uint256 amount) external {
        MockToken(token).mint(address(this), amount);
        balanceOfToken[recipient][token] += amount;
    }

    function claimToken(address token) external returns (uint256 amount) {
        amount = balanceOfToken[msg.sender][token];
        balanceOfToken[msg.sender][token] = 0;
        MockToken(token).transfer(msg.sender, amount);
    }
}

contract MockPonsFactory {
    address public feeEscrow;

    constructor(address escrow) {
        feeEscrow = escrow;
    }
}
