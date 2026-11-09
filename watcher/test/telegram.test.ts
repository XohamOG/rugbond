import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { formatSlash, sendTelegram } from "../src/telegram.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const noop = () => {};

test("formatSlash states the facts and labels testnet", () => {
  const text = formatSlash({
    bondId: 3n,
    wallet: "0xabc",
    balance: "110000",
    minBalance: "120000",
    coinSymbol: "DEMO",
    burned: "8000",
    reward: "2000",
    txUrl: "https://example.test/tx/1",
  });
  assert.match(text, /Bond #3 was slashed/);
  assert.match(text, /held 110000 DEMO, promised 120000/);
  assert.match(text, /Burned 8000 mWIF\. Watcher earned 2000 mWIF\./);
  assert.match(text, /Testnet/);
});

test("sendTelegram does nothing when not configured", async () => {
  globalThis.fetch = (() => assert.fail("fetch must not be called")) as typeof fetch;
  assert.equal(await sendTelegram(undefined, "1", "hi", noop), false);
  assert.equal(await sendTelegram("t", undefined, "hi", noop), false);
});

test("sendTelegram posts to the bot API", async () => {
  let url = "";
  let body: { chat_id: string; text: string } = { chat_id: "", text: "" };
  globalThis.fetch = (async (input: string, init: RequestInit) => {
    url = input;
    body = JSON.parse(String(init.body));
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  assert.equal(await sendTelegram("TOKEN", "-100", "hello", noop), true);
  assert.equal(url, "https://api.telegram.org/botTOKEN/sendMessage");
  assert.deepEqual([body.chat_id, body.text], ["-100", "hello"]);
});

test("sendTelegram never throws and logs without the token", async () => {
  const logs: string[] = [];
  globalThis.fetch = (async () => {
    throw new Error("network down for botSECRET");
  }) as typeof fetch;
  assert.equal(await sendTelegram("SECRET", "1", "x", (m) => logs.push(m)), false);
  assert.ok(logs.every((m) => !m.includes("SECRET")));
});
