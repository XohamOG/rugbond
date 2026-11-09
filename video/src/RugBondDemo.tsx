import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import {
  Burn,
  Check,
  ColdOpen,
  End,
  Flywheel,
  Limits,
  Lock,
  NoAdmin,
  NowTheySell,
  OnChain,
  Problem,
  ProductBonded,
  ProductForm,
  ProductHome,
  Promised,
  Proof,
  Seconds,
  SplitScreen,
  Title,
} from "./scenes";

// Scene lengths are tied to the hit times in scripts/make-audio.mjs. Change both together.
export const RugBondDemo = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0b09" }}>
      <Series>
        <Series.Sequence name="Cold open" durationInFrames={12 * fps}>
          <ColdOpen />
        </Series.Sequence>
        <Series.Sequence name="The problem" durationInFrames={10 * fps}>
          <Problem />
        </Series.Sequence>
        <Series.Sequence name="Title" durationInFrames={8 * fps}>
          <Title />
        </Series.Sequence>
        <Series.Sequence name="Lock" durationInFrames={5 * fps}>
          <Lock />
        </Series.Sequence>
        <Series.Sequence name="Promise" durationInFrames={5 * fps}>
          <Promised />
        </Series.Sequence>
        <Series.Sequence name="Check" durationInFrames={5 * fps}>
          <Check />
        </Series.Sequence>
        <Series.Sequence name="No admin" durationInFrames={5 * fps}>
          <NoAdmin />
        </Series.Sequence>
        <Series.Sequence name="Product: register" durationInFrames={6 * fps}>
          <ProductHome />
        </Series.Sequence>
        <Series.Sequence name="Product: form" durationInFrames={8 * fps}>
          <ProductForm />
        </Series.Sequence>
        <Series.Sequence name="Product: bonded" durationInFrames={8 * fps}>
          <ProductBonded />
        </Series.Sequence>
        <Series.Sequence name="Now they sell" durationInFrames={4 * fps}>
          <NowTheySell />
        </Series.Sequence>
        <Series.Sequence name="Split screen" durationInFrames={14 * fps}>
          <SplitScreen />
        </Series.Sequence>
        <Series.Sequence name="Burn" durationInFrames={6 * fps}>
          <Burn />
        </Series.Sequence>
        <Series.Sequence name="Four seconds" durationInFrames={4 * fps}>
          <Seconds />
        </Series.Sequence>
        <Series.Sequence name="Proof" durationInFrames={10 * fps}>
          <Proof />
        </Series.Sequence>
        <Series.Sequence name="On chain" durationInFrames={8 * fps}>
          <OnChain />
        </Series.Sequence>
        <Series.Sequence name="Limits" durationInFrames={10 * fps}>
          <Limits />
        </Series.Sequence>
        <Series.Sequence name="Flywheel" durationInFrames={12 * fps}>
          <Flywheel />
        </Series.Sequence>
        <Series.Sequence name="End" durationInFrames={8 * fps}>
          <End />
        </Series.Sequence>
      </Series>
      <Audio name="Soundtrack" src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
};
