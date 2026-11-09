# RugBond

> Every memecoin dev says "I won't sell." RugBond makes that promise cost $wif.

**Status:** spec only, nothing built yet.
**Target:** world is flat hackathon. Submissions close **12 Nov 2026, 17:30 UTC**.
**Categories to tag:** hooks and defi, tools and infra, social and creators.

---

## 1. Summary

A coin creator locks $wif in an ownerless contract and promises that named wallets will keep at least a set number of coins until a set date. Anyone can ask the contract to check those balances at any time. If a wallet is below its promised amount, the bond is slashed: most of the $wif is burned and the caller keeps the rest. If the promise holds until the date, everyone who funded the bond gets their $wif back.

No admin decides anything. The contract reads `balanceOf` and acts on the answer.

## 2. Problem and users

| User | Pain today | What RugBond gives them |
|---|---|---|
| Trader on Pons or pools.trade | Can't tell an honest team from an exit plan | A public, checkable signal of what the team has at stake |
| Honest coin creator | "I won't sell" sounds the same from everyone | A costly promise that scammers are less willing to make |
| Coin community | Nothing concrete to point to when vouching for a team | Can fund a bond for a creator who agrees to it |
| Watcher (anyone running a bot) | No paid job in catching rugs | 20% of any bond they slash |

**Why now:** launch activity on this chain is very high. Pons reached a record $5.95M in daily fees, and pools.trade out-launched it on its first day. None of the 31 hackathon projects covers creator trust.

## 3. What the badge means, and what it doesn't

This section also goes on the site. Being upfront about it is better than having a judge point it out.

**It means:** these specific wallets agreed to keep at least this many coins until this date, this much $wif is locked behind that, and breaking it burns the $wif.

**It does not mean:**
- The coin is safe or a good buy.
- The creator has no other wallets. **Coins in undeclared wallets aren't covered.** This is the main limit of the design.
- Buyers get compensated. In this version the slashed $wif is burned, not paid out to holders.
- The bond is bigger than what a dump would earn. A creator can decide that selling is worth losing the bond.

**Why wallet balances are the core check:** Pons coins are fixed-supply and reports describe locked liquidity positions on launchpads, so "won't mint more" and "won't pull LP" add little there. Team wallets selling is the risk that's left.

## 4. Hackathon requirements

| Requirement | How RugBond meets it |
|---|---|
| Uses $wif onchain on Robinhood Chain | Bonds are posted in $wif, and slashes call `WIF.burn` |
| Flywheel | See section 5 |
| Stays live until 16 Nov | Immutable contract, watcher with RPC failover, static-friendly site |
| Repo | Public GitHub repo (or private with `wifonrh` invited) |
| Demo video | Script in section 13 |
| Real transactions | At least one real post, one real slash and one real fund on mainnet, linked in the submission |
| Name and logo rules | No Robinhood name or logo anywhere |
| Stock Tokens country rule | Doesn't apply as long as Stock Tokens stay out of scope. The contract can't block them, so the site must not offer them as bond tokens |

**Judge criteria and the answer to each:**
- *A real reason to use $wif:* it's collateral that can be lost, not a fee.
- *A flywheel that holds up:* section 5, including where it might not.
- *Works and is built well:* small immutable contract, an adversarial test suite, and a published threat model (section 8).

**Judges most likely to care:** ogle (security: will read the contract), glabuz (retail safety), community voters (locks supply, burns on failure), Quicknode and GetBlock judges (uses their RPCs for watching in real time).

## 5. $wif mechanics and flywheel

1. A creator wants trust, so they lock $wif. That needs $wif, and it takes supply out of circulation for the bond period.
2. Traders see which coins are bonded and filter by it.
3. More traders using the signal pushes more creators to bond.
4. Bonds expire, so creators have to renew them to keep the badge.
5. Every broken promise burns $wif in public, which is the marketing moment that restarts the loop.
6. Watchers earn $wif for catching breaches, so coverage doesn't depend on the team.

**Where it could fail:** the loop needs traders to care about the badge before creators will pay for it. Before 16 Nov that won't be proven, so the honest claim is "here's the mechanism and here are the first real bonds", not "this has product-market fit".

## 6. Architecture

```
Creator ──sign consent + approve──▶ RugBond.sol ◀──slash()── Watcher bot / anyone
                                       │  reads balanceOf
                                       ▼
                                   Coin ERC-20
Web app ──reads──▶ RPC (Quicknode, GetBlock fallback) + small event cache
```

| Part | Choice |
|---|---|
| Contract | Solidity 0.8.x, Foundry, OpenZeppelin v5 |
| Web | Next.js, wagmi/viem, on Vercel |
| Watcher | Node + viem on Railway or Fly, two instances |
| Data | Read contract state directly, with a small event cache in SQLite or Neon |
| Prices | GeckoTerminal, Mobula or Bitquery. If unavailable, hide USD figures |
| RPC | Quicknode primary, GetBlock fallback, public RPC as last resort |

### Chain facts

Read directly from the public RPC on 9 Nov 2026 unless noted.

| Item | Value |
|---|---|
| Chain ID | 4663 (gas paid in ETH) |
| Public RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` |
| $wif address | `0x5173b8eA6923c2d40267890D45C46a3480954773` |
| Name / symbol / decimals | World is Flat / WIF / 18 |
| Total supply | about 999,996,817 |
| `burn(uint256)`, `burnFrom` selectors | present in bytecode |
| `mint`, `transferOwnership`, `pause`, `upgradeToAndCall` selectors | not found |
| `permit` selector | not found, so bonding needs a separate `approve` |
| Held at `0x…dEaD` | about 116,265 WIF |

**Worth using in the demo:** `burn()` lowers `totalSupply`, while sending to `0x…dEaD` doesn't. RugBond's burn is a true supply reduction you can show on screen.

**Build notes for this chain:**
- It's built on Arbitrum tech, so `block.number` isn't a reliable local block count. Use `block.timestamp` only.
- Use `evm_version = "shanghai"` and the storage-based `ReentrancyGuard`. Avoid transient storage unless you confirm it works on the deployment target.

## 7. Contract specification

One contract, `RugBond.sol`. No owner, no pause, no upgrade path. `WIF` is set in the constructor as immutable.

### Constants

| Name | Value | Reason |
|---|---|---|
| `MIN_BOND` | 1,000 WIF | Stops dust badges. **Set after checking the $wif price** |
| `MAX_BOND` | 100,000 WIF | Limits loss while unaudited. **Set after checking the $wif price** |
| `MIN_DURATION` | 1 day | Lets judges try a full cycle before 16 Nov. The site labels short bonds |
| `MAX_DURATION` | 365 days | Stops funds being locked indefinitely |
| `MAX_WALLETS` | 10 | Bounds gas |
| `SLASH_REWARD_BPS` | 2000 (20%) | Pays watchers. Remainder is burned |
| `BALANCE_GAS` | 100,000 | Gas stipend for reading a token balance |

`MAX_BOND` caps the bond's **total**, including community funding. Because the contract is immutable, raising the cap later means deploying a new version.

### State

```solidity
enum Status { None, Active, Slashed }

struct WalletPromise {
    address wallet;
    uint256 minBalance;
}

struct Bond {
    address creator;
    address token;
    uint64  unlockAt;
    Status  status;
    uint256 total;     // WIF currently held for this bond
}

mapping(uint256 => Bond) public bonds;
mapping(uint256 => WalletPromise[]) private _promises;
mapping(uint256 => mapping(address => uint256)) public contributions;
mapping(address => uint256) public nonces;   // consent nonce per wallet
uint256 public nextId;
```

### Functions

```solidity
function post(
    address token,
    WalletPromise[] calldata promises,
    uint64 unlockAt,
    uint256 amount,
    uint256 deadline,
    bytes[] calldata signatures
) external returns (uint256 id);

function fund(uint256 id, uint256 amount) external;
function slash(uint256 id, uint256 index) external;
function withdraw(uint256 id) external;

function findBreach(uint256 id)
    external view returns (bool breached, uint256 index, uint256 balance);
function promisesOf(uint256 id) external view returns (WalletPromise[] memory);
```

**`post`**
- `token` has code. `amount` is within `MIN_BOND` and `MAX_BOND`. `unlockAt` is within the duration limits. `deadline` hasn't passed.
- 1 to `MAX_WALLETS` promises, with **wallets strictly ascending** so there are no duplicates, and every `minBalance > 0`.
- **Every wallet must consent**, either by being `msg.sender` (empty signature) or through an EIP-712 signature checked with OpenZeppelin `SignatureChecker`, which also supports Safe multisigs through EIP-1271.
- Every wallet's balance must already meet its promise.
- Pulls $wif and records the received amount as `msg.sender`'s contribution.

**Consent type**
```
Consent(address creator,address token,address wallet,uint256 minBalance,uint64 unlockAt,uint256 nonce,uint256 deadline)
```

**`fund`** Bond must be `Active`, before `unlockAt`, and stay within `MAX_BOND`. Anyone can fund. This is the "bond for them" feature. Funders' $wif is slashed along with everyone else's, and the site must say so before they confirm.

**`slash`**
```solidity
function slash(uint256 id, uint256 index) external nonReentrant {
    Bond storage b = bonds[id];
    if (b.status != Status.Active) revert NotActive();
    if (block.timestamp >= b.unlockAt) revert Expired();

    WalletPromise memory p = _promises[id][index];
    (bool ok, uint256 balance) = _readBalance(b.token, p.wallet);
    if (ok && balance >= p.minBalance) revert NotBreached();

    b.status = Status.Slashed;
    uint256 total = b.total;
    b.total = 0;

    uint256 reward = total * SLASH_REWARD_BPS / 10_000;
    uint256 burned = total - reward;

    WIF.burn(burned);
    WIF.safeTransfer(msg.sender, reward);

    emit BondSlashed(id, msg.sender, p.wallet, balance, p.minBalance, burned, reward);
}
```

**`withdraw`** Bond must be `Active` and `block.timestamp >= unlockAt`. Returns only the caller's own contribution, so one funder can't affect another.

**`_readBalance`**
```solidity
function _readBalance(address token, address wallet)
    internal view returns (bool ok, uint256 balance)
{
    // Stops a caller forcing a false "breach" by sending too little gas.
    if (gasleft() < BALANCE_GAS * 64 / 63 + 5_000) revert InsufficientGas();

    assembly {
        mstore(0x00, shl(224, 0x70a08231))   // balanceOf(address)
        mstore(0x04, wallet)
        ok := staticcall(100000, token, 0x00, 0x24, 0x00, 0x20)
        ok := and(ok, gt(returndatasize(), 0x1f))
        balance := mload(0x00)
    }
}
```
Assembly is used to avoid copying unbounded return data. **A failed read counts as a breach**, so a malicious token can't protect its bond by making `balanceOf` revert.

### Events and errors

```solidity
event BondPosted(uint256 indexed id, address indexed creator, address indexed token, uint64 unlockAt, uint256 amount);
event BondFunded(uint256 indexed id, address indexed funder, uint256 amount);
event BondSlashed(uint256 indexed id, address indexed caller, address indexed wallet, uint256 balance, uint256 minBalance, uint256 burned, uint256 reward);
event BondWithdrawn(uint256 indexed id, address indexed funder, uint256 amount);

error NotActive(); error Expired(); error NotExpired(); error NotBreached();
error InsufficientGas(); error BadParams(); error BadSignature();
error BalanceBelowPromise(); error BondCapExceeded(); error NothingToWithdraw();
```

## 8. Threat model

| # | Attack or failure | Result | Handling |
|---|---|---|---|
| 1 | Declare a wallet you don't control, like a burn address that never sells | Fake promise | Every wallet must sign consent |
| 2 | Declare a throwaway wallet holding few coins | Technically valid, meaningless | Site shows **% of supply promised** and whether the deployer is included |
| 3 | Keep most coins in undeclared wallets | Not covered | **Known limit.** Stated on the site. Funding-link check is a stretch goal |
| 4 | Move coins to a new wallet instead of selling | Balance drops | Counts as a breach, by design |
| 5 | Slash yourself to recover 20% | Keeps the reward | Real penalty is 80%, and the docs say so. `SLASH_REWARD_BPS` is a tunable pre-deploy |
| 6 | Dump earnings are larger than the bond | Rational to break the promise | Site shows bond value next to the value of promised coins |
| 7 | Very short bond to buy a badge | Weak signal | Site labels under 7 days as "short" |
| 8 | Token makes `balanceOf` revert | Could block a slash | Failed read counts as breach |
| 9 | Caller sends low gas to fake a failed read | False slash | `gasleft()` guard before the call |
| 10 | Token returns huge data | Gas grief | Assembly reads 32 bytes only |
| 11 | Replay a consent signature | Forged promise | Per-wallet nonce, deadline, EIP-712 domain with chain ID |
| 12 | Duplicate wallet entries | Inflated coverage | Wallets must be strictly ascending |
| 13 | Rebasing or fee-on-balance coin | Accidental slash | Site warns. Contract doesn't try to detect it |
| 14 | Watcher is down when someone sells | Breach goes uncaught | Two instances, open-source bot, manual slash button |
| 15 | Seller restores the balance before anyone slashes | No slash | Slash reads the current balance. The watcher reacts to Transfer events to keep this window small |
| 16 | Bug in the contract | Funds at risk | No admin rescue exists, so low `MAX_BOND`, full tests, public threat model |

The contract is unaudited. The site and README must say this.

## 9. Watcher bot

```
loop:
  load active bonds from BondPosted events
  subscribe to Transfer logs for each bonded token, from a declared wallet
  on Transfer: call findBreach(id)
  if breached: simulate slash, then send with a small priority fee
  every 60s: run findBreach on all active bonds (catches missed logs)
```

- Primary RPC Quicknode, switches to GetBlock on errors or stale block times.
- Separate hot wallet holding only a small amount of ETH. No other funds.
- Logs each detection-to-transaction time. The demo can quote the real number.
- Posts slashes to a Telegram channel and optionally X.
- MIT licensed, runnable by anyone with `pnpm watcher`, which supports the claim that it isn't dependent on you.

## 10. Web app

| Route | Content |
|---|---|
| `/` | Total $wif locked, total burned, live feed, bonded coins sorted by size |
| `/bond/new` | Step form: token, wallets and amounts, consent signing, approve, post |
| `/coin/[token]` | Every bond on a coin, plain-language promise, supply %, time left, deployer included or not |
| `/bond/[id]` | Bond detail, each wallet's balance vs promise, fund button, slash button |
| `/badge/[token].svg` | Embeddable badge |
| `/api/coins/[token]` | JSON for wallets, bots and other projects |
| `/limits` | Section 3, in plain language |

**Badge states:** Bonded (green), Short (amber, under 7 days left), Broken (red, permanent for that bond), Expired (grey), None.

**Multi-wallet consent:** the creator enters wallets and gets a shareable signing link for each one. A single-wallet bond needs no link.

**Deployer check:** compare declared wallets with the deployer or launchpad creator, using Blockscout's contract creator data or Pons launch events. See open question 3.

## 11. Testing

**Unit:** every revert path and each state transition.

**Adversarial mock tokens:**
- `balanceOf` reverts, returns empty, returns under 32 bytes, returns huge data, burns all gas.
- Attempts to reenter during `balanceOf` (should be impossible under `staticcall`).

**Specific attack tests:**
- Low-gas slash attempts across a range of gas values can never slash a healthy bond.
- Missing, wrong-signer, replayed and expired consent are all rejected.
- Duplicate or unsorted wallets are rejected.
- A Safe-style EIP-1271 wallet consents successfully.

**Fuzz and invariant:**
- Contract's $wif balance always equals the sum of `total` across all bonds.
- A bond's `total` always equals the sum of its contributions, until slashed.
- A healthy bond can never be slashed. An unhealthy, unexpired bond can always be slashed.
- `burned + reward == total`.

**Mainnet fork:** run against the real $wif at the address above and confirm that `burn` lowers `totalSupply` by the expected amount.

**Target:** full branch coverage on `RugBond.sol`, with `slither` run and findings written up in `SECURITY.md`.

## 12. Build plan

All times UTC. Aim to submit 2.5 hours early.

| When | Work | Done means |
|---|---|---|
| **9 to 10 Nov** | Repo setup, `RugBond.sol`, unit and adversarial tests | All tests pass, including the fork test |
| **10 Nov** | Deploy, verify source, first real post and slash with a demo coin | Two real transactions linked |
| **10 to 11 Nov** | Watcher running on two instances | Sale to slash confirmed automatically on mainnet |
| **11 Nov** | Web app: home, new bond, coin page, bond page, badge | Full flow works on desktop and phone |
| **11 Nov evening** | Outreach to teams, invite testers on the updates page | At least one bond you didn't post |
| **12 Nov to 12:00** | Record and edit video, write README and `SECURITY.md`, fill in submission | Everything linked |
| **12 Nov by 15:00** | Submit | 2.5-hour buffer |
| **12 to 16 Nov** | Monitor uptime, respond to testers, post updates | Live until the final closes |

**If you fall behind, cut in this order:** USD values, Telegram and X posting, community `fund` UI (keep it in the contract), deployer check, multi-wallet signing links (keep single-wallet flow).

**Never cut:** adversarial tests, real mainnet transactions, the `/limits` page, the watcher.

## 13. Demo video (2 minutes)

| Time | Show | Say |
|---|---|---|
| 0:00 | Title card | "Every memecoin dev says 'I won't sell.' Talk is free." |
| 0:10 | Bonded coin page, clearly labelled as a demo coin | "This creator locked $wif behind that promise and named this wallet." |
| 0:30 | Contract on the explorer, source verified, no owner | "No admin. No pause. The contract only reads a balance." |
| 0:45 | Split screen: wallet sells, watcher logs | "Now they sell." |
| 0:55 | Slash transaction, badge turns red, `totalSupply` falls | "Slashed. Real burn, on mainnet, in about a second." Use the measured time |
| 1:15 | Bond page with a third party's bond if you've got one | "Anyone can run the watcher and earn from catching a breach." |
| 1:30 | `/limits` page | "It doesn't cover hidden wallets, and we say so on the site." |
| 1:45 | Totals and flywheel | "Every promise locks $wif. Every broken promise burns it." |

Don't fake activity. Label anything you ran yourself.

## 14. First bonds

The goal before submission is one bond you didn't post, and a slash that's real.

**Outreach list, from teams and tokens named on the hackathon updates page:**
- predict FWA / Sherwood ($PFWA)
- fly.ai
- Coins in ORBRUSH's Community Choice round: $PRIORS, $ROBINCAT, $NOVAAI
- Other hackathon teams with their own tokens

**Offer:** "Lock a small bond, get a badge on your page and a spot on the launch list."

Post on the hackathon updates page with the "looking for testers" tag.

**Budget:** you'll need a small amount of ETH for gas and enough $wif for your demo bonds. The hackathon doesn't require holding $wif to enter, but rule 5 does require real transactions. Slashed demo bonds are gone (minus your 20% if you call slash), so keep them near `MIN_BOND`.

## 15. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Creators won't lock $wif | Your own demo bonds, plus community-funded bonds so the creator only has to sign |
| Nobody bonds before the deadline | Ship the mechanism with real demo transactions and be open about the numbers |
| Critical bug found after deploy | No patching is possible. Post a notice, deploy v2, use low caps from the start |
| Watcher outage during judging | Second instance, manual slash button |
| RPC provider down | Automatic failover through three providers |
| Source verification blocked on Blockscout | Verify on Sourcify, which another hackathon project used |
| Price data unavailable | Hide USD figures and show $wif and % of supply |

## 16. Open questions

Resolve these on the first day.

1. **$wif price and liquidity**, to set `MIN_BOND` and `MAX_BOND`.
2. **Whether `burn()` works as expected.** The selector exists, and SEMALAM's update reports using it, but confirm with the fork test.
3. **How Pons records a coin's creator**, and how creators receive coins at launch. I couldn't find official docs. Start with Mobula's and Bitquery's integration pages.
4. **Whether Pons or pools.trade LP is really locked in all cases.** Secondary sources only.
5. **The right `SLASH_REWARD_BPS`.** 20% is a starting point. A lower value makes self-slashing less useful, a higher one attracts more watchers.

## 17. Out of scope for the hackathon

- Paying slashed $wif to holders (needs snapshots or a Merkle claim).
- Vesting schedules with declining minimums.
- LP and mint promises for coins launched outside the main launchpads.
- Funding-link analysis to find hidden wallets.
- Flatline Scan as a free safety report that leads into bonding.
- Stock Tokens.

## 18. Repo layout

```
rugbond/
├─ contracts/
│  ├─ src/RugBond.sol
│  ├─ test/{RugBond.t.sol, Adversarial.t.sol, Invariant.t.sol, Fork.t.sol}
│  ├─ script/Deploy.s.sol
│  └─ foundry.toml
├─ watcher/src/index.ts
├─ web/                 # Next.js app
├─ README.md
├─ SECURITY.md          # threat model, unaudited notice, Slither results
└─ project.md
```

**Environment variables**
```
RPC_PRIMARY=          # Quicknode
RPC_FALLBACK=         # GetBlock
RPC_PUBLIC=https://rpc.mainnet.chain.robinhood.com
RUGBOND_ADDRESS=
WIF_ADDRESS=0x5173b8eA6923c2d40267890D45C46a3480954773
WATCHER_PRIVATE_KEY=  # hot wallet, small ETH balance only, never committed
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## 19. Submission copy

**One-liner:** Lock $wif behind "I won't sell." Break the promise and it burns.

**What it does:** RugBond lets memecoin creators back a public promise with $wif. They name their wallets, the coins each will keep, and a date. If a wallet drops below its promise, anyone can slash the bond onchain: 80% is burned and 20% pays the caller. If the promise holds, the $wif is returned.

**Why $wif:** it's collateral that can be lost, not a fee. Every bond takes $wif out of circulation, and every broken promise reduces total supply.

**Flywheel:** traders look for bonded coins, creators lock $wif to get the badge, bonds expire and need renewing, and every slash is public proof that the promise was real.

**30-second pitch:**
> "Every memecoin dev says 'I won't sell.' Talk is free. RugBond makes it cost $wif. This dev locked $wif behind that promise, and this wallet is theirs. Watch: they sell. Moments later a bot slashed the bond, the $wif burned onchain, and the badge went red. Every promise locks $wif. Every broken promise burns it."

**Disclaimer for the site and README:** RugBond is unaudited experimental software. A badge is not a safety rating, investment advice or a guarantee. It isn't affiliated with Robinhood Markets, Inc.
