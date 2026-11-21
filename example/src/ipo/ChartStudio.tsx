import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { MagicRestyle } from "magic-hour-remotion";
import { ChartLabels } from "./ChartLabels";
import { restyleProps } from "./restyle";

/** The composition shown in Remotion Studio in the demo: pick a style, the chart restyles. */
export const chartStudioSchema = z.object({
  artStyle: z.enum(["Claymation", "Watercolor", "Yarn", "Paper Cut", "Crayon", "Origami"]),
});

export const ChartStudio: React.FC<z.infer<typeof chartStudioSchema>> = ({ artStyle }) => (
  <AbsoluteFill style={{ background: "#f3efe6" }}>
    {artStyle === "Claymation" ? (
      // The full claymation race is already generated; show the same 2 seconds as the others.
      <MagicRestyle composition="ChartBars" artStyle="Claymation" {...restyleProps("Claymation")} trimBefore={180} style={{ width: "100%", height: "100%" }} />
    ) : (
      <MagicRestyle composition="ChartBars" artStyle={artStyle} {...restyleProps(artStyle)} trim={{ start: 6, end: 8 }} style={{ width: "100%", height: "100%" }} />
    )}
    <ChartLabels frameOffset={180} />
  </AbsoluteFill>
);
