// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @notice Testnet-only token with an open faucet. Stands in for WIF and for demo coins. It has no value.
contract FaucetToken is ERC20Burnable {
    uint256 public constant FAUCET_AMOUNT = 100_000e18;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
