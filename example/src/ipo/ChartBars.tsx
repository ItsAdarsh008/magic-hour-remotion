import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { RACE, raceAt } from "./race";

/**
 * The shapes only: no text. This is the layer Magic Hour restyles, so it is drawn with
 * thick, simple, high-contrast shapes that survive restyling well.
 */
export const ChartBars: React.FC<{ frameOffset?: number; speed?: number }> = ({ frameOffset = 0, speed = 1 }) => {
  const frame = Math.round(useCurrentFrame() * speed) + frameOffset;
  const { bars } = raceAt(frame);
  return (
    <AbsoluteFill style={{ background: "#f3efe6" }}>
      {/* floor line */}
      <div
        style={{
          position: "absolute",
          left: RACE.left - 14,
          top: RACE.top - 30,
          width: 10,
          height: RACE.rowHeight * RACE.topN + 30,
          borderRadius: 5,
          background: "#2b2a33",
        }}
      />
      {bars
        .filter((b) => b.visible && b.fade > 0)
        .map((b) => (
          <div
            key={b.name}
            style={{
              position: "absolute",
              left: RACE.left,
              top: b.y + (RACE.rowHeight - RACE.barHeight) / 2,
              width: Math.max(b.width, 6),
              height: RACE.barHeight,
              borderRadius: RACE.barHeight / 2.6,
              background: b.color,
              opacity: b.fade,
              boxShadow: "inset 0 -10px 0 rgba(0,0,0,0.18), inset 0 8px 0 rgba(255,255,255,0.25)",
            }}
          />
        ))}
    </AbsoluteFill>
  );
};
