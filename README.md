# RugBond

Lock $wif behind "I won't sell." Break the promise and it burns.

A coin creator locks $wif in an ownerless contract and promises that named wallets will keep a minimum balance of a coin until a set date. Anyone can ask the contract to check those balances. If a wallet is below its promise, the bond is slashed: the caller earns 20% of the poster's stake and everything else is burned. If the promise holds, everyone who funded the bond gets their $wif back.

No admin decides anything. The contract reads `balanceOf` and acts on the answer.

**Status:** contract and tests are done. The watcher and web app are not built yet. This deployment targets testnet with a mock WIF; see [DECISIONS.md](DECISIONS.md).

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

## What a bond does not mean

- The coin is safe or a good buy.
- The creator has no other wallets. **Coins in undeclared wallets aren't covered.**
- Buyers get compensated. Slashed $wif is burned, not paid out to holders.
- The bond is bigger than what a dump would earn.

## Disclaimer

RugBond is unaudited experimental software. A badge is not a safety rating, investment advice or a guarantee. It isn't affiliated with Robinhood Markets, Inc.

## License

MIT
