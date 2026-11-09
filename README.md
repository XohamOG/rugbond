# RugBond

![RugBond logo](docs/logo.png)

**Lock $wif behind "I won't sell." Break the promise and it burns.**

Every memecoin dev says "I won't sell", and saying it costs nothing. RugBond makes that promise expensive to break.

A creator locks $wif in an ownerless contract and promises that named wallets will keep a minimum balance of a coin until a set date. Anyone can check those balances at any time. If a wallet drops below its promise, anyone can slash the bond: the caller earns 20% of the poster's stake and everything else is burned. If the promise holds, everyone who funded the bond gets their $wif back.

No admin decides anything. The contract reads `balanceOf` and acts on the answer.

| | |
|---|---|
| **Status** | Live on testnet with a mock WIF. See [why testnet](DECISIONS.md#consequence-of-testnet-only) |
| **Contract** | [`0x04Afa7…4813`](https://explorer.testnet.chain.robinhood.com/address/0x04Afa7f0511caFB53DC91Ae7e8A8B7c8299E4813), source verified |
| **Real transactions** | [deployments/testnet.md](deployments/testnet.md) |
| **Security** | [SECURITY.md](SECURITY.md): threat model, test evidence, Slither results |
| **Fastest measured slash** | 4 seconds from sale to burn, fully automatic |

## How it works

```
Creator ──consent + approve──▶ RugBond.sol ◀──slash()── Watcher bot / anyone
                                   │  reads balanceOf
                                   ▼
                               Coin ERC-20
Website ──reads──▶ RPC, with no database
```

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
| Slash reward | 20% of the poster's stake. The rest burns |

## Why $wif

$wif is collateral that can be lost, not a fee. Every bond takes $wif out of circulation for its full term, and a broken promise calls `burn`, which lowers `totalSupply` rather than sending tokens to a dead address.

## The flywheel

1. A creator wants trust, so they lock $wif to get a badge.
2. Traders look for bonded coins and check what's at stake.
3. More traders using the signal pushes more creators to bond.
4. Bonds expire, so creators renew to keep the badge.
5. Every broken promise burns $wif in public, and that attention restarts the loop.
6. Watchers earn $wif for catching breaches, so coverage doesn't depend on the team.

The loop needs traders to care about the badge before creators will pay for it. That isn't proven yet. What exists today is the working mechanism and its first real transactions.

## What a bond does not mean

- The coin is safe or a good buy.
- The creator has no other wallets. **Coins in undeclared wallets aren't covered.** This is the main limit of the design.
- Buyers get compensated. Slashed $wif is burned, not paid out to holders.
- The bond is bigger than what a dump would earn.

The site says the same on its `/limits` page.

## Repository

| Path | What it is |
|---|---|
| [`contracts/`](contracts/) | `RugBond.sol`, tests and the deploy script (Foundry) |
| [`watcher/`](watcher/) | Bot that detects breaches and slashes them |
| [`web/`](web/) | Next.js site |
| [`shared/`](shared/) | Chain config and contract ABI |
| [`video/`](video/) | Source of the demo video (Remotion) |

## Run it

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation), Node 24 and [pnpm](https://pnpm.io/installation).

```sh
git clone --recurse-submodules https://github.com/XohamOG/rugbond
cd rugbond
pnpm install
```

### Contract tests

```sh
cd contracts
forge test
```

`Fork.t.sol` runs against the real $wif on a local copy of mainnet and sends no real transactions. Skip it when offline with `forge test --no-match-contract ForkTest`.

### Website

```sh
pnpm web
```

Open http://localhost:3000, connect a browser wallet, and use the test-token buttons to get started.

### Watcher

Anyone can run a watcher and earn the slash reward. Use a throwaway wallet holding a small amount of testnet ETH.

```sh
cp .env.example .env     # set WATCHER_PRIVATE_KEY
pnpm watcher
```

It reacts to transfers out of promised wallets and re-checks every bond each minute in case it missed one. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to post slashes to a channel. `RPC_PRIMARY` and `RPC_FALLBACK` are optional, and any RPC not serving chain 46630 is skipped.

### Deploy your own contracts

```sh
set -a; . ./.env; set +a  # with DEPLOYER_PRIVATE_KEY set to a testnet-only key
cd contracts
forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast
```

With `WIF_ADDRESS` unset, the script also deploys a mock WIF and a demo coin, both with an open faucet.

## Hosting

**Website on Vercel.** Import the repo, set Root Directory to `web`, and keep the framework as Next.js. No environment variables are required.

**Watcher on Railway or Fly.** Run two instances from the repo root with build command `pnpm install` and start command `pnpm watcher`. Set `WATCHER_PRIVATE_KEY`, and optionally `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, as host secrets. Use a separate key for each instance so they don't collide on nonces.

## Disclaimer

RugBond is unaudited experimental software. A badge is not a safety rating, investment advice or a guarantee. It isn't affiliated with Robinhood Markets, Inc.

## License

MIT
