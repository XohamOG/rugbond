# Security

**RugBond is unaudited.** It has no admin, no pause and no upgrade path, so a bug cannot be patched and funds cannot be rescued. Bonds are capped at 2,000,000 WIF for that reason. A fix means deploying a new version.

## Threat model

| # | Attack or failure | Result | Handling |
|---|---|---|---|
| 1 | Declare a wallet you don't control | Fake promise | Every wallet must be the caller or sign an EIP-712 consent |
| 2 | Declare a throwaway wallet holding few coins | Valid but meaningless | Interface must show % of supply promised and whether the deployer is included |
| 3 | Keep most coins in undeclared wallets | Not covered | **Known limit of the design** |
| 4 | Move coins to a new wallet instead of selling | Balance drops | Counts as a breach, by design |
| 5 | Slash yourself to recover the reward | Poster recovers 20% of their own stake | Real penalty is 80% of the poster's stake |
| 6 | Creator attracts funding, sells, then slashes from another address to collect funders' $wif | Would profit from funders | **Reward is based on the poster's stake only.** Funders' $wif burns in full |
| 7 | Creator sells, waits for a funder to fund the breached bond, then slashes | Funder loses to an already-broken bond | `fund` reverts with `AlreadyBreached` |
| 8 | Dump earnings exceed the bond | Rational to break the promise | Interface must show bond value next to the value of promised coins |
| 9 | Very short bond to buy a badge | Weak signal | Interface labels bonds under 7 days as short |
| 10 | Token makes `balanceOf` revert | Could block a slash | A failed read counts as a breach |
| 11 | Caller sends low gas to fake a failed read | False slash | See "Gas guard" below |
| 12 | Token returns huge data | Gas grief | Assembly reads 32 bytes only |
| 13 | Replay a consent signature | Forged promise | Per-wallet nonce, deadline, EIP-712 domain with chain ID |
| 14 | Duplicate wallet entries | Inflated coverage | Wallets must be strictly ascending |
| 15 | Rebasing or fee-on-balance coin | Accidental slash | Interface must warn. The contract does not detect it |
| 16 | The same coins back several bonds | Each bond looks fully covered | Allowed: each bond is a separate stake, and a sale breaches all of them |
| 17 | Bonded coin is WIF, and the pull drops the wallet below its promise | Bond breached at birth | Balances are checked after the pull |
| 18 | Seller restores the balance before anyone slashes | No slash | `slash` reads the current balance. Keeping this window small is the watcher's job |
| 19 | Watcher is down when someone sells | Breach goes uncaught | Anyone can call `slash` |

## Gas guard

`_readBalance` reverts unless enough gas remains to give `balanceOf` its full 100,000 stipend. Testing showed that this guard is extra protection rather than the only barrier. With it removed, the low-gas sweeps still could not slash a healthy bond, because a read that runs out of gas leaves under about 1,600 gas (1/64 of the forwarded amount), far too little to finish a slash. It stays because it makes that safety explicit instead of relying on gas arithmetic.

## Test evidence

83 tests pass: unit, adversarial tokens, low-gas sweeps, fuzz, invariants (128 runs of depth 64), and a mainnet fork against the real $wif that confirms `burn` lowers `totalSupply` by the expected amount.

Branch and function coverage of `RugBond.sol` are 100% (25/25 and 12/12). Line coverage reads 94.68% because the five uncovered lines are the inline assembly in `_readBalance`, which the coverage tool does not instrument. The adversarial tests execute it.

Each of these deliberate bugs was introduced and made the suite fail:

| Mutation | Caught by |
|---|---|
| Remove the gas guard | `test_insufficientGasGuard_reverts` |
| Reward taken from the whole bond | Reward unit test, split fuzz test, split invariant |
| Failed read not treated as a breach | Adversarial token tests |
| `fund` allowed on a breached bond | `test_fund_revertsOnBreachedBond` |
| Duplicate wallets allowed | `test_post_revertsDuplicateWallets` |
| Nonce never incremented | `test_post_revertsReplayedConsent` |
| `slash` allowed at the exact unlock time | `test_slash_revertsAtUnlock` |

## Slither

Slither 0.11.4 on `RugBond.sol`: 9 results, no code changes needed.

| Detector | Finding | Assessment |
|---|---|---|
| `incorrect-equality` | `received == 0` in `fund` | False positive. A zero amount is rejected on purpose |
| `uninitialized-local` | `previous` in `post` | Intended. It starts at the zero address, which also rejects a zero wallet |
| `timestamp` (5) | Bond timing comparisons | By design. The chain's `block.number` is unreliable, and timestamp drift is small next to the 10-minute minimum |
| `assembly` | `_readBalance` | Intended, to bound return data |
| `naming-convention` | `WIF` immutable | Style only |

## Reporting

Open a GitHub issue. There is no bug bounty.
