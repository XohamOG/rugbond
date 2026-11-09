// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {RugBondBase} from "./Base.t.sol";
import {RugBond} from "../src/RugBond.sol";
import {MockSafe} from "./mocks/MockSafe.sol";

contract RugBondTest is RugBondBase {
    // ---------- constructor and digest ----------

    function test_constructor_rejectsAddressWithoutCode() public {
        vm.expectRevert(RugBond.BadParams.selector);
        new RugBond(address(0x1234));
    }

    function test_constants_matchDecisions() public view {
        assertEq(rb.MIN_BOND(), 10_000e18);
        assertEq(rb.MAX_BOND(), 2_000_000e18);
        assertEq(rb.MIN_DURATION(), 10 minutes);
        assertEq(rb.MAX_DURATION(), 365 days);
        assertEq(rb.MAX_WALLETS(), 10);
        assertEq(rb.SLASH_REWARD_BPS(), 2000);
        assertEq(rb.BALANCE_GAS(), 100_000);
    }

    /// @dev Rebuilds the digest by hand so a bug in consentDigest can't hide behind the tests' use of it.
    function test_consentDigest_matchesManualEip712() public view {
        bytes32 domain = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("RugBond"),
                keccak256("1"),
                block.chainid,
                address(rb)
            )
        );
        bytes32 typeHash = keccak256(
            "Consent(address creator,address token,address wallet,uint256 minBalance,uint64 unlockAt,uint256 nonce,uint256 deadline)"
        );
        bytes32 structHash = keccak256(abi.encode(typeHash, creator, address(coin), walletA, PROMISED, uint64(99), 3, 77));
        bytes32 expected = keccak256(abi.encodePacked(hex"1901", domain, structHash));
        assertEq(rb.consentDigest(creator, address(coin), walletA, PROMISED, 99, 3, 77), expected);
    }

    // ---------- post ----------

    function test_post_selfConsent() public {
        uint64 unlock = _unlock();
        RugBond.WalletPromise[] memory ps = _one(creator, PROMISED);
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);

        vm.expectEmit(true, true, true, true, address(rb));
        emit RugBond.BondPosted(0, creator, address(coin), unlock, MIN);
        uint256 id = _post(creator, address(coin), ps, unlock, MIN, deadline, sigs);

        (address c, address t, uint64 u, RugBond.Status s, uint256 total) = rb.bonds(id);
        assertEq(id, 0);
        assertEq(c, creator);
        assertEq(t, address(coin));
        assertEq(u, unlock);
        assertEq(uint8(s), uint8(RugBond.Status.Active));
        assertEq(total, MIN);
        assertEq(rb.contributions(id, creator), MIN);
        assertEq(rb.nextId(), 1);
        assertEq(wif.balanceOf(address(rb)), MIN);
        assertEq(rb.nonces(creator), 0);

        RugBond.WalletPromise[] memory stored = rb.promisesOf(id);
        assertEq(stored.length, 1);
        assertEq(stored[0].wallet, creator);
        assertEq(stored[0].minBalance, PROMISED);
    }

    function test_post_signedConsent_bumpsNonce() public {
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);
        sigs[0] = _sign(keyA, creator, address(coin), walletA, PROMISED, unlock, 0, deadline);

        _post(creator, address(coin), _one(walletA, PROMISED), unlock, MIN, deadline, sigs);
        assertEq(rb.nonces(walletA), 1);
    }

    function test_post_boundaryAmountsAndDurations() public {
        uint256 start = block.timestamp;
        _post(creator, address(coin), _one(creator, PROMISED), uint64(start + 10 minutes), MIN, start, _sigs(1));
        _post(creator, address(coin), _one(creator, PROMISED), uint64(start + 365 days), MAX, start, _sigs(1));
        assertEq(rb.nextId(), 2);
    }

    function test_post_tenWalletsAscending() public {
        RugBond.WalletPromise[] memory ps = new RugBond.WalletPromise[](10);
        bytes[] memory sigs = _sigs(10);
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        for (uint256 i; i < 10; ++i) {
            uint256 key = i + 1;
            address w = vm.addr(key);
            deal(address(coin), w, HELD);
            ps[i] = RugBond.WalletPromise(w, PROMISED);
        }
        // Simple sort by address, keeping track of each wallet's key.
        uint256[] memory keys = new uint256[](10);
        for (uint256 i; i < 10; ++i) keys[i] = i + 1;
        for (uint256 i; i < 10; ++i) {
            for (uint256 j = i + 1; j < 10; ++j) {
                if (ps[j].wallet < ps[i].wallet) {
                    (ps[i], ps[j]) = (ps[j], ps[i]);
                    (keys[i], keys[j]) = (keys[j], keys[i]);
                }
            }
        }
        for (uint256 i; i < 10; ++i) {
            sigs[i] = _sign(keys[i], creator, address(coin), ps[i].wallet, PROMISED, unlock, 0, deadline);
        }
        uint256 id = _post(creator, address(coin), ps, unlock, MIN, deadline, sigs);
        assertEq(rb.promisesOf(id).length, 10);
    }

    function test_post_revertsTokenWithoutCode() public {
        uint64 unlock = _unlock();
        RugBond.WalletPromise[] memory ps = _one(creator, PROMISED);
        uint256 deadline = _deadline();
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(0xdead), ps, unlock, MIN, deadline, _sigs(1));
    }

    function test_post_revertsNoPromises() public {
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), new RugBond.WalletPromise[](0), _unlock(), MIN, _deadline(), _sigs(0));
    }

    function test_post_revertsTooManyWallets() public {
        RugBond.WalletPromise[] memory ps = new RugBond.WalletPromise[](11);
        for (uint256 i; i < 11; ++i) ps[i] = RugBond.WalletPromise(address(uint160(i + 1)), 1);
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), ps, _unlock(), MIN, _deadline(), _sigs(11));
    }

    function test_post_revertsSignatureCountMismatch() public {
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), _one(creator, PROMISED), _unlock(), MIN, _deadline(), _sigs(2));
    }

    function test_post_revertsDeadlinePassed() public {
        vm.warp(1_000_000);
        vm.expectRevert(RugBond.DeadlinePassed.selector);
        _post(creator, address(coin), _one(creator, PROMISED), _unlock(), MIN, block.timestamp - 1, _sigs(1));
    }

    function test_post_revertsUnlockTooSoon() public {
        uint64 unlock = uint64(block.timestamp + 10 minutes - 1);
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), _one(creator, PROMISED), unlock, MIN, _deadline(), _sigs(1));
    }

    function test_post_revertsUnlockTooLate() public {
        uint64 unlock = uint64(block.timestamp + 365 days + 1);
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), _one(creator, PROMISED), unlock, MIN, _deadline(), _sigs(1));
    }

    function test_post_revertsBelowMinBond() public {
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), _one(creator, PROMISED), _unlock(), MIN - 1, _deadline(), _sigs(1));
    }

    function test_post_revertsAboveMaxBond() public {
        vm.expectRevert(RugBond.BondCapExceeded.selector);
        _post(creator, address(coin), _one(creator, PROMISED), _unlock(), MAX + 1, _deadline(), _sigs(1));
    }

    function test_post_revertsZeroMinBalance() public {
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), _one(creator, 0), _unlock(), MIN, _deadline(), _sigs(1));
    }

    function test_post_revertsZeroWallet() public {
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), _one(address(0), 1), _unlock(), MIN, _deadline(), _sigs(1));
    }

    function test_post_revertsDuplicateWallets() public {
        RugBond.WalletPromise[] memory ps = new RugBond.WalletPromise[](2);
        ps[0] = RugBond.WalletPromise(creator, 1);
        ps[1] = RugBond.WalletPromise(creator, 1);
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), ps, _unlock(), MIN, _deadline(), _sigs(2));
    }

    function test_post_revertsUnsortedWallets() public {
        (address low, address high, uint256 highKey) =
            walletA < walletB ? (walletA, walletB, keyB) : (walletB, walletA, keyA);
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        RugBond.WalletPromise[] memory ps = new RugBond.WalletPromise[](2);
        ps[0] = RugBond.WalletPromise(high, 1);
        ps[1] = RugBond.WalletPromise(low, 1);
        bytes[] memory sigs = _sigs(2);
        // A valid first entry, so the revert can only come from the ordering check on the second.
        sigs[0] = _sign(highKey, creator, address(coin), high, 1, unlock, 0, deadline);
        vm.expectRevert(RugBond.BadParams.selector);
        _post(creator, address(coin), ps, unlock, MIN, deadline, sigs);
    }

    function test_post_revertsMissingConsent() public {
        vm.expectRevert(RugBond.BadSignature.selector);
        _post(creator, address(coin), _one(walletA, PROMISED), _unlock(), MIN, _deadline(), _sigs(1));
    }

    function test_post_revertsWrongSigner() public {
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);
        sigs[0] = _sign(keyB, creator, address(coin), walletA, PROMISED, unlock, 0, deadline);
        vm.expectRevert(RugBond.BadSignature.selector);
        _post(creator, address(coin), _one(walletA, PROMISED), unlock, MIN, deadline, sigs);
    }

    function test_post_revertsReplayedConsent() public {
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);
        sigs[0] = _sign(keyA, creator, address(coin), walletA, PROMISED, unlock, 0, deadline);
        _post(creator, address(coin), _one(walletA, PROMISED), unlock, MIN, deadline, sigs);

        vm.expectRevert(RugBond.BadSignature.selector);
        _post(creator, address(coin), _one(walletA, PROMISED), unlock, MIN, deadline, sigs);
    }

    function test_post_revertsExpiredConsent() public {
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);
        sigs[0] = _sign(keyA, creator, address(coin), walletA, PROMISED, unlock, 0, deadline);
        vm.warp(deadline + 1);
        vm.expectRevert(RugBond.DeadlinePassed.selector);
        _post(creator, address(coin), _one(walletA, PROMISED), unlock, MIN, deadline, sigs);
    }

    function test_post_revertsConsentUsedByAnotherCreator() public {
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);
        sigs[0] = _sign(keyA, creator, address(coin), walletA, PROMISED, unlock, 0, deadline);
        vm.expectRevert(RugBond.BadSignature.selector);
        _post(funder, address(coin), _one(walletA, PROMISED), unlock, MIN, deadline, sigs);
    }

    function test_post_revertsConsentForDifferentTerms() public {
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);
        sigs[0] = _sign(keyA, creator, address(coin), walletA, PROMISED, unlock, 0, deadline);
        vm.expectRevert(RugBond.BadSignature.selector);
        _post(creator, address(coin), _one(walletA, PROMISED - 1), unlock, MIN, deadline, sigs);
    }

    function test_post_revertsConsentFromOtherChain() public {
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);
        sigs[0] = _sign(keyA, creator, address(coin), walletA, PROMISED, unlock, 0, deadline);
        vm.chainId(block.chainid + 1);
        vm.expectRevert(RugBond.BadSignature.selector);
        _post(creator, address(coin), _one(walletA, PROMISED), unlock, MIN, deadline, sigs);
    }

    function test_post_eip1271Wallet() public {
        MockSafe safe = new MockSafe(walletA);
        deal(address(coin), address(safe), HELD);
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);
        sigs[0] = _sign(keyA, creator, address(coin), address(safe), PROMISED, unlock, 0, deadline);
        uint256 id = _post(creator, address(coin), _one(address(safe), PROMISED), unlock, MIN, deadline, sigs);
        assertEq(uint8(_status(id)), uint8(RugBond.Status.Active));
    }

    function test_post_eip1271WrongOwnerRejected() public {
        MockSafe safe = new MockSafe(walletA);
        deal(address(coin), address(safe), HELD);
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        bytes[] memory sigs = _sigs(1);
        sigs[0] = _sign(keyB, creator, address(coin), address(safe), PROMISED, unlock, 0, deadline);
        vm.expectRevert(RugBond.BadSignature.selector);
        _post(creator, address(coin), _one(address(safe), PROMISED), unlock, MIN, deadline, sigs);
    }

    function test_post_revertsBalanceBelowPromise() public {
        vm.expectRevert(RugBond.BalanceBelowPromise.selector);
        _post(creator, address(coin), _one(creator, HELD + 1), _unlock(), MIN, _deadline(), _sigs(1));
    }

    function test_post_wifAsCoin_balanceCheckedAfterPull() public {
        uint256 balance = wif.balanceOf(creator);
        vm.expectRevert(RugBond.BalanceBelowPromise.selector);
        _post(creator, address(wif), _one(creator, balance), _unlock(), MIN, _deadline(), _sigs(1));

        uint256 id = _post(creator, address(wif), _one(creator, balance - MIN), _unlock(), MIN, _deadline(), _sigs(1));
        assertEq(uint8(_status(id)), uint8(RugBond.Status.Active));
    }

    // ---------- fund ----------

    function test_fund_addsContribution() public {
        uint256 id = _postSelf(MIN);
        vm.expectEmit(true, true, false, true, address(rb));
        emit RugBond.BondFunded(id, funder, 5e18);
        vm.prank(funder);
        rb.fund(id, 5e18);
        assertEq(_total(id), MIN + 5e18);
        assertEq(rb.contributions(id, funder), 5e18);
    }

    function test_fund_revertsUnknownBond() public {
        vm.expectRevert(RugBond.NotActive.selector);
        vm.prank(funder);
        rb.fund(42, 1e18);
    }

    function test_fund_revertsAtUnlock() public {
        uint256 id = _postSelf(MIN);
        vm.warp(_unlock());
        vm.expectRevert(RugBond.Expired.selector);
        vm.prank(funder);
        rb.fund(id, 1e18);
    }

    function test_fund_revertsZero() public {
        uint256 id = _postSelf(MIN);
        vm.expectRevert(RugBond.BadParams.selector);
        vm.prank(funder);
        rb.fund(id, 0);
    }

    function test_fund_capIsOnTotal() public {
        uint256 id = _postSelf(MIN);
        vm.prank(funder);
        rb.fund(id, MAX - MIN);
        assertEq(_total(id), MAX);

        vm.expectRevert(RugBond.BondCapExceeded.selector);
        vm.prank(funder);
        rb.fund(id, 1);
    }

    function test_fund_revertsOnBreachedBond() public {
        uint256 id = _postSelf(MIN);
        _breachCreator();
        vm.expectRevert(RugBond.AlreadyBreached.selector);
        vm.prank(funder);
        rb.fund(id, 1e18);
    }

    // ---------- slash ----------

    function test_slash_burnsAndPaysCaller() public {
        uint256 id = _postSelf(MIN);
        _breachCreator();
        uint256 supplyBefore = wif.totalSupply();
        uint256 balance = coin.balanceOf(creator);
        uint256 reward = (MIN * 2000) / 10_000;
        uint256 burned = MIN - reward;

        vm.expectEmit(true, true, true, true, address(rb));
        emit RugBond.BondSlashed(id, watcher, creator, balance, PROMISED, burned, reward);
        vm.prank(watcher);
        rb.slash(id, 0);

        assertEq(uint8(_status(id)), uint8(RugBond.Status.Slashed));
        assertEq(_total(id), 0);
        assertEq(wif.balanceOf(watcher), reward);
        assertEq(wif.balanceOf(address(rb)), 0);
        assertEq(wif.totalSupply(), supplyBefore - burned);
    }

    function test_slash_rewardComesOnlyFromPosterStake() public {
        uint256 id = _postSelf(MIN);
        vm.prank(funder);
        rb.fund(id, 500_000e18);
        _breachCreator();
        uint256 supplyBefore = wif.totalSupply();

        address accomplice = makeAddr("accomplice");
        vm.prank(accomplice);
        rb.slash(id, 0);

        uint256 reward = (MIN * 2000) / 10_000;
        assertEq(wif.balanceOf(accomplice), reward);
        assertEq(wif.totalSupply(), supplyBefore - (MIN + 500_000e18 - reward));
    }

    function test_slash_secondWallet() public {
        (address low, uint256 lowKey, address high, uint256 highKey) =
            walletA < walletB ? (walletA, keyA, walletB, keyB) : (walletB, keyB, walletA, keyA);
        uint64 unlock = _unlock();
        uint256 deadline = _deadline();
        RugBond.WalletPromise[] memory ps = new RugBond.WalletPromise[](2);
        ps[0] = RugBond.WalletPromise(low, PROMISED);
        ps[1] = RugBond.WalletPromise(high, PROMISED);
        bytes[] memory sigs = _sigs(2);
        sigs[0] = _sign(lowKey, creator, address(coin), low, PROMISED, unlock, 0, deadline);
        sigs[1] = _sign(highKey, creator, address(coin), high, PROMISED, unlock, 0, deadline);
        uint256 id = _post(creator, address(coin), ps, unlock, MIN, deadline, sigs);

        _sell(high, HELD);

        vm.expectRevert(RugBond.NotBreached.selector);
        vm.prank(watcher);
        rb.slash(id, 0);

        (bool breached, uint256 index, uint256 balance) = rb.findBreach(id);
        assertTrue(breached);
        assertEq(index, 1);
        assertEq(balance, 0);

        vm.prank(watcher);
        rb.slash(id, 1);
        assertEq(uint8(_status(id)), uint8(RugBond.Status.Slashed));
    }

    function test_slash_revertsWhenHealthy() public {
        uint256 id = _postSelf(MIN);
        vm.expectRevert(RugBond.NotBreached.selector);
        vm.prank(watcher);
        rb.slash(id, 0);
    }

    function test_slash_revertsAtExactPromise() public {
        uint256 id = _postSelf(MIN);
        _sell(creator, HELD - PROMISED);
        vm.expectRevert(RugBond.NotBreached.selector);
        vm.prank(watcher);
        rb.slash(id, 0);
    }

    function test_slash_revertsUnknownBond() public {
        vm.expectRevert(RugBond.NotActive.selector);
        vm.prank(watcher);
        rb.slash(7, 0);
    }

    function test_slash_revertsTwice() public {
        uint256 id = _postSelf(MIN);
        _breachCreator();
        vm.prank(watcher);
        rb.slash(id, 0);
        vm.expectRevert(RugBond.NotActive.selector);
        vm.prank(watcher);
        rb.slash(id, 0);
    }

    function test_slash_revertsAtUnlock() public {
        uint256 id = _postSelf(MIN);
        _breachCreator();
        vm.warp(_unlock());
        vm.expectRevert(RugBond.Expired.selector);
        vm.prank(watcher);
        rb.slash(id, 0);
    }

    function test_slash_succeedsOneSecondBeforeUnlock() public {
        uint64 unlock = _unlock();
        uint256 id = _postSelf(MIN);
        _breachCreator();
        vm.warp(unlock - 1);
        vm.prank(watcher);
        rb.slash(id, 0);
        assertEq(uint8(_status(id)), uint8(RugBond.Status.Slashed));
    }

    function test_slash_revertsBadIndex() public {
        uint256 id = _postSelf(MIN);
        _breachCreator();
        vm.expectRevert(RugBond.BadParams.selector);
        vm.prank(watcher);
        rb.slash(id, 1);
    }

    function test_slash_restoredBalanceIsNotSlashable() public {
        uint256 id = _postSelf(MIN);
        _breachCreator();
        vm.prank(sink);
        coin.transfer(creator, 1);
        vm.expectRevert(RugBond.NotBreached.selector);
        vm.prank(watcher);
        rb.slash(id, 0);
    }

    // ---------- withdraw ----------

    function test_withdraw_returnsOwnContribution() public {
        uint64 unlock = _unlock();
        uint256 id = _postSelf(MIN);
        vm.prank(funder);
        rb.fund(id, 7e18);
        vm.warp(unlock);

        uint256 before = wif.balanceOf(funder);
        vm.expectEmit(true, true, false, true, address(rb));
        emit RugBond.BondWithdrawn(id, funder, 7e18);
        vm.prank(funder);
        rb.withdraw(id);

        assertEq(wif.balanceOf(funder), before + 7e18);
        assertEq(_total(id), MIN);
        assertEq(rb.contributions(id, funder), 0);
        assertEq(rb.contributions(id, creator), MIN);

        vm.prank(creator);
        rb.withdraw(id);
        assertEq(_total(id), 0);
        assertEq(wif.balanceOf(address(rb)), 0);
    }

    function test_withdraw_worksEvenIfBreachedAfterUnlock() public {
        uint64 unlock = _unlock();
        uint256 id = _postSelf(MIN);
        vm.warp(unlock);
        _breachCreator();
        vm.prank(creator);
        rb.withdraw(id);
        assertEq(rb.contributions(id, creator), 0);
    }

    function test_withdraw_revertsBeforeUnlock() public {
        uint256 id = _postSelf(MIN);
        vm.warp(_unlock() - 1);
        vm.expectRevert(RugBond.NotExpired.selector);
        vm.prank(creator);
        rb.withdraw(id);
    }

    function test_withdraw_revertsUnknownBond() public {
        vm.expectRevert(RugBond.NotActive.selector);
        vm.prank(creator);
        rb.withdraw(3);
    }

    function test_withdraw_revertsAfterSlash() public {
        uint64 unlock = _unlock();
        uint256 id = _postSelf(MIN);
        _breachCreator();
        vm.prank(watcher);
        rb.slash(id, 0);
        vm.warp(unlock);
        vm.expectRevert(RugBond.NotActive.selector);
        vm.prank(creator);
        rb.withdraw(id);
    }

    function test_withdraw_revertsWithNothingToWithdraw() public {
        uint64 unlock = _unlock();
        uint256 id = _postSelf(MIN);
        vm.warp(unlock);
        vm.expectRevert(RugBond.NothingToWithdraw.selector);
        vm.prank(funder);
        rb.withdraw(id);
    }

    function test_withdraw_revertsTwice() public {
        uint64 unlock = _unlock();
        uint256 id = _postSelf(MIN);
        vm.warp(unlock);
        vm.prank(creator);
        rb.withdraw(id);
        vm.expectRevert(RugBond.NothingToWithdraw.selector);
        vm.prank(creator);
        rb.withdraw(id);
    }

    // ---------- findBreach ----------

    function test_findBreach_healthy() public {
        uint256 id = _postSelf(MIN);
        (bool breached, uint256 index, uint256 balance) = rb.findBreach(id);
        assertFalse(breached);
        assertEq(index, 0);
        assertEq(balance, 0);
    }

    function test_findBreach_breached() public {
        uint256 id = _postSelf(MIN);
        _breachCreator();
        (bool breached, uint256 index, uint256 balance) = rb.findBreach(id);
        assertTrue(breached);
        assertEq(index, 0);
        assertEq(balance, coin.balanceOf(creator));
    }

    function test_findBreach_falseWhenNotSlashable() public {
        (bool unknown,,) = rb.findBreach(99);
        assertFalse(unknown);

        uint64 unlock = _unlock();
        uint256 id = _postSelf(MIN);
        _breachCreator();
        vm.warp(unlock);
        (bool expired,,) = rb.findBreach(id);
        assertFalse(expired);
    }

    function test_findBreach_falseAfterSlash() public {
        uint256 id = _postSelf(MIN);
        _breachCreator();
        vm.prank(watcher);
        rb.slash(id, 0);
        (bool breached,,) = rb.findBreach(id);
        assertFalse(breached);
    }

    // ---------- fuzz ----------

    function testFuzz_slashSplit(uint256 posted, uint256 funded) public {
        posted = bound(posted, MIN, MAX);
        funded = bound(funded, 0, MAX - posted);
        uint256 id = _postSelf(posted);
        if (funded > 0) {
            vm.prank(funder);
            rb.fund(id, funded);
        }
        _breachCreator();
        uint256 supplyBefore = wif.totalSupply();
        vm.prank(watcher);
        rb.slash(id, 0);

        uint256 reward = wif.balanceOf(watcher);
        uint256 burned = supplyBefore - wif.totalSupply();
        assertEq(reward, (posted * 2000) / 10_000);
        assertEq(burned + reward, posted + funded);
        assertEq(wif.balanceOf(address(rb)), 0);
    }

    function testFuzz_healthyCannotBeSlashed(uint256 sold) public {
        sold = bound(sold, 0, HELD - PROMISED);
        uint256 id = _postSelf(MIN);
        if (sold > 0) _sell(creator, sold);
        vm.expectRevert(RugBond.NotBreached.selector);
        vm.prank(watcher);
        rb.slash(id, 0);
    }
}
