# RugBond

Lock $wif behind "I won't sell." Break the promise and it burns.

A coin creator locks $wif in an ownerless contract and promises that named wallets will keep a minimum balance of a coin until a set date. Anyone can ask the contract to check those balances. If a wallet is below its promise, the bond is slashed: the caller earns 20% of the poster's stake and everything else is burned. If the promise holds, everyone who funded the bond gets their $wif back.

No admin decides anything. The contract reads `balanceOf` and acts on the answer.

**Status:** live on testnet with a mock WIF. Addresses and real transaction links are in [deployments/testnet.md](deployments/testnet.md), and differences from the original plan are in [DECISIONS.md](DECISIONS.md).

## Contract

[contracts/src/RugBond.sol](contracts/src/RugBond.sol): one contract with no owner, no pause and no upgrade path. The threat model and test evidence are in [SECURITY.md](SECURITY.md).

| Action | Who | When |
|---|---|---|
| `post` | Anyone, with consent from every named wallet | Wallets already hold what they promise |
| `fund` | Anyone | Bond is healthy and unexpired. Funders' $wif burns in full on a slash |
| `slash` | Anyone | A wallet is below its promise, before the unlock time |
| `withdraw` | Each funder, for their own contribution | At or after the unlock time, if never slashed |

| Limit | Value |
|---|---|
| Bond size | 10,000 to 2,000,000 WIF |
| Duration | 10 minutes to 365 days |
| Wallets per bond | 1 to 10 |

## Running the tests

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation).

```sh
git clone --recurse-submodules https://github.com/XohamOG/rugbond
cd rugbond/contracts
forge test
```

`Fork.t.sol` runs against the real $wif on a local copy of mainnet and sends no real transactions. Skip it when offline with `forge test --no-match-contract ForkTest`.

## Deploying to testnet

```sh
cp .env.example .env   # then set DEPLOYER_PRIVATE_KEY to a testnet-only key
set -a; . ./.env; set +a
cd contracts
forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast
```

With `WIF_ADDRESS` unset, the script also deploys a mock WIF and a demo coin, both with an open faucet.

## Running the watcher

Anyone can run a watcher and earn the slash reward. It needs [pnpm](https://pnpm.io/installation) and a wallet holding a small amount of testnet ETH.

```sh
pnpm install
# In .env: WATCHER_PRIVATE_KEY=<a throwaway key>
pnpm watcher
```

It reacts to transfers out of promised wallets and re-checks every bond each minute in case it missed one. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to post slashes to a channel. `RPC_PRIMARY` and `RPC_FALLBACK` are optional, and any RPC not serving chain 46630 is skipped.

## Running the website

```sh
pnpm install
pnpm web
```

The site reads everything from the chain and keeps no database. Open http://localhost:3000, connect a browser wallet, and use the test-token buttons to get started.

## What a bond does not mean

- The coin is safe or a good buy.
- The creator has no other wallets. **Coins in undeclared wallets aren't covered.**
- Buyers get compensated. Slashed $wif is burned, not paid out to holders.
- The bond is bigger than what a dump would earn.

## Disclaimer

RugBond is unaudited experimental software. A badge is not a safety rating, investment advice or a guarantee. It isn't affiliated with Robinhood Markets, Inc.

## License

MIT
