import React from "react";
import { Composition } from "remotion";
import { ScriptEdit, scriptEditSchema } from "./ScriptEdit";
import { FounderUpdate, founderUpdateSchema } from "./FounderUpdate";
import { ChartBars } from "./ipo/ChartBars";
import { IpoDemo, IPO_DEMO_FRAMES } from "./ipo/IpoDemo";
import { RACE } from "./ipo/race";
import { ChartStudio, chartStudioSchema } from "./ipo/ChartStudio";
import { LaunchDemo, LAUNCH_FRAMES } from "./demo2/LaunchDemo";

export const Root: React.FC = () => (
  <>
    {/* v2 launch demo: real Studio footage, generated soundtrack */}
    <Composition id="LaunchDemo" component={LaunchDemo} defaultProps={{ orientation: "landscape" as const }} durationInFrames={LAUNCH_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="LaunchDemoVertical" component={LaunchDemo} defaultProps={{ orientation: "portrait" as const }} durationInFrames={LAUNCH_FRAMES} fps={30} width={1080} height={1920} />
    {/* Launch demo: biggest tech IPOs, restyled by Magic Hour, exact numbers by Remotion. */}
    <Composition
      id="IpoDemo"
      component={IpoDemo}
      defaultProps={{ orientation: "landscape" as const }}
      durationInFrames={IPO_DEMO_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="IpoDemoVertical"
      component={IpoDemo}
      defaultProps={{ orientation: "portrait" as const }}
      durationInFrames={IPO_DEMO_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="ChartStudio"
      component={ChartStudio}
      schema={chartStudioSchema}
      defaultProps={{ artStyle: "Origami" as const }}
      durationInFrames={60}
      fps={30}
      width={1080}
      height={1080}
    />
    {/* Only the bars (no text): this is what <MagicRestyle composition="ChartBars"> renders and restyles. */}
    <Composition
      id="ChartBars"
      component={ChartBars}
      defaultProps={{ frameOffset: 0 }}
      durationInFrames={RACE.durationInFrames}
      fps={RACE.fps}
      width={RACE.size}
      height={RACE.size}
    />
    {/* The demo: edit `line` in the Studio's props panel and the host says it, in their own cloned voice, lips re-synced. */}
    <Composition
      id="ScriptEdit"
      component={ScriptEdit}
      schema={scriptEditSchema}
      defaultProps={{
        line: "We shipped the new editor on Friday.",
      }}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
    />
    {/* A data-driven template: one headshot + a script -> a talking update video. */}
    <Composition
      id="FounderUpdate"
      component={FounderUpdate}
      schema={founderUpdateSchema}
      defaultProps={{
        name: "Adarsh",
        headshot: "founder.png",
        script: "This week we doubled signups and cut render time in half.",
        voiceSample: "host.mp4",
      }}
      durationInFrames={210}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
