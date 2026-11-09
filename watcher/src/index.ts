import { privateKeyToAccount } from "viem/accounts";
import { getAddress, type Hex } from "viem";
import { RPC_PUBLIC, RUGBOND_ADDRESS } from "@rugbond/shared";
import { Rpc } from "./rpc.ts";
import { Watcher } from "./watcher.ts";

const POLL_MS = 1_500;
const SWEEP_MS = 60_000;
const RPC_CHECK_MS = 30_000;

function log(event: string, fields: Record<string, unknown> = {}): void {
  const safe = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]));
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...safe }));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const key = process.env.WATCHER_PRIVATE_KEY;
  if (!key) throw new Error("WATCHER_PRIVATE_KEY is not set");
  const account = privateKeyToAccount(key as Hex);

  const urls = [process.env.RPC_PRIMARY, process.env.RPC_FALLBACK, process.env.RPC_PUBLIC || RPC_PUBLIC].filter(
    (url): url is string => Boolean(url),
  );
  const rpc = new Rpc([...new Set(urls)], account, (message) => log(message));
  await rpc.refresh();

  const rugBond = getAddress(process.env.RUGBOND_ADDRESS || RUGBOND_ADDRESS);
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const watcher = new Watcher({ rpc, rugBond, telegramToken, telegramChatId, log });
  log("started", { watcher: account.address, rugBond, rpcs: urls.length, telegram: Boolean(telegramToken && telegramChatId) });

  let lastSweep = 0;
  let lastRpcCheck = Date.now();
  for (;;) {
    try {
      await watcher.loadNewBonds();
      await watcher.pollTransfers();
      if (Date.now() - lastSweep >= SWEEP_MS) {
        await watcher.sweep();
        lastSweep = Date.now();
        log("sweep complete", { tracked: watcher.trackedCount });
      }
      if (Date.now() - lastRpcCheck >= RPC_CHECK_MS) {
        await rpc.refresh();
        lastRpcCheck = Date.now();
      }
    } catch (error) {
      log("loop error", { message: String((error as Error).message ?? error).split("\n")[0].slice(0, 200) });
      await rpc.refresh();
    }
    await sleep(POLL_MS);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
