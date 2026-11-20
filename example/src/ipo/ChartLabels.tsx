import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { RACE, raceAt, yearAt } from "./race";

const fmt = (v: number) => `$${v >= 10 ? v.toFixed(1) : v.toFixed(2)}B`;

/**
 * The exact numbers, names and year, drawn crisply by Remotion on top of the
 * (restyled) bars. Same math as ChartBars, so everything lines up frame for frame.
 */
export const ChartLabels: React.FC<{ frameOffset?: number; speed?: number; dark?: boolean }> = ({ frameOffset = 0, speed = 1, dark = false }) => {
  const frame = Math.round(useCurrentFrame() * speed) + frameOffset;
  const { bars } = raceAt(frame);
  const ink = dark ? "#f5f3ee" : "#1d1c22";
  const shadow = dark ? "0 2px 10px rgba(0,0,0,0.6)" : "0 2px 0 rgba(255,255,255,0.7)";
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, system-ui, sans-serif", color: ink }}>
      <div style={{ position: "absolute", left: 60, top: 46, fontSize: 40, fontWeight: 800, letterSpacing: -0.5, textShadow: shadow }}>
        Biggest tech IPOs ever
        <span style={{ fontWeight: 500, opacity: 0.6, fontSize: 30 }}> · amount raised</span>
      </div>
      {bars
        .filter((b) => b.visible)
        .map((b) => (
          <React.Fragment key={b.name}>
            <div
              style={{
                position: "absolute",
                left: 20,
                width: RACE.left - 44,
                top: b.y,
                height: RACE.rowHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                fontSize: 34,
                fontWeight: 700,
                textShadow: shadow,
                opacity: b.grow,
              }}
            >
              {b.name}
            </div>
            <div
              style={{
                position: "absolute",
                left: RACE.left + Math.max(b.width, 6) + 16,
                top: b.y,
                height: RACE.rowHeight,
                display: "flex",
                alignItems: "center",
                fontSize: 32,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                textShadow: shadow,
                opacity: b.grow,
              }}
            >
              {fmt(b.shownValue)}
              <span style={{ fontSize: 22, fontWeight: 600, opacity: 0.55, marginLeft: 10 }}>{b.year}</span>
            </div>
          </React.Fragment>
        ))}
      <div
        style={{
          position: "absolute",
          right: 60,
          bottom: 14,
          fontSize: 110,
          fontWeight: 900,
          opacity: 0.22,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {yearAt(frame)}
      </div>
    </AbsoluteFill>
  );
};
