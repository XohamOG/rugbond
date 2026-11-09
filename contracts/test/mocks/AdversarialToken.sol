// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {RugBond} from "../../src/RugBond.sol";

/// @notice A coin whose balanceOf misbehaves on demand.
contract AdversarialToken {
    enum Mode {
        Normal,
        Reverts,
        Empty,
        Short,
        Huge,
        BurnsAllGas,
        Reenters,
        Expensive
    }

    Mode public mode;
    mapping(address => uint256) public balances;
    RugBond public target;
    uint256 public targetId;
    uint256 public gasToBurn;

    function setMode(Mode m) external {
        mode = m;
    }

    function setBalance(address who, uint256 amount) external {
        balances[who] = amount;
    }

    function setTarget(RugBond rb, uint256 id) external {
        target = rb;
        targetId = id;
    }

    function setGasToBurn(uint256 amount) external {
        gasToBurn = amount;
    }

    // Deliberately not `view`, so the Reenters mode can attempt state changes.
    function balanceOf(address who) external returns (uint256) {
        Mode m = mode;
        if (m == Mode.Reverts) revert("no balance for you");
        if (m == Mode.Empty) {
            assembly {
                return(0, 0)
            }
        }
        if (m == Mode.Short) {
            assembly {
                mstore(0, not(0))
                return(0, 31)
            }
        }
        if (m == Mode.BurnsAllGas) {
            while (true) {}
        }

        uint256 held = balances[who];
        if (m == Mode.Huge) {
            assembly {
                mstore(0, held)
                return(0, 60000)
            }
        }
        if (m == Mode.Reenters) {
            // Each attempt runs under the caller's staticcall, so any state change must fail.
            try target.slash{gas: 20_000}(targetId, 0) {} catch {}
            try target.withdraw{gas: 20_000}(targetId) {} catch {}
        }
        if (m == Mode.Expensive) {
            uint256 start = gasleft();
            while (start - gasleft() < gasToBurn) {}
        }
        return held;
    }
}
