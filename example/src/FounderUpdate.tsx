import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";
import { MagicTalkingPhoto } from "magic-hour-remotion";

export const founderUpdateSchema = z.object({
  name: z.string(),
  headshot: z.string(),
  script: z.string(),
  voice: z.string(),
});

export const FounderUpdate: React.FC<z.infer<typeof founderUpdateSchema>> = ({ name, headshot, script, voice }) => (
  <AbsoluteFill style={{ background: "#0b0a10", fontFamily: "Inter, system-ui, sans-serif" }}>
    <AbsoluteFill style={{ top: 0, height: 1300 }}>
      <MagicTalkingPhoto image={headshot} text={script} voice={voice} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
    <Sequence from={10}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 1380, color: "white" }}>
        <div style={{ fontSize: 44, color: "#b48cff", fontWeight: 600 }}>Weekly update · {name}</div>
        <div style={{ fontSize: 64, lineHeight: 1.25, marginTop: 30, fontWeight: 700 }}>{script}</div>
      </div>
    </Sequence>
  </AbsoluteFill>
);
