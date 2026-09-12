// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Press} from "../src/Press.sol";
import {TakeoverDesk} from "../src/TakeoverDesk.sol";
import {MockToken, MockFeed, MockSwapper, MockRoute} from "./Mocks.sol";

contract PressTest is Test {
    MockToken spy;
    MockToken chair;
    MockToken nvda;
    MockToken fake;
    MockFeed spyFeed;
    MockFeed nvdaFeed;
    MockSwapper swapper;
    MockRoute route;
    TakeoverDesk desk;
    Press press;

    address tally = makeAddr("tally");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 constant THRESHOLD = 5e18;
    uint256 constant MIN_TAKEOVER = 0.5e18;

    function setUp() public {
        vm.warp(1_000_000);
        spy = new MockToken("SPY", 18);
        chair = new MockToken("CHAIR", 18);
        nvda = new MockToken("NVDA", 18);
        fake = new MockToken("FAKE", 18);
        spyFeed = new MockFeed(500e8); // $500
        nvdaFeed = new MockFeed(125e8); // $125, so 1 SPY = 4 NVDA
        swapper = new MockSwapper();
        swapper.setOutPerIn(4e18);
        route = new MockRoute(address(spy), address(chair));
        desk = new TakeoverDesk(address(spy), address(chair), address(route));

        address[] memory stocks = new address[](1);
        address[] memory feeds = new address[](1);
        stocks[0] = address(nvda);
        feeds[0] = address(nvdaFeed);
        press = new Press(
            address(chair), address(spy), address(spyFeed), address(swapper), address(desk), tally, THRESHOLD,
            MIN_TAKEOVER, stocks, feeds
        );
        desk.setPress(address(press));
        route.setPress(address(press));

        for (uint256 i = 0; i < 3; i++) {
            address a = [alice, bob, carol][i];
            spy.mint(a, 100e18);
            vm.prank(a);
            spy.approve(address(desk), type(uint256).max);
        }
    }

    function _takeover(address who, uint256 amount, address pick) internal {
        vm.prank(who);
        desk.takeover(amount, 0, pick);
    }

    function _fill() internal {
        spy.mint(address(press), THRESHOLD);
    }

    function _pastGap() internal {
        vm.warp(block.timestamp + 5 minutes);
    }

    // ---------------- Chair and picks ----------------

    function test_emptySeatCostsMinimum() public view {
        assertEq(press.takeoverPrice(), MIN_TAKEOVER);
        assertEq(press.pick(), address(spy));
    }

    function test_takeoverSeatsChairAndFeesReachPress() public {
        _takeover(alice, 1e18, address(nvda));
        assertEq(press.chair(), alice);
        assertEq(press.pick(), address(nvda));
        assertEq(press.stakeChair(), 1_000_000e18);
        assertEq(spy.balanceOf(address(press)), 0.02e18); // route forwarded 2%
    }

    function test_takeoverBelowPriceReverts() public {
        _takeover(alice, 1e18, address(nvda));
        vm.expectRevert(TakeoverDesk.NotEnough.selector);
        _takeover(bob, 1.05e18, address(nvda)); // needs 110% = 1.1
    }

    function test_takeoverPriceDecaysToMinimum() public {
        _takeover(alice, 1e18, address(nvda));
        assertEq(press.takeoverPrice(), 1.1e18);
        vm.warp(block.timestamp + 1 hours);
        assertEq(press.takeoverPrice(), 1.1e18 - (1.1e18 - MIN_TAKEOVER) / 2);
        vm.warp(block.timestamp + 1 hours);
        assertEq(press.takeoverPrice(), MIN_TAKEOVER);
        _takeover(bob, MIN_TAKEOVER, address(nvda));
        assertEq(press.chair(), bob);
    }

    function test_onlyDeskCanSeat() public {
        vm.prank(alice);
        vm.expectRevert(Press.NotDesk.selector);
        press.seat(alice, 100e18, 1, address(nvda));
    }

    function test_cannotPickUnlistedToken() public {
        vm.expectRevert(Press.NotAllowed.selector);
        _takeover(alice, 1e18, address(fake));
        _takeover(alice, 1e18, address(nvda));
        vm.prank(alice);
        vm.expectRevert(Press.NotAllowed.selector);
        press.setPick(address(fake));
    }

    function test_onlyChairSetsPick() public {
        _takeover(alice, 1e18, address(nvda));
        vm.prank(bob);
        vm.expectRevert(Press.NotChair.selector);
        press.setPick(address(spy));
        vm.prank(alice);
        press.setPick(address(spy));
        assertEq(press.pick(), address(spy));
    }

    function test_chairWhoSellsCanBeRemovedByAnyone() public {
        _takeover(alice, 1e18, address(nvda));
        vm.prank(bob);
        vm.expectRevert(Press.StakeStillHeld.selector);
        press.removeChair();
        vm.prank(alice);
        chair.transfer(carol, 1); // dropping even one wei below the stake counts
        vm.prank(bob);
        press.removeChair();
        assertEq(press.chair(), address(0));
        assertEq(press.pick(), address(spy));
        assertEq(press.takeoverPrice(), MIN_TAKEOVER);
    }

    function test_brrrRemovesSellingChairAndPaysNoSalary() public {
        _takeover(alice, 1e18, address(nvda));
        vm.prank(alice);
        chair.transfer(carol, 1);
        _fill();
        _pastGap();
        vm.prank(bob);
        press.brrr();
        assertEq(press.chair(), address(0));
        assertEq(nvda.balanceOf(alice), 0);
        assertEq(press.pick(), address(spy));
    }

    // ---------------- BRRR ----------------

    function test_brrrTooSoonAfterLaunch() public {
        _fill();
        vm.expectRevert(Press.TooSoon.selector);
        press.brrr();
    }

    function test_brrrBelowThreshold() public {
        _pastGap();
        spy.mint(address(press), THRESHOLD - 1);
        vm.expectRevert(Press.NotEnough.selector);
        press.brrr();
    }

    function test_brrrEnforcesGapBetweenPrints() public {
        _fill();
        _pastGap();
        press.brrr();
        _fill();
        vm.warp(block.timestamp + 4 minutes + 59 seconds);
        vm.expectRevert(Press.TooSoon.selector);
        press.brrr();
        vm.warp(block.timestamp + 1);
        press.brrr();
        assertEq(press.printCount(), 2);
    }

    function test_brrrSplitsSalaryTipAndHolders() public {
        _takeover(alice, 1e18, address(nvda));
        uint256 spyIn = spy.balanceOf(address(press)) + THRESHOLD;
        _fill();
        _pastGap();
        vm.prank(bob);
        press.brrr();
        uint256 out = spyIn * 4; // 4 NVDA per SPY
        assertEq(nvda.balanceOf(alice), out * 200 / 10_000); // 2% salary
        assertEq(nvda.balanceOf(bob), out * 10 / 10_000); // 0.1% tip
        assertEq(press.forHolders(address(nvda)), out - out * 210 / 10_000);
        assertEq(spy.balanceOf(address(press)), 0);
    }

    function test_brrrWithEmptySeatBuysSpyNoSwapNoSalary() public {
        _fill();
        _pastGap();
        vm.prank(bob);
        press.brrr();
        assertEq(press.forHolders(address(spy)), THRESHOLD - THRESHOLD * 10 / 10_000);
        assertEq(spy.balanceOf(bob), 100e18 + THRESHOLD * 10 / 10_000);
    }

    function test_brrrRejectsBadSwapPrice() public {
        _takeover(alice, 1e18, address(nvda));
        _fill();
        _pastGap();
        swapper.setOutPerIn(3.9e18); // 2.5% worse than Chainlink says
        vm.expectRevert(Press.NotEnough.selector);
        press.brrr();
        swapper.setOutPerIn(3.97e18); // within 1%
        press.brrr();
    }

    function test_brrrRejectsStaleFeed() public {
        _takeover(alice, 1e18, address(nvda));
        _fill();
        _pastGap();
        nvdaFeed.setStale(block.timestamp - 2 hours);
        vm.expectRevert(Press.StaleFeed.selector);
        press.brrr();
    }

    function test_brrrHandlesDifferentDecimals() public {
        MockToken usd6 = new MockToken("USD6", 6);
        MockFeed f = new MockFeed(1e8);
        address[] memory s = new address[](1);
        address[] memory fs = new address[](1);
        s[0] = address(usd6);
        fs[0] = address(f);
        Press p = new Press(
            address(chair), address(spy), address(spyFeed), address(swapper), address(desk), tally, THRESHOLD,
            MIN_TAKEOVER, s, fs
        );
        swapper.setOutPerIn(500e6); // 1 SPY ($500) -> 500 USD6
        spy.mint(address(p), THRESHOLD);
        _pastGap();
        // empty seat picks SPY, so force a pick via the desk path isn't possible: test the maths directly
        vm.prank(address(desk));
        p.seat(alice, 1e18, 1, address(usd6));
        chair.mint(alice, 1);
        p.brrr();
        assertGt(p.forHolders(address(usd6)), 0);
    }

    // ---------------- The Tally and claims ----------------

    function _leaf(address who, address stock, uint256 cum) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(who, stock, cum))));
    }

    /// Two-leaf tree: root = hash(sorted(a, b)).
    function _root2(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function _print() internal {
        _fill();
        _pastGap();
        press.brrr();
    }

    function test_onlyTallyPostsAndTransfers() public {
        vm.prank(alice);
        vm.expectRevert(Press.NotTally.selector);
        press.postRoot(bytes32(uint256(1)));
        vm.prank(alice);
        vm.expectRevert(Press.NotTally.selector);
        press.transferTallyKey(alice);
        vm.prank(tally);
        press.transferTallyKey(alice);
        vm.prank(alice);
        press.postRoot(bytes32(uint256(1)));
        assertEq(press.pendingRoot(), bytes32(uint256(1)));
    }

    function test_rootWaitsDelayAndOldRootStaysClaimable() public {
        _print(); // 4.995 SPY for holders
        uint256 pool = press.forHolders(address(spy));
        bytes32 a = _leaf(alice, address(spy), pool / 2);
        bytes32 b = _leaf(bob, address(spy), pool / 2);
        bytes32 root1 = _root2(a, b);
        vm.prank(tally);
        press.postRoot(root1);

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = b;
        vm.prank(alice);
        vm.expectRevert(Press.BadProof.selector); // not active yet
        press.claim(address(spy), pool / 2, proof);

        vm.warp(block.timestamp + 5 minutes);
        vm.prank(alice);
        press.claim(address(spy), pool / 2, proof);
        assertEq(spy.balanceOf(alice), 100e18 + pool / 2);

        // A bad second root is posted. Bob can still claim under root1 during the delay.
        vm.prank(tally);
        press.postRoot(bytes32(uint256(0xdead)));
        proof[0] = a;
        vm.prank(bob);
        press.claim(address(spy), pool / 2, proof);
        assertEq(spy.balanceOf(bob), 100e18 + pool / 2);
    }

    function test_cannotClaimTwiceAndRunningTotalsPayTheDifference() public {
        _print();
        uint256 pool = press.forHolders(address(spy));
        bytes32 a = _leaf(alice, address(spy), pool / 4);
        bytes32 b = _leaf(bob, address(spy), pool / 4);
        vm.prank(tally);
        press.postRoot(_root2(a, b));
        vm.warp(block.timestamp + 5 minutes);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = b;
        vm.prank(alice);
        press.claim(address(spy), pool / 4, proof);
        vm.prank(alice);
        vm.expectRevert(Press.NothingToClaim.selector);
        press.claim(address(spy), pool / 4, proof);

        // Next print, new running totals: alice now has pool/2 total, owed the difference.
        _print();
        a = _leaf(alice, address(spy), pool / 2);
        b = _leaf(bob, address(spy), pool / 4);
        vm.prank(tally);
        press.postRoot(_root2(a, b));
        vm.warp(block.timestamp + 5 minutes);
        proof[0] = b;
        vm.prank(alice);
        press.claim(address(spy), pool / 2, proof);
        assertEq(spy.balanceOf(alice), 100e18 + pool / 2);
    }

    function test_tallyCannotPayOutMoreThanBought() public {
        _print();
        uint256 pool = press.forHolders(address(spy));
        bytes32 a = _leaf(alice, address(spy), pool); // alice claims everything
        bytes32 b = _leaf(bob, address(spy), 1); // then bob asks for one wei more
        vm.prank(tally);
        press.postRoot(_root2(a, b));
        vm.warp(block.timestamp + 5 minutes);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = b;
        vm.prank(alice);
        press.claim(address(spy), pool, proof);
        proof[0] = a;
        vm.prank(bob);
        vm.expectRevert(Press.OverCap.selector);
        press.claim(address(spy), 1, proof);
    }

    function test_tallyKeyCannotMoveSpy() public {
        // There is simply no function for it: the only tally functions are postRoot and transferTallyKey.
        _fill();
        vm.prank(tally);
        press.postRoot(bytes32(uint256(1)));
        assertEq(spy.balanceOf(address(press)), THRESHOLD);
        assertEq(spy.balanceOf(tally), 0);
    }

    function test_wrongProofFails() public {
        _print();
        bytes32 a = _leaf(alice, address(spy), 1e18);
        bytes32 b = _leaf(bob, address(spy), 1e18);
        vm.prank(tally);
        press.postRoot(_root2(a, b));
        vm.warp(block.timestamp + 5 minutes);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = b;
        vm.prank(alice);
        vm.expectRevert(Press.BadProof.selector);
        press.claim(address(spy), 2e18, proof); // amount doesn't match leaf
    }
}
