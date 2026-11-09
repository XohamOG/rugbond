# Decisions

Where the build differs from the original spec, and why.

| Topic | Spec | Built | Why |
|---|---|---|---|
| Network | Mainnet | **Testnet only**, using a mock WIF with an open faucet | Project decision. No real funds at risk |
| `MIN_BOND` / `MAX_BOND` | 1,000 / 100,000 WIF | 10,000 / 2,000,000 WIF | At about $0.00127 per WIF, the original limits were about $1.27 / $127 |
| `MIN_DURATION` | 1 day | 10 minutes | A full post-to-withdraw cycle fits in one demo |
| Slash reward | 20% of the whole bond | 20% of the poster's stake | Otherwise a creator could self-slash and take 20% of funders' $wif |
| `fund` | Active and unexpired | Also rejects a bond that is already breached | Stops funders being lured into a broken bond |
| Failed balance read | Junk value in the event | Reports a balance of 0 | The event stays truthful |
| Balance check in `post` | Before the pull | After the pull | The bonded coin may be WIF itself |
| Errors | As listed | Adds `DeadlinePassed`, `AlreadyBreached` | Clearer failure reasons for the interface |
| `_readBalance` variable | `balance` | `amount` | `balance` is a reserved word in assembly and did not compile |

## Consequence of testnet-only

The spec's requirements table lists at least one real post, slash and fund on mainnet, and says bonds are posted in the real $wif with slashes calling `WIF.burn`. A testnet deployment does not do that. The fork test does prove that `burn` works against the real $wif. Moving to mainnet later means running the same deploy script with `WIF_ADDRESS` set.

## Networks

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 46630 | 4663 |
| RPC | `https://rpc.testnet.chain.robinhood.com` | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | `https://explorer.testnet.chain.robinhood.com` | `https://robinhoodchain.blockscout.com` |
| Faucet | `https://faucet.testnet.chain.robinhood.com` | None |

## Build note for the watcher

The chain is built on Arbitrum tech, which orders transactions first-come-first-served, so the spec's "small priority fee" is unlikely to help a slash land sooner. Detection speed matters more.
