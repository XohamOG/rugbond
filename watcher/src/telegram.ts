export type SlashReport = {
  bondId: bigint;
  wallet: string;
  balance: string;
  minBalance: string;
  coinSymbol: string;
  burned: string;
  reward: string;
  txUrl: string;
};

export function formatSlash(r: SlashReport): string {
  return [
    `Bond #${r.bondId} was slashed`,
    `${r.wallet} held ${r.balance} ${r.coinSymbol}, promised ${r.minBalance}`,
    `Burned ${r.burned} mWIF. Watcher earned ${r.reward} mWIF.`,
    r.txUrl,
    "Testnet with mock tokens.",
  ].join("\n");
}

/** Sends a message if Telegram is configured. Never throws: an alert must not stop the watcher. */
export async function sendTelegram(
  token: string | undefined,
  chatId: string | undefined,
  text: string,
  log: (message: string) => void,
): Promise<boolean> {
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) log(`Telegram responded ${res.status}`);
    return res.ok;
  } catch {
    log("Telegram send failed");
    return false;
  }
}
