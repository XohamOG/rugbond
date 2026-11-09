# Hackathon submission

Copy for the world is flat hackathon form. Submissions close **12 Nov 2026, 17:30 UTC**, and edits lock at that time.

## Details

| Field | Value |
|---|---|
| Name | RugBond |
| Logo | [docs/logo.png](docs/logo.png) |
| Categories | hooks and defi, tools and infra, social and creators |
| Repo | https://github.com/XohamOG/rugbond |
| Live site | _add after deploying_ |
| Demo video | _add after uploading_ |
| Network | Testnet, chain ID 46630 |

## One-liner

Lock $wif behind "I won't sell." Break the promise and it burns.

## What it does

RugBond lets memecoin creators back a public promise with $wif. They name their wallets, the coins each will keep, and a date. If a wallet drops below its promise, anyone can slash the bond onchain: the caller earns 20% of the poster's stake and the rest is burned. If the promise holds, the $wif is returned. There's no admin: the contract reads a balance and acts on it.

A bot anyone can run watches for breaches. In our test it caught a sale and burned the bond automatically, 4 seconds from sale to burn.

## Why $wif

It's collateral that can be lost, not a fee. Every bond takes $wif out of circulation, and every broken promise calls `burn`, which reduces total supply rather than sending tokens to a dead address.

## Flywheel

Traders look for bonded coins, so creators lock $wif to get the badge. Bonds expire and need renewing. Every slash is public proof that the promise was real, and watchers earn $wif for catching breaches, so coverage doesn't depend on us.

It needs traders to care about the badge before creators will pay for it, and that isn't proven yet.

## Built well

- One small contract with no owner, no pause and no upgrade path. Source verified.
- 83 tests: unit, hostile tokens, low-gas sweeps, fuzz, invariants and a fork of mainnet.
- 100% branch coverage on the contract, and 7 of 7 deliberately planted bugs caught by the suite.
- The fork test confirms `burn` lowers `totalSupply` on the real $wif.
- Published threat model in [SECURITY.md](SECURITY.md). A creator can't profit from funders' $wif by slashing their own bond.

## Be upfront about

- **It runs on testnet with a mock WIF** that anyone can claim for free. The real $wif is exercised only in the fork test. Switching to mainnet means running the same deploy script with `WIF_ADDRESS` set.
- The contract is unaudited.
- A bond doesn't cover coins in undeclared wallets.
- Every bond so far was posted by us to test the system.

## Real transactions

Full list in [deployments/testnet.md](deployments/testnet.md). The three to link:

| What | Link |
|---|---|
| Bond posted (No. 0000) | https://explorer.testnet.chain.robinhood.com/tx/0x8456c7c520a536dcb5d5483b2cf05ee9f3ff2c9dcc891dbc3441329cd44e88b1 |
| Bond funded by a second wallet | https://explorer.testnet.chain.robinhood.com/tx/0xa59daaf846b9bc24c3e0a9a4f4ef21a11e3e459f7bd398b2cb3b04eda98e1f04 |
| Automatic slash by the watcher: 40,000 mWIF burned | https://explorer.testnet.chain.robinhood.com/tx/0xe803f4fcc46339b54d38affbd4aa5139377e8b3ff426e7f0ef6644b8d7d158fe |

## How to try it

1. Open the site and connect a browser wallet.
2. Get testnet ETH from the faucet, then claim mock WIF and DEMO with the buttons on the page.
3. Post a bond with a 10-minute duration.
4. Send some DEMO away so the wallet drops below its promise, and watch the bond get slashed.

## Pitch

Every memecoin dev says "I won't sell." Talk is free. RugBond makes it cost $wif. A creator locks $wif behind that promise and names their wallet. They sell. Seconds later a bot slashes the bond, the $wif burns onchain, and the badge goes red. Every promise locks $wif. Every broken promise burns it.
