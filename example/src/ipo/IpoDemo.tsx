import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MagicBadge, MagicRestyle } from "magic-hour-remotion";
import { ChartBars } from "./ChartBars";
import { ChartLabels } from "./ChartLabels";
import { RACE } from "./race";
import { SOURCES } from "../data/tech-ipos";

export type Orientation = "landscape" | "portrait";

const INK = "#f5f3ee";
const BG = "#0e0d12";
const ACCENT = "#b48cff";
const MONO = "'DejaVu Sans Mono', 'JetBrains Mono', Menlo, monospace";
const SANS = "Inter, system-ui, sans-serif";

/** Where the square chart sits, and how big, in each orientation. */
const chartBox = (o: Orientation) =>
  o === "landscape"
    ? { left: 840, top: 54, size: 972 }
    : { left: 40, top: 180, size: 1000 };

const Fade: React.FC<{ children: React.ReactNode; dur: number; style?: React.CSSProperties }> = ({ children, dur, style }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o, ...style }}>{children}</AbsoluteFill>;
};

/** A square chart slot: children are drawn on the 1080x1080 race canvas and scaled to fit. */
const ChartSlot: React.FC<{ o: Orientation; children: React.ReactNode }> = ({ o, children }) => {
  const box = chartBox(o);
  const s = box.size / RACE.size;
  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.size,
        height: box.size,
        borderRadius: 36,
        overflow: "hidden",
        boxShadow: "0 40px 120px rgba(180,140,255,0.18)",
      }}
    >
      <div style={{ width: RACE.size, height: RACE.size, transform: `scale(${s})`, transformOrigin: "0 0", position: "relative" }}>
        {children}
      </div>
    </div>
  );
};

const Caption: React.FC<{ o: Orientation; kicker: string; title: React.ReactNode; code?: string }> = ({ o, kicker, title, code }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const pos: React.CSSProperties =
    o === "landscape"
      ? { left: 90, top: 300, width: 690 }
      : { left: 70, top: 1300, width: 940 };
  return (
    <div style={{ position: "absolute", ...pos, fontFamily: SANS, color: INK, opacity: enter, transform: `translateY(${(1 - enter) * 24}px)` }}>
      <div style={{ fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: ACCENT, fontWeight: 700 }}>{kicker}</div>
      <div style={{ fontSize: o === "landscape" ? 76 : 84, fontWeight: 800, lineHeight: 1.05, marginTop: 18, letterSpacing: -1.5 }}>{title}</div>
      {code ? (
        <div style={{ marginTop: 34, fontFamily: MONO, fontSize: 34, background: "#1a1822", border: "1px solid #2e2a3d", borderRadius: 18, padding: "20px 26px", display: "inline-block" }}>
          {code}
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene 2: the plugin at work (code + Studio badge + terminal)
// ---------------------------------------------------------------------------

const CODE = `import { MagicRestyle } from "magic-hour-remotion";

<MagicRestyle
  composition="ChartBars"
  artStyle="Claymation"
/>
<ChartLabels />`;

const highlight = (line: string) => {
  // tiny syntax colouring for the on-screen snippet
  const parts: React.ReactNode[] = [];
  const re = /("[^"]*"|import|from|<\/?[A-Za-z]+|\/>|[a-zA-Z]+(?==))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    const t = m[0];
    const color = t.startsWith('"') ? "#ffd479" : t === "import" || t === "from" ? "#ff7ab6" : t.startsWith("<") || t === "/>" ? ACCENT : "#7fd1ff";
    parts.push(<span key={m.index} style={{ color }}>{t}</span>);
    last = m.index + t.length;
  }
  parts.push(line.slice(last));
  return parts;
};

const CodeScene: React.FC<{ o: Orientation; dur: number }> = ({ o, dur }) => {
  const frame = useCurrentFrame();
  const chars = Math.floor(interpolate(frame, [6, 70], [0, CODE.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const shown = CODE.slice(0, chars);
  const lines = shown.split("\n");
  const termStart = 86;
  const termLines = [
    { at: termStart, text: "$ npx magichour-remotion prefetch", color: INK },
    { at: termStart + 16, text: "Found 1 Magic Hour asset in your compositions.", color: "#9a96a8" },
    { at: termStart + 30, text: "✦ restyle (Claymation) → Magic Hour API", color: ACCENT },
    { at: termStart + 66, text: "  ✓ restyle (Claymation) → public/magichour/out/restyle-…mp4", color: "#7ee2a8" },
  ];
  const generating = frame < termStart + 66;
  const editor: React.CSSProperties =
    o === "landscape" ? { left: 70, top: 120, width: 720 } : { left: 40, top: 1230, width: 1000 };
  return (
    <Fade dur={dur}>
      <ChartSlot o={o}>
        {/* frozen just before 2026, so the big reveal stays for scene 3 */}
        <ChartBars speed={0} frameOffset={150} />
        <ChartLabels speed={0} frameOffset={150} />
        {/* The plugin's real placeholder badge, as it appears in Remotion Studio */}
        <div style={{ position: "absolute", inset: 0, transform: "translate(20px, 860px) scale(1.5)", transformOrigin: "0 0" }}>
          <MagicBadge kind="restyle" state={{ hash: "", status: generating ? "running" : "done" }} />
        </div>
      </ChartSlot>
      <div style={{ position: "absolute", ...editor, fontFamily: MONO }}>
        <div style={{ fontFamily: SANS, color: "#8b86a3", fontSize: 26, marginBottom: 16 }}>IpoChart.tsx</div>
        <pre style={{ margin: 0, padding: 34, borderRadius: 24, background: "#17151f", border: "1px solid #2a2638", color: INK, fontSize: o === "landscape" ? 30 : 34, lineHeight: 1.55, minHeight: o === "landscape" ? 400 : 380, whiteSpace: "pre-wrap" }}>
          {lines.map((l, i) => (
            <div key={i}>
              {l === "" ? "\u00a0" : highlight(l)}
              {i === lines.length - 1 && chars < CODE.length ? <span style={{ background: ACCENT, color: ACCENT }}>|</span> : null}
            </div>
          ))}
        </pre>
        <div style={{ marginTop: 22, padding: "22px 28px", borderRadius: 20, background: "#0a090d", border: "1px solid #24212f", fontSize: o === "landscape" ? 22 : 26, lineHeight: 1.7, minHeight: 170 }}>
          {termLines
            .filter((t) => frame >= t.at)
            .map((t) => (
              <div key={t.text} style={{ color: t.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.text}</div>
            ))}
        </div>
      </div>
    </Fade>
  );
};

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

const STYLES = ["Chalkboard", "Yarn", "Paper Cut", "Watercolor"] as const;

export const IPO_DEMO_FRAMES = 900;

export const IpoDemo: React.FC<{ orientation: Orientation }> = ({ orientation: o }) => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* 1. A normal Remotion chart */}
      <Sequence durationInFrames={120}>
        <Fade dur={120}>
          <ChartSlot o={o}>
            <ChartBars speed={1.25} />
            <ChartLabels speed={1.25} />
          </ChartSlot>
          <Caption o={o} kicker="Remotion" title={<>A normal<br />bar chart race.</>} />
        </Fade>
      </Sequence>

      {/* 2. The plugin: one component, generated by prefetch */}
      <Sequence from={120} durationInFrames={180}>
        <CodeScene o={o} dur={180} />
      </Sequence>

      {/* 3. Same data, restyled by Magic Hour, exact numbers on top */}
      <Sequence from={300} durationInFrames={240}>
        <Fade dur={240}>
          <ChartSlot o={o}>
            <MagicRestyle composition="ChartBars" artStyle="Claymation" style={{ width: "100%", height: "100%" }} />
            <ChartLabels />
          </ChartSlot>
          <Caption o={o} kicker="+ Magic Hour" title={<>Same chart.<br />Made of clay.</>} code={`artStyle="Claymation"`} />
        </Fade>
      </Sequence>

      {/* 4. Any style, one prop */}
      {STYLES.map((style, i) => (
        <Sequence key={style} from={540 + i * 52} durationInFrames={52}>
          <AbsoluteFill>
            <ChartSlot o={o}>
              <MagicRestyle
                composition="ChartBars"
                artStyle={style}
                trim={{ start: 6, end: 8 }}
                style={{ width: "100%", height: "100%" }}
              />
              <ChartLabels frameOffset={180} />
            </ChartSlot>
            <Caption o={o} kicker="One prop" title={<>Any style.</>} code={`artStyle="${style}"`} />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* 5. End card */}
      <Sequence from={748}>
        <EndCard o={o} />
      </Sequence>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const big = o === "landscape" ? 104 : 80;
  return (
    <AbsoluteFill style={{ background: BG, alignItems: "center", justifyContent: "center", fontFamily: SANS, color: INK, opacity: enter }}>
      <div style={{ textAlign: "center", transform: `scale(${0.96 + enter * 0.04})`, padding: 60 }}>
        <div style={{ fontSize: 32, letterSpacing: 6, textTransform: "uppercase", color: ACCENT, fontWeight: 700 }}>Remotion × Magic Hour</div>
        <div style={{ fontSize: big, fontWeight: 900, letterSpacing: -2, marginTop: 20 }}>magic-hour-remotion</div>
        <div style={{ fontSize: 38, opacity: 0.75, marginTop: 18 }}>Every Magic Hour tool as a Remotion component.</div>
        <div style={{ marginTop: 56, display: "inline-flex", flexDirection: "column", gap: 18, fontFamily: MONO, fontSize: o === "landscape" ? 36 : 27, textAlign: "left" }}>
          <div style={{ background: "#17151f", border: "1px solid #2a2638", borderRadius: 18, padding: "18px 28px" }}>
            <span style={{ color: "#8b86a3" }}>$ </span>npm i magic-hour-remotion
          </div>
          <div style={{ background: "#17151f", border: "1px solid #2a2638", borderRadius: 18, padding: "18px 28px" }}>
            <span style={{ color: "#8b86a3" }}>$ </span>npx skills add ItsAdarsh008/magic-hour-remotion
          </div>
        </div>
        <div style={{ marginTop: 60, fontSize: 20, opacity: 0.45, maxWidth: 900, marginLeft: "auto", marginRight: "auto" }}>{SOURCES}</div>
      </div>
    </AbsoluteFill>
  );
};
