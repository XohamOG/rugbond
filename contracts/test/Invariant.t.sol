// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {RugBond} from "../src/RugBond.sol";
import {FaucetToken} from "../src/mocks/FaucetToken.sol";

contract Handler is Test {
    uint256 internal constant PROMISED = 1_000e18;
    uint256 internal constant HELD = 2_000e18;

    RugBond public immutable rb;
    FaucetToken public immutable wif;
    FaucetToken public immutable coin;
    address[] public actors;
    address internal constant SINK = address(0x51AA);

    uint256 public ghostBurned;
    uint256 public ghostFalseSlashes;
    uint256 public ghostMissedSlashes;
    uint256 public ghostBadSplits;
    uint256 public ghostSlashes;

    constructor(RugBond rb_, FaucetToken wif_, FaucetToken coin_) {
        rb = rb_;
        wif = wif_;
        coin = coin_;
        for (uint256 i; i < 4; ++i) {
            address a = address(uint160(0x1000 + i));
            actors.push(a);
            deal(address(wif), a, 100_000_000e18, true);
            deal(address(coin), a, HELD, true);
            vm.prank(a);
            wif.approve(address(rb), type(uint256).max);
        }
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function post(uint256 actorSeed, uint256 amount, uint256 duration) external {
        address a = _actor(actorSeed);
        if (coin.balanceOf(a) < PROMISED) return;
        amount = bound(amount, rb.MIN_BOND(), rb.MAX_BOND());
        duration = bound(duration, rb.MIN_DURATION(), 30 days);
        RugBond.WalletPromise[] memory ps = new RugBond.WalletPromise[](1);
        ps[0] = RugBond.WalletPromise(a, PROMISED);
        vm.prank(a);
        rb.post(address(coin), ps, uint64(block.timestamp + duration), amount, block.timestamp, new bytes[](1));
    }

    function fund(uint256 actorSeed, uint256 idSeed, uint256 amount) external {
        if (rb.nextId() == 0) return;
        uint256 id = idSeed % rb.nextId();
        amount = bound(amount, 1, 100_000e18);
        vm.prank(_actor(actorSeed));
        try rb.fund(id, amount) {} catch {}
    }

    function withdraw(uint256 actorSeed, uint256 idSeed) external {
        if (rb.nextId() == 0) return;
        vm.prank(_actor(actorSeed));
        try rb.withdraw(idSeed % rb.nextId()) {} catch {}
    }

    function slash(uint256 actorSeed, uint256 idSeed) external {
        if (rb.nextId() == 0) return;
        uint256 id = idSeed % rb.nextId();
        (address creator,, uint64 unlockAt, RugBond.Status status, uint256 total) = rb.bonds(id);
        RugBond.WalletPromise memory p = rb.promisesOf(id)[0];
        bool slashable = status == RugBond.Status.Active && block.timestamp < unlockAt
            && coin.balanceOf(p.wallet) < p.minBalance;
        uint256 stake = rb.contributions(id, creator);

        address caller = _actor(actorSeed);
        uint256 supplyBefore = wif.totalSupply();
        uint256 callerBefore = wif.balanceOf(caller);

        vm.prank(caller);
        try rb.slash(id, 0) {
            if (!slashable) ghostFalseSlashes++;
            uint256 burned = supplyBefore - wif.totalSupply();
            uint256 reward = wif.balanceOf(caller) - callerBefore;
            if (burned + reward != total || reward != (stake * 2000) / 10_000) ghostBadSplits++;
            ghostBurned += burned;
            ghostSlashes++;
        } catch {
            if (slashable) ghostMissedSlashes++;
        }
    }

    function sell(uint256 actorSeed, uint256 amount) external {
        address a = _actor(actorSeed);
        amount = bound(amount, 0, coin.balanceOf(a));
        vm.prank(a);
        coin.transfer(SINK, amount);
    }

    function restore(uint256 actorSeed) external {
        address a = _actor(actorSeed);
        deal(address(coin), a, HELD);
    }

    function warp(uint256 seconds_) external {
        vm.warp(block.timestamp + bound(seconds_, 1, 5 days));
    }
}

contract InvariantTest is Test {
    RugBond internal rb;
    FaucetToken internal wif;
    FaucetToken internal coin;
    Handler internal handler;
    uint256 internal initialSupply;

    function setUp() public {
        wif = new FaucetToken("Mock WIF", "mWIF");
        coin = new FaucetToken("Demo Coin", "DEMO");
        rb = new RugBond(address(wif));
        handler = new Handler(rb, wif, coin);
        initialSupply = wif.totalSupply();
        targetContract(address(handler));
    }

    function invariant_wifHeldEqualsSumOfBondTotals() public view {
        uint256 sum;
        for (uint256 id; id < rb.nextId(); ++id) {
            (,,,, uint256 total) = rb.bonds(id);
            sum += total;
        }
        assertEq(wif.balanceOf(address(rb)), sum);
    }

    function invariant_totalEqualsSumOfContributionsUntilSlashed() public view {
        for (uint256 id; id < rb.nextId(); ++id) {
            (,,, RugBond.Status status, uint256 total) = rb.bonds(id);
            if (status == RugBond.Status.Slashed) {
                assertEq(total, 0);
                continue;
            }
            uint256 sum;
            for (uint256 i; i < handler.actorCount(); ++i) {
                sum += rb.contributions(id, handler.actors(i));
            }
            assertEq(total, sum);
        }
    }

    function invariant_healthyBondNeverSlashed() public view {
        assertEq(handler.ghostFalseSlashes(), 0);
    }

    function invariant_breachedBondAlwaysSlashable() public view {
        assertEq(handler.ghostMissedSlashes(), 0);
    }

    function invariant_burnedPlusRewardEqualsTotal() public view {
        assertEq(handler.ghostBadSplits(), 0);
    }

    function invariant_supplyOnlyFallsByBurns() public view {
        assertEq(wif.totalSupply(), initialSupply - handler.ghostBurned());
    }
}
