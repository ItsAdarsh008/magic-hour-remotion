import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { MagicLipSync } from "magic-hour-remotion";

export const scriptEditSchema = z.object({
  line: z.string(),
  voice: z.string(),
});

const mono = "'JetBrains Mono', 'SF Mono', Menlo, monospace";

export const ScriptEdit: React.FC<z.infer<typeof scriptEditSchema>> = ({ line, voice }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ background: "#0b0a10", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Left: the code that produced this video */}
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 260,
          width: 760,
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
        }}
      >
        <div style={{ color: "#8b86a3", fontSize: 26, marginBottom: 28, letterSpacing: 1 }}>
          ScriptEdit.tsx
        </div>
        <pre
          style={{
            margin: 0,
            padding: 40,
            borderRadius: 24,
            background: "#15131d",
            border: "1px solid #2a2638",
            color: "#e8e6f0",
            fontFamily: mono,
            fontSize: 30,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          <span style={{ color: "#b48cff" }}>{"<MagicLipSync"}</span>
          {"\n  "}
          <span style={{ color: "#7fd1ff" }}>video</span>={'"'}host.mp4{'"'}
          {"\n  "}
          <span style={{ color: "#7fd1ff" }}>text</span>=
          <span style={{ color: "#ffd479" }}>{`"${line}"`}</span>
          {"\n"}
          <span style={{ color: "#b48cff" }}>{"/>"}</span>
        </pre>
      </div>

      {/* Right: the result */}
      <div
        style={{
          position: "absolute",
          right: 110,
          top: 140,
          width: 800,
          height: 800,
          borderRadius: 40,
          overflow: "hidden",
          boxShadow: "0 40px 120px rgba(120, 80, 255, 0.25)",
          transform: `scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
        }}
      >
        <MagicLipSync
          video="host.mp4"
          text={line}
          voice={voice}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </AbsoluteFill>
  );
};
