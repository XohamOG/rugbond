import { loadFont as loadDisplay } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";

export const display = loadDisplay("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const C = {
  ink: "#0d0b09",
  panel: "#191511",
  paper: "#f3ecdd",
  sheet: "#fbf7ee",
  dim: "#a2978a",
  rule: "#3a332b",
  red: "#ff3b2f",
  redDark: "#a3201c",
  green: "#35d695",
  amber: "#f2b134",
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Goes from 0 to 1 starting at `start` seconds. */
export function useIn(start: number, seconds = 0.5): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return interpolate(frame, [start * fps, (start + seconds) * fps], [0, 1], { ...clamp, easing: OUT });
}

/** Goes from 1 to 0 starting at `start` seconds. */
export function useOut(start: number, seconds = 0.3): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return interpolate(frame, [start * fps, (start + seconds) * fps], [1, 0], clamp);
}

export const Stage = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <AbsoluteFill style={{ backgroundColor: C.ink, color: C.paper, fontFamily: display, ...style }}>
    {/* Sits behind the content so it shades only the backdrop, not paper or screenshots. */}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, #1f1a14 0%, #0d0b09 72%)" }} />
    {children}
  </AbsoluteFill>
);

/** Text that rises into place. */
export const Rise = ({
  at,
  children,
  until,
  style,
}: {
  at: number;
  until?: number;
  children: ReactNode;
  style?: CSSProperties;
}) => {
  const p = useIn(at, 0.55);
  const out = useOut(until ?? 9999);
  return (
    <div style={{ opacity: p * out, translate: `0px ${(1 - p) * 46}px`, ...style }}>{children}</div>
  );
};

/** A rubber stamp that slams down at `at` seconds. */
export const Stamp = ({
  at,
  label,
  color,
  size = 96,
  rotate = -7,
  style,
}: {
  at: number;
  label: string;
  color: string;
  size?: number;
  rotate?: number;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = at * fps;
  const scale = interpolate(frame, [start - 5, start], [3.2, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const opacity = interpolate(frame, [start - 5, start - 2], [0, 1], clamp);
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${size * 0.14}px ${size * 0.34}px`,
        border: `${size * 0.11}px double ${color}`,
        borderRadius: size * 0.08,
        color,
        fontFamily: mono,
        fontWeight: 500,
        fontSize: size,
        letterSpacing: "0.1em",
        lineHeight: 1,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        opacity,
        scale,
        rotate: `${rotate}deg`,
        ...style,
      }}
    >
      {label}
    </div>
  );
};

/** Shakes its children for a moment after `at` seconds. */
export const Shake = ({ at, children, power = 22 }: { at: number; children: ReactNode; power?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - at * fps;
  const amount = t >= 0 && t < 14 ? ((14 - t) / 14) * power : 0;
  return (
    <AbsoluteFill
      style={{
        translate: `${(random(`x${frame}`) - 0.5) * amount * 2}px ${(random(`y${frame}`) - 0.5) * amount * 2}px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** White flash on impact. */
export const Flash = ({ at, color = C.paper, peak = 0.75 }: { at: number; color?: string; peak?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [at * fps, at * fps + 9], [peak, 0], clamp) * (frame >= at * fps ? 1 : 0);
  return <AbsoluteFill style={{ backgroundColor: color, opacity, pointerEvents: "none" }} />;
};

export const Vignette = () => null;

/** Persistent honesty label for anything showing product activity. */
export const TestnetTag = ({ text = "Testnet · mock tokens · demo bond posted by the RugBond team" }: { text?: string }) => (
  <div
    style={{
      position: "absolute",
      right: 100,
      top: 14,
      padding: "6px 14px",
      backgroundColor: "rgba(13,11,9,0.86)",
      border: `1px solid ${C.rule}`,
      borderRadius: 4,
      color: C.dim,
      fontFamily: mono,
      fontSize: 24,
    }}
  >
    {text}
  </div>
);

export const Browser = ({
  children,
  url,
  style,
}: {
  children: ReactNode;
  url: string;
  style?: CSSProperties;
}) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      flexDirection: "column",
      backgroundColor: C.panel,
      border: `1px solid ${C.rule}`,
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
      ...style,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: `1px solid ${C.rule}` }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.rule }} />
      ))}
      <div style={{ marginLeft: 18, color: C.dim, fontFamily: mono, fontSize: 22 }}>{url}</div>
    </div>
    <div style={{ position: "relative", flex: 1, overflow: "hidden", backgroundColor: C.paper }}>{children}</div>
  </div>
);

/** Rising sparks, used for the burn. */
export const Embers = ({ count = 90, from = 0 }: { count?: number; from?: number }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const t = frame - from * fps;
  if (t < 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const speed = 3 + random(`s${i}`) * 9;
        const delay = random(`d${i}`) * 60;
        const y = height + 40 - (t - delay) * speed;
        const x = random(`x${i}`) * width + Math.sin((t + i * 7) / 18) * 26;
        const size = 3 + random(`z${i}`) * 9;
        const life = interpolate(y, [-20, height * 0.35, height], [0, 0.9, 0.9], clamp);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: size,
              backgroundColor: i % 3 ? C.red : C.amber,
              opacity: t < delay ? 0 : life,
              boxShadow: `0 0 ${size * 3}px ${C.red}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
