import { Composition, Still } from "remotion";
import { RugBondDemo } from "./RugBondDemo";
import { Logo } from "./scenes";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="RugBondDemo" component={RugBondDemo} durationInFrames={4440} fps={30} width={1920} height={1080} />
      <Still id="Logo" component={Logo} width={1024} height={1024} />
    </>
  );
};
