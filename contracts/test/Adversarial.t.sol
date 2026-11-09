// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {RugBondBase} from "./Base.t.sol";
import {RugBond} from "../src/RugBond.sol";
import {AdversarialToken} from "./mocks/AdversarialToken.sol";

contract AdversarialTest is RugBondBase {
    AdversarialToken internal bad;
    uint256 internal id;

    function setUp() public override {
        super.setUp();
        bad = new AdversarialToken();
        bad.setBalance(creator, HELD);
        id = _post(creator, address(bad), _one(creator, PROMISED), _unlock(), MIN, _deadline(), _sigs(1));
        bad.setTarget(rb, id);
    }

    function _assertFailedReadSlashes() internal {
        (bool breached, uint256 index, uint256 balance) = rb.findBreach(id);
        assertTrue(breached);
        assertEq(index, 0);
        assertEq(balance, 0);

        vm.expectEmit(true, true, true, true, address(rb));
        emit RugBond.BondSlashed(id, watcher, creator, 0, PROMISED, (MIN * 8000) / 10_000, (MIN * 2000) / 10_000);
        vm.prank(watcher);
        rb.slash(id, 0);
        assertEq(uint8(_status(id)), uint8(RugBond.Status.Slashed));
    }

    function test_balanceOfReverts_isBreach() public {
        bad.setMode(AdversarialToken.Mode.Reverts);
        _assertFailedReadSlashes();
    }

    function test_balanceOfEmpty_isBreach() public {
        bad.setMode(AdversarialToken.Mode.Empty);
        _assertFailedReadSlashes();
    }

    function test_balanceOfShort_isBreach() public {
        bad.setMode(AdversarialToken.Mode.Short);
        _assertFailedReadSlashes();
    }

    function test_balanceOfBurnsAllGas_isBreach() public {
        bad.setMode(AdversarialToken.Mode.BurnsAllGas);
        _assertFailedReadSlashes();
    }

    function test_tokenDestroyed_isBreach() public {
        vm.etch(address(bad), "");
        _assertFailedReadSlashes();
    }

    function test_balanceOfHuge_readsFirstWordCheaply() public {
        bad.setMode(AdversarialToken.Mode.Huge);
        (bool breached,,) = rb.findBreach(id);
        assertFalse(breached);

        uint256 start = gasleft();
        vm.expectRevert(RugBond.NotBreached.selector);
        vm.prank(watcher);
        rb.slash(id, 0);
        assertLt(start - gasleft(), 250_000);
    }

    function test_reentryDuringBalanceOf_changesNothing() public {
        bad.setMode(AdversarialToken.Mode.Reenters);
        vm.expectRevert(RugBond.NotBreached.selector);
        vm.prank(watcher);
        rb.slash(id, 0);
        assertEq(uint8(_status(id)), uint8(RugBond.Status.Active));
        assertEq(wif.balanceOf(address(rb)), MIN);
    }

    function test_post_failedReadRejected() public {
        bad.setMode(AdversarialToken.Mode.Reverts);
        vm.expectRevert(RugBond.BalanceBelowPromise.selector);
        _post(creator, address(bad), _one(creator, PROMISED), _unlock(), MIN, _deadline(), _sigs(1));
    }

    function test_fund_failedReadRejected() public {
        bad.setMode(AdversarialToken.Mode.Reverts);
        vm.expectRevert(RugBond.AlreadyBreached.selector);
        vm.prank(funder);
        rb.fund(id, 1e18);
    }

    function test_expensiveHonestToken_notBreachedWithFullGas() public {
        bad.setMode(AdversarialToken.Mode.Expensive);
        bad.setGasToBurn(90_000);
        vm.expectRevert(RugBond.NotBreached.selector);
        vm.prank(watcher);
        rb.slash(id, 0);
    }

    function _attemptAtGas(uint256 gasLimit) internal {
        uint256 wifBefore = wif.balanceOf(address(rb));
        vm.prank(watcher);
        try rb.slash{gas: gasLimit}(id, 0) {
            revert("a healthy bond was slashed");
        } catch {}
        assertEq(uint8(_status(id)), uint8(RugBond.Status.Active));
        assertEq(wif.balanceOf(address(rb)), wifBefore);
    }

    function test_lowGasSweep_cannotSlashHealthyBond() public {
        for (uint256 g = 21_000; g <= 400_000; g += 1_500) {
            _attemptAtGas(g);
        }
    }

    function test_lowGasSweep_expensiveToken() public {
        bad.setMode(AdversarialToken.Mode.Expensive);
        bad.setGasToBurn(90_000);
        for (uint256 g = 21_000; g <= 400_000; g += 1_500) {
            _attemptAtGas(g);
        }
    }

    function testFuzz_lowGas_cannotSlashHealthyBond(uint256 gasLimit, uint256 burn) public {
        gasLimit = bound(gasLimit, 1, 2_000_000);
        burn = bound(burn, 0, 90_000);
        bad.setMode(AdversarialToken.Mode.Expensive);
        bad.setGasToBurn(burn);
        _attemptAtGas(gasLimit);
    }

    function test_insufficientGasGuard_reverts() public {
        // Enough to reach the guard but far too little to pass it.
        vm.prank(watcher);
        (bool ok, bytes memory data) =
            address(rb).call{gas: 90_000}(abi.encodeCall(RugBond.slash, (id, 0)));
        assertFalse(ok);
        assertEq(bytes4(data), RugBond.InsufficientGas.selector);
    }
}
