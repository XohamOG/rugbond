import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import capture from "./capture.json";
import { Browser, C, display, Embers, Flash, fmt, mono, Rise, Shake, short, Stage, Stamp, TestnetTag, useIn, useOut, Vignette } from "./ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const center: CSSProperties = { justifyContent: "center", alignItems: "center", textAlign: "center" };
const EASE = Easing.bezier(0.45, 0, 0.2, 1);

// ---------- 1. Cold open ----------

const LINES: [string, number, number, number, number][] = [
  // text, second, left, top, size
  ["I won't sell.", 0.3, 180, 170, 110],
  ["LP is locked, trust me.", 1.2, 900, 260, 76],
  ["Team tokens are safe.", 1.9, 240, 480, 84],
  ["We're here for years.", 2.5, 1030, 560, 80],
  ["I won't sell.", 3.05, 130, 760, 124],
  ["Diamond hands only.", 3.55, 1020, 800, 76],
  ["Never selling.", 4.0, 760, 130, 88],
  ["I won't sell.", 4.4, 560, 360, 150],
  ["Devs are long term.", 4.75, 140, 640, 70],
  ["I WON'T SELL.", 5.05, 950, 400, 112],
  ["Trust the team.", 5.3, 700, 680, 92],
  ["I won't sell.", 5.55, 340, 250, 96],
  ["I WON'T SELL.", 5.75, 200, 880, 132],
  ["I won't sell.", 5.95, 1080, 90, 120],
  ["I WON'T SELL.", 6.1, 620, 520, 190],
  ["I won't sell.", 6.25, 1040, 680, 140],
  ["I WON'T SELL.", 6.4, 300, 400, 170],
];

const Snippet = ({ text, at, left, top, size }: { text: string; at: number; left: number; top: number; size: number }) => {
  const p = useIn(at, 0.22);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        fontSize: size,
        fontWeight: 600,
        whiteSpace: "nowrap",
        opacity: p,
        scale: 1.25 - p * 0.25,
        color: text.includes("sell") || text.includes("SELL") ? C.paper : C.dim,
      }}
    >
      {text}
    </div>
  );
};

export const ColdOpen = () => {
  const wall = useOut(7.6, 0.25);
  const underline = useIn(8.5, 0.5);
  return (
    <Stage>
      <AbsoluteFill style={{ opacity: wall }}>
        {LINES.map(([text, at, left, top, size]) => (
          <Snippet key={`${text}${at}`} text={text} at={at} left={left} top={top} size={size} />
        ))}
      </AbsoluteFill>
      <Shake at={8}>
        <AbsoluteFill style={center}>
          <Rise at={7.98} style={{ fontSize: 230, fontWeight: 700 }}>
            Talk is free.
          </Rise>
          <div style={{ width: 1180 * underline, height: 12, marginTop: 18, backgroundColor: C.red }} />
        </AbsoluteFill>
      </Shake>
      <Vignette />
    </Stage>
  );
};

// ---------- 2. The problem ----------

const Promise_ = ({ label, at, hideAt }: { label: string; at: number; hideAt: number }) => {
  const p = useIn(at, 0.5);
  const reveal = useOut(hideAt, 0.25);
  return (
    <div
      style={{
        width: 720,
        padding: "64px 48px",
        backgroundColor: C.sheet,
        color: C.ink,
        boxShadow: `inset 0 0 0 6px ${C.sheet}, inset 0 0 0 8px #c9bda5`,
        opacity: p,
        translate: `0px ${(1 - p) * 60}px`,
      }}
    >
      <div style={{ position: "relative", height: 70, fontFamily: mono, fontSize: 44, color: "#5f5546" }}>
        <div style={{ position: "absolute", inset: 0, opacity: reveal }}>{label}</div>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - reveal, color: C.redDark, fontSize: 60 }}>???</div>
      </div>
      <div style={{ fontSize: 112, fontWeight: 700, lineHeight: 1.05, marginTop: 18 }}>I won't sell.</div>
    </div>
  );
};

export const Problem = () => (
  <Stage>
    <Shake at={4}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 76 }}>
        <div style={{ display: "flex", gap: 60 }}>
          <Promise_ label="the honest team" at={0.2} hideAt={4} />
          <Promise_ label="the exit plan" at={1.2} hideAt={4} />
        </div>
        <Rise at={5.2} style={{ fontSize: 112, fontWeight: 700 }}>
          You can't tell them apart.
        </Rise>
      </AbsoluteFill>
    </Shake>
    <Vignette />
  </Stage>
);

// ---------- 3. Title ----------

export const Title = () => {
  const paper = useIn(0.1, 0.7);
  return (
    <Stage>
      <Shake at={1} power={30}>
        <AbsoluteFill style={center}>
          <div
            style={{
              width: 1320,
              padding: "100px 60px",
              backgroundColor: C.sheet,
              color: C.ink,
              boxShadow: `inset 0 0 0 8px ${C.sheet}, inset 0 0 0 11px #c9bda5, 0 50px 160px rgba(0,0,0,0.8)`,
              opacity: paper,
              translate: `0px ${(1 - paper) * 90}px`,
            }}
          >
            <Stamp at={1} label="RugBond" color={C.redDark} size={150} rotate={-5} />
            <Rise at={2} style={{ marginTop: 58, fontSize: 78, fontWeight: 600, lineHeight: 1.15 }}>
              Lock $wif behind the promise.
              <br />
              Break it, and it burns.
            </Rise>
          </div>
        </AbsoluteFill>
      </Shake>
      <Flash at={1} />
      <Vignette />
    </Stage>
  );
};

// ---------- 4. How it works ----------

const Step = ({ n, title, line, children }: { n: string; title: string; line: string; children: ReactNode }) => (
  <Stage>
    <div style={{ position: "absolute", left: 120, top: 110, fontFamily: mono, fontSize: 52, color: C.red }}>{n}</div>
    <Rise at={0.05} style={{ position: "absolute", left: 120, top: 190, fontSize: 176, fontWeight: 700, lineHeight: 1 }}>
      {title}
    </Rise>
    <Rise at={0.45} style={{ position: "absolute", left: 120, top: 420, width: 760, fontSize: 80, fontWeight: 600, lineHeight: 1.15 }}>
      {line}
    </Rise>
    <div style={{ position: "absolute", left: 980, top: 120, width: 820, height: 840 }}>{children}</div>
    <Vignette />
  </Stage>
);

const Coin = ({ at, x }: { at: number; x: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const top = interpolate(frame, [at * fps, (at + 0.55) * fps], [-140, 470], { ...clamp, easing: Easing.in(Easing.quad) });
  const opacity = interpolate(frame, [at * fps - 1, at * fps, (at + 0.5) * fps, (at + 0.62) * fps], [0, 1, 1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width: 150,
        height: 150,
        borderRadius: 75,
        border: `6px solid ${C.ink}`,
        backgroundColor: C.amber,
        color: C.ink,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: mono,
        fontSize: 42,
        fontWeight: 500,
        opacity,
      }}
    >
      $wif
    </div>
  );
};

export const Lock = () => (
  <Step n="1 / 3" title="Lock" line="A creator locks $wif in a contract nobody owns.">
    {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((at, i) => (
      <Coin key={at} at={at} x={250 + (i % 3) * 120 - 80} />
    ))}
    <div
      style={{
        position: "absolute",
        left: 90,
        top: 520,
        width: 640,
        height: 280,
        backgroundColor: C.panel,
        border: `3px solid ${C.dim}`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ fontFamily: mono, fontSize: 54 }}>RugBond.sol</div>
      <div style={{ fontFamily: mono, fontSize: 40, color: C.dim }}>owner: none</div>
    </div>
  </Step>
);

export const Promised = () => {
  const p = useIn(0.6, 0.6);
  return (
    <Step n="2 / 3" title="Promise" line="Named wallets sign: we keep these coins until this date.">
      <div
        style={{
          position: "absolute",
          top: 150,
          width: 820,
          padding: "56px 56px 64px",
          backgroundColor: C.sheet,
          color: C.ink,
          boxShadow: `inset 0 0 0 6px ${C.sheet}, inset 0 0 0 8px #c9bda5`,
          opacity: p,
          translate: `0px ${(1 - p) * 60}px`,
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 36, color: "#5f5546" }}>RugBond No. 0006</div>
        <div style={{ fontSize: 112, fontWeight: 700, margin: "10px 0 24px" }}>$DEMO</div>
        <div style={{ fontSize: 58, lineHeight: 1.25, fontWeight: 600 }}>
          <span style={{ fontFamily: mono, fontSize: 50 }}>{short(capture.creator)}</span> holds at least 80,000 until 9 Dec.
        </div>
        <div style={{ marginTop: 36 }}>
          <Stamp at={2.6} label="Signed" color="#1f6b4a" size={68} />
        </div>
      </div>
    </Step>
  );
};

export const Check = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = [0.7, 1.7, 2.7, 3.7];
  const value = interpolate(frame, [0.8 * fps, 1.6 * fps], [0, 100000], clamp);
  return (
    <Step n="3 / 3" title="Check" line="Anyone can ask the contract, at any moment.">
      <div
        style={{
          position: "absolute",
          top: 190,
          width: 820,
          padding: 48,
          backgroundColor: C.panel,
          border: `1px solid ${C.rule}`,
          borderRadius: 10,
          fontFamily: mono,
          fontSize: 46,
          lineHeight: 1.5,
        }}
      >
        <Rise at={rows[0]} style={{ color: C.dim }}>
          balanceOf(wallet)
        </Rise>
        <Rise at={rows[0]} style={{ fontSize: 96, fontWeight: 500 }}>
          {fmt(value)}
        </Rise>
        <Rise at={rows[1]} style={{ color: C.dim, marginTop: 24 }}>
          promised: 80,000
        </Rise>
        <Rise at={rows[2]} style={{ color: C.green, marginTop: 24 }}>
          kept. the bond stands.
        </Rise>
      </div>
    </Step>
  );
};

const CODE: { t: string; hot?: boolean }[] = [
  { t: "function slash(uint256 id, uint256 index) external {" },
  { t: "  WalletPromise memory p = _promises[id][index];" },
  { t: "  (bool ok, uint256 balance) = _readBalance(b.token, p.wallet);", hot: true },
  { t: "  if (ok && balance >= p.minBalance) revert NotBreached();", hot: true },
  { t: "  ..." },
  { t: "  IBurnable(address(WIF)).burn(burned);", hot: true },
  { t: "  WIF.safeTransfer(msg.sender, reward);" },
  { t: "}" },
];

export const NoAdmin = () => (
  <Stage style={{ padding: "90px 120px" }}>
    <div style={{ fontFamily: mono, fontSize: 40, lineHeight: 1.6 }}>
      {CODE.map((l, i) => (
        <Rise key={l.t} at={0.1 + i * 0.12} style={{ whiteSpace: "pre", color: l.hot ? C.paper : C.dim }}>
          {l.t}
        </Rise>
      ))}
    </div>
    <div style={{ marginTop: 80, display: "flex", gap: 90, fontSize: 130, fontWeight: 700 }}>
      <Rise at={1.4}>No owner.</Rise>
      <Rise at={1.9}>No pause.</Rise>
    </div>
    <Rise at={2.4} style={{ fontSize: 130, fontWeight: 700, color: C.red }}>
      It only reads a balance.
    </Rise>
    <Vignette />
  </Stage>
);

// ---------- 5. Product ----------

const SCREEN_W = 2400;

const Pan = ({
  src,
  width,
  fromY,
  toY,
  duration,
  zoomTo = 1,
  origin = "50% 0%",
}: {
  src: string;
  width: number;
  fromY: number;
  toY: number;
  duration: number;
  zoomTo?: number;
  origin?: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Img
      src={staticFile(src)}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        transformOrigin: origin,
        translate: `0px ${interpolate(frame, [0, duration * fps], [fromY, toY], { ...clamp, easing: EASE })}px`,
        scale: interpolate(frame, [0, duration * fps], [1, zoomTo], { ...clamp, easing: EASE }),
      }}
    />
  );
};

const Caption = ({ at, children, until }: { at: number; until?: number; children: ReactNode }) => (
  <Rise at={at} until={until} style={{ position: "absolute", left: 100, bottom: 56, fontSize: 84, fontWeight: 700, lineHeight: 1 }}>
    {children}
  </Rise>
);

const Screen = ({ children, url }: { children: ReactNode; url: string }) => (
  <Browser url={url} style={{ position: "absolute", left: 100, top: 72, width: 1720, height: 800 }}>
    {children}
  </Browser>
);

export const ProductHome = () => (
  <Stage>
    <Screen url="rugbond / the register">
      <Pan src="home-after.png" width={1720} fromY={0} toY={-560} duration={6} />
    </Screen>
    <TestnetTag />
    <Caption at={0.2}>Every promise, on the record.</Caption>
    <Vignette />
  </Stage>
);

export const ProductForm = () => (
  <Stage>
    <Screen url="rugbond / post a bond">
      <Pan src="form.png" width={1720} fromY={-40} toY={-400} duration={8} />
    </Screen>
    <TestnetTag />
    <Caption at={0.2}>Name the coins. Pick the date. Lock it.</Caption>
    <Vignette />
  </Stage>
);

export const ProductBonded = () => {
  const zoom = useIn(1.2, 0.2);
  return (
    <Stage>
      <Shake at={1.2}>
        <Screen url={`rugbond / bond ${capture.bondId}`}>
          <Pan src="bonded.png" width={1720} fromY={-60} toY={-110} duration={8} zoomTo={1.06} />
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", backgroundColor: `rgba(13,11,9,${0.42 * zoom})` }}>
            <Stamp at={1.2} label="Bonded" color={C.green} size={170} style={{ backgroundColor: "rgba(13,11,9,0.72)" }} />
          </AbsoluteFill>
        </Screen>
      </Shake>
      <TestnetTag />
      <Caption at={1.6}>50,000 mWIF is now on the line.</Caption>
      <Vignette />
    </Stage>
  );
};

// ---------- 6. The rug ----------

export const NowTheySell = () => (
  <Stage>
    <Shake at={0} power={26}>
      <AbsoluteFill style={center}>
        <div style={{ fontSize: 300, fontWeight: 700, color: C.red }}>Now they sell.</div>
        <Rise at={1.1} style={{ marginTop: 20, fontFamily: mono, fontSize: 52, color: C.dim }}>
          30,000 DEMO leaves {short(capture.creator)}
        </Rise>
        <Rise at={1.7} style={{ fontFamily: mono, fontSize: 52, color: C.paper }}>
          balance 70,000 · promised 80,000
        </Rise>
      </AbsoluteFill>
    </Shake>
    <Flash at={0} color={C.red} peak={0.55} />
    <Vignette />
  </Stage>
);

const TERMINAL: { at: number; text: string; color?: string; big?: boolean }[] = [
  { at: 0.2, text: "$ pnpm watcher", color: C.dim },
  { at: 0.9, text: `tracking bond #${capture.bondId}` },
  { at: 3.0, text: `Transfer out of ${short(capture.creator)}`, color: C.amber },
  { at: 3.5, text: `tx ${short(capture.saleHash)}`, color: C.dim },
  { at: 4.4, text: `findBreach(${capture.bondId}) -> true`, color: C.red },
  { at: 5.4, text: "simulate slash: ok", color: C.dim },
  { at: 6.2, text: `slash sent in ${capture.detectToSentMs} ms` },
  { at: 7.0, text: `tx ${short(capture.slashHash)}`, color: C.dim },
  { at: 8.0, text: `CONFIRMED ${capture.detectToConfirmedMs} ms`, color: C.green, big: true },
];

const Terminal = () => (
  <div
    style={{
      position: "absolute",
      left: 1140,
      top: 110,
      width: 700,
      height: 860,
      padding: 40,
      backgroundColor: "#090807",
      border: `1px solid ${C.rule}`,
      borderRadius: 14,
      fontFamily: mono,
      fontSize: 38,
      lineHeight: 1.75,
    }}
  >
    {TERMINAL.map((l) => (
      <Rise key={l.text} at={l.at} style={{ color: l.color ?? C.paper, fontSize: l.big ? 50 : 38, fontWeight: l.big ? 500 : 400 }}>
        {l.text}
      </Rise>
    ))}
  </div>
);

export const SplitScreen = () => {
  const swap = useIn(9, 0.02);
  return (
    <Stage>
      <Shake at={9} power={34}>
        <Browser url={`rugbond / bond ${capture.bondId}`} style={{ position: "absolute", left: 80, top: 110, width: 1020, height: 860 }}>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - swap, left: -240 }}>
            <Pan src="bonded.png" width={1500} fromY={-120} toY={-120} duration={1} origin="0% 0%" />
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: swap, left: -240 }}>
            <Pan src="broken.png" width={1500} fromY={-120} toY={-210} duration={5} origin="0% 0%" />
          </div>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <Stamp at={9} label="Broken" color={C.red} size={150} style={{ backgroundColor: "rgba(13,11,9,0.8)" }} />
          </AbsoluteFill>
        </Browser>
        <Terminal />
      </Shake>
      <TestnetTag />
      <Flash at={9} color={C.red} />
      <Vignette />
    </Stage>
  );
};

const before = Number(capture.supplyBefore) / 1e18;
const after = Number(capture.supplyAfter) / 1e18;

export const Burn = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glow = interpolate(frame, [0, 2.6 * fps], [0.05, 0.42], clamp);
  return (
    <Stage>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 110%, rgba(255,59,47,${glow}), transparent 70%)` }} />
      <Embers from={0.2} count={110} />
      <AbsoluteFill style={center}>
        <Rise at={0.1} style={{ fontFamily: mono, fontSize: 52, color: C.dim }}>
          totalSupply()
        </Rise>
        <div style={{ fontSize: 260, fontWeight: 700, fontVariantNumeric: "tabular-nums lining-nums" }}>
          {fmt(interpolate(frame, [0.5 * fps, 2.6 * fps], [before, after], { ...clamp, easing: EASE }))}
        </div>
        <Rise at={2.6} style={{ fontSize: 120, fontWeight: 700, color: C.red }}>
          40,000 mWIF burned
        </Rise>
        <Rise at={3.4} style={{ marginTop: 14, fontSize: 80, fontWeight: 600, color: C.amber }}>
          10,000 paid to the bot that caught it
        </Rise>
      </AbsoluteFill>
      <Vignette />
    </Stage>
  );
};

export const Seconds = () => (
  <Stage>
    <AbsoluteFill style={center}>
      <div style={{ fontSize: 310, fontWeight: 700, lineHeight: 1 }}>{capture.saleToSlashSeconds} seconds.</div>
      <Rise at={0.7} style={{ marginTop: 34, fontSize: 78, fontWeight: 600, color: C.dim }}>
        Sale to burn, with nobody at the keyboard.
      </Rise>
    </AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 60, textAlign: "center", fontFamily: mono, fontSize: 32, color: C.dim }}>
      block timestamps of the real sale and slash, testnet, public RPC
    </div>
    <Vignette />
  </Stage>
);

// ---------- 7. Proof ----------

const PROOF: [string, string][] = [
  ["83", "tests passing"],
  ["100%", "branch coverage"],
  ["7 / 7", "planted bugs caught"],
  ["real $wif", "burn proven on a mainnet fork"],
  ["hostile", "tokens can't block a slash"],
  ["0", "profit from funders' $wif"],
];

export const Proof = () => (
  <Stage style={{ padding: "70px 120px" }}>
    <Rise at={0.1} style={{ fontSize: 124, fontWeight: 700, marginBottom: 26 }}>
      Built to be attacked.
    </Rise>
    {PROOF.map(([big, small], i) => (
      <Rise
        key={small}
        at={0.8 + i * 1.1}
        style={{ display: "flex", alignItems: "baseline", gap: 40, padding: "12px 0", borderTop: `1px solid ${C.rule}` }}
      >
        <div style={{ width: 430, fontSize: 76, fontWeight: 700, color: i === 3 ? C.amber : C.paper }}>{big}</div>
        <div style={{ fontSize: 62, fontWeight: 600, color: C.dim }}>{small}</div>
      </Rise>
    ))}
    <Vignette />
  </Stage>
);

const Crop = ({ src, x, y, w, h, width }: { src: string; x: number; y: number; w: number; h: number; width: number }) => {
  const s = width / w;
  return (
    <div style={{ position: "relative", width, height: h * s, overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", width: SCREEN_W * s, left: -x * s, top: -y * s }} />
    </div>
  );
};

export const OnChain = () => {
  const p = useIn(0.05, 0.5);
  const q = useIn(3.4, 0.5);
  return (
    <Stage>
      <div style={{ position: "absolute", left: 180, top: 110, opacity: (1 - q) * p, translate: `0px ${(1 - p) * 40}px` }}>
        <Browser url="block explorer / the slash, confirmed" style={{ width: 1560 }}>
          <Crop src="explorer-tx.png" x={415} y={560} w={1960} h={700} width={1560} />
        </Browser>
        <div style={{ marginTop: 30, fontSize: 84, fontWeight: 700 }}>Check it yourself.</div>
      </div>
      <div style={{ position: "absolute", left: 180, top: 110, opacity: q, translate: `0px ${(1 - q) * 40}px` }}>
        <Browser url="block explorer / source code" style={{ width: 1560 }}>
          <Crop src="explorer-contract.png" x={415} y={530} w={1960} h={700} width={1560} />
        </Browser>
        <div style={{ marginTop: 30, fontSize: 84, fontWeight: 700 }}>Source verified. Exact match.</div>
      </div>
      <Vignette />
    </Stage>
  );
};

// ---------- 8. Limits ----------

const Struck = ({ at, children }: { at: number; children: ReactNode }) => {
  const line = useIn(at + 0.45, 0.28);
  return (
    <Rise at={at} style={{ position: "relative", display: "inline-block", fontSize: 104, fontWeight: 700, whiteSpace: "nowrap" }}>
      {children}
      <div style={{ position: "absolute", left: -10, top: "55%", width: `calc(${line * 100}% + 20px)`, height: 12, backgroundColor: C.red }} />
    </Rise>
  );
};

export const Limits = () => (
  <Stage style={{ padding: "90px 120px" }}>
    <Rise at={0.1} style={{ fontFamily: mono, fontSize: 54, color: C.dim, marginBottom: 40 }}>
      a bond does not mean
    </Rise>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 30 }}>
      <Struck at={2}>The coin is safe.</Struck>
      <Struck at={4}>The team has no other wallets.</Struck>
      <Struck at={6}>Buyers get paid back.</Struck>
    </div>
    <Rise at={7.3} style={{ marginTop: 70, fontSize: 80, fontWeight: 600 }}>
      We say so on the site.
    </Rise>
    <Rise at={7.9} style={{ marginTop: 10, fontFamily: mono, fontSize: 44, color: C.amber }}>
      unaudited · this demo runs on testnet with mock tokens
    </Rise>
    <Vignette />
  </Stage>
);

// ---------- 9. Flywheel ----------

const R = 320;
const CX = 960;
const CY = 540;

const NODES: { text: string; angle: number; dx: number; dy: number; align: CSSProperties["textAlign"] }[] = [
  { text: "Creators lock $wif", angle: -90, dx: -340, dy: -112, align: "center" },
  { text: "Traders look for the badge", angle: 0, dx: 34, dy: -60, align: "left" },
  { text: "Bonds expire, so they renew", angle: 90, dx: -340, dy: 18, align: "center" },
  { text: "Broken promises burn in public", angle: 180, dx: -494, dy: -60, align: "right" },
];

export const Flywheel = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dash = interpolate(frame, [0.2 * fps, 6 * fps], [2 * Math.PI * R, 0], clamp);
  const spin = (frame / fps) * 80;
  return (
    <Stage>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.rule} strokeWidth={4} />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={C.red}
          strokeWidth={8}
          strokeDasharray={2 * Math.PI * R}
          strokeDashoffset={dash}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
        <circle
          cx={CX + R * Math.cos(((spin - 90) * Math.PI) / 180)}
          cy={CY + R * Math.sin(((spin - 90) * Math.PI) / 180)}
          r={18}
          fill={C.amber}
        />
      </svg>
      {NODES.map((n, i) => {
        const x = CX + R * Math.cos((n.angle * Math.PI) / 180) + n.dx;
        const y = CY + R * Math.sin((n.angle * Math.PI) / 180) + n.dy;
        return (
          <Rise key={n.text} at={0.4 + i * 1.5} style={{ position: "absolute", left: x, top: y, width: n.align === "center" ? 680 : 460, textAlign: n.align, fontSize: 54, fontWeight: 600, lineHeight: 1.12 }}>
            {n.text}
          </Rise>
        );
      })}
      <AbsoluteFill style={center}>
        <Rise at={7} style={{ width: 560, fontSize: 62, fontWeight: 700, lineHeight: 1.15 }}>
          Every promise locks $wif.
        </Rise>
        <Rise at={8.2} style={{ width: 560, marginTop: 18, fontSize: 62, fontWeight: 700, lineHeight: 1.15, color: C.red }}>
          Every broken one burns it.
        </Rise>
      </AbsoluteFill>
      <Vignette />
    </Stage>
  );
};

// ---------- 10. End ----------

export const End = () => (
  <Stage>
    <Shake at={1} power={28}>
      <AbsoluteFill style={{ ...center, gap: 54 }}>
        <Stamp at={1} label="RugBond" color={C.red} size={190} />
        <Rise at={2} style={{ fontSize: 88, fontWeight: 600 }}>
          Talk is free. Now it doesn't have to be.
        </Rise>
        <Rise at={2.8} style={{ fontFamily: mono, fontSize: 60, color: C.paper }}>
          github.com/XohamOG/rugbond
        </Rise>
        <Rise at={3.3} style={{ fontFamily: mono, fontSize: 36, color: C.dim }}>
          testnet demo · mock tokens · unaudited · open source
        </Rise>
      </AbsoluteFill>
    </Shake>
    <Flash at={1} />
    <Vignette />
  </Stage>
);

// ---------- Logo ----------

export const Logo = () => (
  <AbsoluteFill style={{ backgroundColor: C.paper, justifyContent: "center", alignItems: "center", fontFamily: "serif" }}>
    <svg width={1024} height={1024} viewBox="0 0 1024 1024">
      <g transform="rotate(-8 512 512)">
        <circle cx={512} cy={512} r={420} fill="none" stroke={C.redDark} strokeWidth={44} />
        <circle cx={512} cy={512} r={352} fill="none" stroke={C.redDark} strokeWidth={14} />
        <text x={512} y={692} textAnchor="middle" fontSize={520} fontWeight={700} fontFamily={display} fill={C.redDark}>
          R
        </text>
      </g>
    </svg>
  </AbsoluteFill>
);
