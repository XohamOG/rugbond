// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {RugBond} from "../src/RugBond.sol";
import {FaucetToken} from "../src/mocks/FaucetToken.sol";

abstract contract RugBondBase is Test {
    uint256 internal constant MIN = 10_000e18;
    uint256 internal constant MAX = 2_000_000e18;
    uint256 internal constant HELD = 1_000_000e18;
    uint256 internal constant PROMISED = 500_000e18;

    RugBond internal rb;
    FaucetToken internal wif;
    FaucetToken internal coin;

    address internal creator = makeAddr("creator");
    address internal funder = makeAddr("funder");
    address internal watcher = makeAddr("watcher");
    address internal sink = makeAddr("sink");
    address internal walletA;
    uint256 internal keyA;
    address internal walletB;
    uint256 internal keyB;

    function setUp() public virtual {
        (walletA, keyA) = makeAddrAndKey("walletA");
        (walletB, keyB) = makeAddrAndKey("walletB");

        wif = new FaucetToken("Mock WIF", "mWIF");
        coin = new FaucetToken("Demo Coin", "DEMO");
        rb = new RugBond(address(wif));

        deal(address(wif), creator, 10 * MAX, true);
        deal(address(wif), funder, 10 * MAX, true);
        deal(address(coin), creator, HELD, true);
        deal(address(coin), walletA, HELD, true);
        deal(address(coin), walletB, HELD, true);

        vm.prank(creator);
        wif.approve(address(rb), type(uint256).max);
        vm.prank(funder);
        wif.approve(address(rb), type(uint256).max);
    }

    function _unlock() internal view returns (uint64) {
        return uint64(block.timestamp + 7 days);
    }

    function _deadline() internal view returns (uint256) {
        return block.timestamp + 1 hours;
    }

    function _one(address wallet, uint256 minBalance) internal pure returns (RugBond.WalletPromise[] memory ps) {
        ps = new RugBond.WalletPromise[](1);
        ps[0] = RugBond.WalletPromise(wallet, minBalance);
    }

    function _sigs(uint256 n) internal pure returns (bytes[] memory) {
        return new bytes[](n);
    }

    function _sign(
        uint256 key,
        address from,
        address token,
        address wallet,
        uint256 minBalance,
        uint64 unlockAt,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 digest = rb.consentDigest(from, token, wallet, minBalance, unlockAt, nonce, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _post(
        address from,
        address token,
        RugBond.WalletPromise[] memory ps,
        uint64 unlockAt,
        uint256 amount,
        uint256 deadline,
        bytes[] memory sigs
    ) internal returns (uint256) {
        vm.prank(from);
        return rb.post(token, ps, unlockAt, amount, deadline, sigs);
    }

    /// @dev Posts a bond whose only promise is the creator's own wallet.
    function _postSelf(uint256 amount) internal returns (uint256) {
        return _post(creator, address(coin), _one(creator, PROMISED), _unlock(), amount, _deadline(), _sigs(1));
    }

    function _status(uint256 id) internal view returns (RugBond.Status status) {
        (,,, status,) = rb.bonds(id);
    }

    function _total(uint256 id) internal view returns (uint256 total) {
        (,,,, total) = rb.bonds(id);
    }

    function _sell(address wallet, uint256 amount) internal {
        vm.prank(wallet);
        coin.transfer(sink, amount);
    }

    function _breachCreator() internal {
        _sell(creator, HELD - PROMISED + 1);
    }
}
