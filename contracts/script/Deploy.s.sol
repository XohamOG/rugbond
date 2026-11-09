// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {RugBond} from "../src/RugBond.sol";
import {FaucetToken} from "../src/mocks/FaucetToken.sol";

/// @notice Deploys RugBond. Without WIF_ADDRESS it also deploys a mock WIF and a demo coin for testnet.
contract Deploy is Script {
    function run() external {
        address wif = vm.envOr("WIF_ADDRESS", address(0));

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        if (wif == address(0)) {
            wif = address(new FaucetToken("Mock WIF", "mWIF"));
            address demo = address(new FaucetToken("RugBond Demo Coin", "DEMO"));
            console2.log("Demo coin:", demo);
        }
        RugBond rb = new RugBond(wif);
        vm.stopBroadcast();

        console2.log("WIF:", wif);
        console2.log("RugBond:", address(rb));
    }
}
