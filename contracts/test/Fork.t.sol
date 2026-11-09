// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RugBond} from "../src/RugBond.sol";
import {FaucetToken} from "../src/mocks/FaucetToken.sol";

/// @notice Runs RugBond against the real WIF on a local fork of mainnet. Sends no real transactions.
contract ForkTest is Test {
    IERC20 internal constant WIF = IERC20(0x5173b8eA6923c2d40267890D45C46a3480954773);
    // WIF/WETH pool, used only as a source of WIF inside the fork.
    address internal constant WIF_HOLDER = 0xB0C724e6C234a08add4b7697138F667C97Dee5aA;
    uint256 internal constant BOND = 10_000e18;

    RugBond internal rb;
    FaucetToken internal coin;
    address internal creator = makeAddr("creator");
    address internal watcher = makeAddr("watcher");

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("robinhood_mainnet"));
        rb = new RugBond(address(WIF));
        coin = new FaucetToken("Demo Coin", "DEMO");
        deal(address(coin), creator, 1_000e18, true);

        vm.prank(WIF_HOLDER);
        WIF.transfer(creator, 2 * BOND);
        vm.prank(creator);
        WIF.approve(address(rb), type(uint256).max);
    }

    function _post() internal returns (uint256 id) {
        RugBond.WalletPromise[] memory ps = new RugBond.WalletPromise[](1);
        ps[0] = RugBond.WalletPromise(creator, 1_000e18);
        vm.prank(creator);
        id = rb.post(address(coin), ps, uint64(block.timestamp + 1 days), BOND, block.timestamp, new bytes[](1));
    }

    function test_realWif_slashLowersTotalSupply() public {
        uint256 id = _post();
        vm.prank(creator);
        coin.transfer(address(0xbeef), 1);

        uint256 supplyBefore = WIF.totalSupply();
        vm.prank(watcher);
        rb.slash(id, 0);

        uint256 reward = (BOND * 2000) / 10_000;
        assertEq(WIF.totalSupply(), supplyBefore - (BOND - reward));
        assertEq(WIF.balanceOf(watcher), reward);
        assertEq(WIF.balanceOf(address(rb)), 0);
    }

    function test_realWif_withdrawReturnsBond() public {
        uint256 id = _post();
        uint256 before = WIF.balanceOf(creator);
        vm.warp(block.timestamp + 1 days);
        vm.prank(creator);
        rb.withdraw(id);
        assertEq(WIF.balanceOf(creator), before + BOND);
    }
}
