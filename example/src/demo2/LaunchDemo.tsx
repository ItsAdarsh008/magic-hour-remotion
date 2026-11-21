import React from "react";
import {
  AbsoluteFill,
  Audio,
  Freeze,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MagicMusic, MagicRestyle } from "magic-hour-remotion";
import { ChartBars } from "../ipo/ChartBars";
import { ChartLabels } from "../ipo/ChartLabels";
import { restyleProps } from "../ipo/restyle";
import { SOURCES } from "../data/tech-ipos";
import { CLAY, EASE, EASE_IN_OUT, INK, LINE, MONO, MUTED, PAPER, SANS, SERIF, fontsReady } from "./theme";
import { Grain, Rise, StudioShot, Tag } from "./parts";
import codeTokens from "./code-tokens.json";

export type Orientation = "landscape" | "portrait";

// Timeline (30 fps). The music's drop (8.0s into the track) lands on the reveal at frame 90.
const T = {
  hook: [0, 90],
  reveal: [90, 150],
  layers: [150, 225],
  studio: [225, 405],
  generate: [405, 585],
  code: [585, 675],
  montage: [675, 855],
  end: [855, 990],
} as const;
export const LAUNCH_FRAMES = 990;
const MUSIC_PROMPT =
  "Playful, warm stop-motion animation soundtrack. Plucky marimba, pizzicato strings, upright bass, light hand claps and a soft kick. Steady 120 BPM, confident and curious, clean mix, starts immediately with no long intro, instrumental, no vocals.";

const dur = (k: keyof typeof T) => T[k][1] - T[k][0];

const useFonts = () => {
  const [handle] = React.useState(() => delayRender("fonts"));
  React.useEffect(() => {
    fontsReady.then(() => continueRender(handle));
  }, [handle]);
};

/** Layout for each orientation: where the square chart goes, and where captions go. */
const layout = (o: Orientation) =>
  o === "landscape"
    ? { W: 1920, H: 1080, chart: { x: 900, y: 40, s: 1000 }, cap: { x: 110, y: 330, w: 790 }, capSize: 84 }
    : { W: 1080, H: 1920, chart: { x: 0, y: 520, s: 1080 }, cap: { x: 80, y: 130, w: 920 }, capSize: 96 };

const Chart: React.FC<{ o: Orientation; children: React.ReactNode; style?: React.CSSProperties }> = ({ o, children, style }) => {
  const L = layout(o).chart;
  return (
    <div
      style={{
        position: "absolute",
        left: L.x,
        top: L.y,
        width: L.s,
        height: L.s,
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ width: 1080, height: 1080, transform: `scale(${L.s / 1080})`, transformOrigin: "0 0", position: "relative" }}>{children}</div>
      {/* feather the edges so the clip's paper melts into the page */}
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 26px 12px ${PAPER}`, pointerEvents: "none" }} />
    </div>
  );
};

const Caption: React.FC<{ o: Orientation; children: React.ReactNode }> = ({ o, children }) => {
  const L = layout(o).cap;
  return <div style={{ position: "absolute", left: L.x, top: L.y, width: L.w }}>{children}</div>;
};

const clay = (style: string, trim: boolean) =>
  trim ? (
    <MagicRestyle composition="ChartBars" artStyle={style} {...restyleProps(style)} trim={{ start: 6, end: 8 }} style={{ width: 1080, height: 1080 }} />
  ) : (
    <MagicRestyle composition="ChartBars" artStyle={style} {...restyleProps(style)} style={{ width: 1080, height: 1080 }} />
  );

// ---------------------------------------------------------------------------
// 1. Hook: the payoff first. The last 3 seconds of the race, in clay.
// ---------------------------------------------------------------------------
const Hook: React.FC<{ o: Orientation }> = ({ o }) => {
  const { capSize } = layout(o);
  return (
    <AbsoluteFill>
      <Chart o={o}>
        <MagicRestyle composition="ChartBars" artStyle="Claymation" {...restyleProps("Claymation")} trimBefore={150} style={{ width: 1080, height: 1080 }} />
        <ChartLabels frameOffset={150} />
      </Chart>
      <Caption o={o}>
        <Tag at={2}>Nov 19, 2026 · Anthropic lists</Tag>
        <div style={{ height: 26 }} />
        <Rise text="Every tech IPO since 1980," size={capSize} at={6} />
        <Rise text="made of clay." size={capSize} at={30} italic color={CLAY} />
      </Caption>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 2. Reveal: wipe from plain Remotion bars to Magic Hour clay.
// ---------------------------------------------------------------------------
const Reveal: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { capSize } = layout(o);
  const p = interpolate(frame, [4, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });
  const x = 1080 * (1 - p);
  return (
    <AbsoluteFill>
      <Chart o={o}>
        <Freeze frame={59}>{clay("Claymation", true)}</Freeze>
        <div style={{ position: "absolute", left: 0, top: 0, width: x, height: 1080, overflow: "hidden" }}>
          <ChartBars speed={0} frameOffset={239} />
        </div>
        <div style={{ position: "absolute", left: x - 2, top: 0, width: 4, height: 1080, background: INK, opacity: p > 0 && p < 1 ? 1 : 0 }} />
        <ChartLabels speed={0} frameOffset={239} />
      </Chart>
      <Caption o={o}>
        <Rise text="The chart is Remotion." size={capSize} at={0} />
        <Rise text="The clay is Magic Hour." size={capSize} at={18} italic color={CLAY} />
      </Caption>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 3. Layers: the trick, shown. AI pixels below, exact numbers floating above.
// ---------------------------------------------------------------------------
const Layers: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const L = layout(o).chart;
  const t = interpolate(frame, [0, 34], [0, 1], { extrapolateRight: "clamp", easing: EASE });
  const lift = interpolate(frame, [10, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const s = (L.s / 1080) * (o === "landscape" ? 0.86 : 0.8);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: L.x, top: L.y, width: L.s, height: L.s, perspective: 2600 }}>
        <div
          style={{
            position: "absolute",
            left: L.s / 2 - 540,
            top: L.s / 2 - 540,
            width: 1080,
            height: 1080,
            transformStyle: "preserve-3d",
            transform: `scale(${s}) rotateX(${52 * t}deg) rotateZ(${-24 * t}deg)`,
          }}
        >
          <div style={{ position: "absolute", inset: 0, boxShadow: `0 ${40 * t}px ${90 * t}px rgba(60,40,10,${0.25 * t})` }}>
            <Freeze frame={59}>{clay("Claymation", true)}</Freeze>
          </div>
          <div style={{ position: "absolute", inset: 0, transform: `translateZ(${260 * lift}px)` }}>
            <div style={{ position: "absolute", inset: 0, background: `rgba(243,239,230,${0.0})`, outline: `${2 * lift}px dashed rgba(23,21,15,${0.35 * lift})` }} />
            <ChartLabels speed={0} frameOffset={239} />
          </div>
        </div>
      </div>
      <Caption o={o}>
        <Tag at={0}>How it stays accurate</Tag>
        <div style={{ height: 22 }} />
        <Rise text="AI restyles the pixels." size={layout(o).capSize * 0.8} at={4} />
        <Rise text="The numbers stay code." size={layout(o).capSize * 0.8} at={20} italic color={CLAY} />
      </Caption>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 4. Real Remotion Studio: switching styles from the props panel.
// ---------------------------------------------------------------------------
const Studio: React.FC<{ o: Orientation }> = ({ o }) => {
  const { W, H } = layout(o);
  const land = o === "landscape";
  // Two takes from the recording: Claymation→Yarn, then →Paper Cut.
  const viewH = land ? H - 150 : 1120;
  const top = land ? 150 : 600;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: land ? 40 : 0, top, width: land ? W - 80 : W, height: viewH }}>
        <Sequence durationInFrames={95}>
          <StudioShot
            recStart={12.0}
            w={land ? W - 80 : W}
            h={viewH}
            cam={
              land
                ? [
                    { f: 0, z: 1, x: 960, y: 540 },
                    { f: 18, z: 1.9, x: 1500, y: 330 },
                    { f: 60, z: 1.9, x: 1500, y: 330 },
                    { f: 78, z: 1.35, x: 1100, y: 420 },
                  ]
                : [
                    { f: 0, z: 1.6, x: 960, y: 420 },
                    { f: 18, z: 3.2, x: 1560, y: 330 },
                    { f: 60, z: 3.2, x: 1560, y: 330 },
                    { f: 80, z: 1.7, x: 960, y: 420 },
                  ]
            }
          />
        </Sequence>
        <Sequence from={95} durationInFrames={85}>
          <StudioShot
            recStart={20.2}
            w={land ? W - 80 : W}
            h={viewH}
            cam={
              land
                ? [
                    { f: 0, z: 1.35, x: 1100, y: 420 },
                    { f: 16, z: 1.9, x: 1500, y: 330 },
                    { f: 56, z: 1.9, x: 1500, y: 330 },
                    { f: 74, z: 1.35, x: 1000, y: 420 },
                  ]
                : [
                    { f: 0, z: 1.7, x: 960, y: 420 },
                    { f: 16, z: 3.2, x: 1560, y: 330 },
                    { f: 56, z: 3.2, x: 1560, y: 330 },
                    { f: 74, z: 1.7, x: 960, y: 420 },
                  ]
            }
          />
        </Sequence>
      </div>
      <div style={{ position: "absolute", left: land ? 80 : 80, top: land ? 40 : 150, width: land ? 1700 : 920 }}>
        <Tag at={0}>Real Remotion Studio · no edits</Tag>
        <div style={{ height: 14 }} />
        <Rise text="Pick a style. It swaps in." size={land ? 64 : 92} at={4} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 5. A style that doesn't exist yet: generated live, with the real dev-watcher log.
// ---------------------------------------------------------------------------
const LOG = [
  { at: 34, text: "✦ image edit → Magic Hour API", c: CLAY },
  { at: 52, text: "  ✓ image edit in 13.3s, 50 credits", c: "#3e7d4f" },
  { at: 62, text: "✦ restyle (Origami) → Magic Hour API", c: CLAY },
  { at: 120, text: "  ✓ restyle (Origami) in 212.9s, 120 credits", c: "#3e7d4f" },
];

const Generate: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { W, H } = layout(o);
  const land = o === "landscape";
  const viewH = land ? H - 150 : 1120;
  const top = land ? 150 : 600;
  // Real time between request and result: 3m 33s, shown as a fast-forward
  const ff = interpolate(frame, [70, 118], [0, 213], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });
  const mm = Math.floor(ff / 60);
  const ss = String(Math.floor(ff % 60)).padStart(2, "0");
  const termIn = interpolate(frame, [26, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const termOut = interpolate(frame, [150, 164], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: land ? 40 : 0, top, width: land ? W - 80 : W, height: viewH }}>
        {/* click → Origami → "generating…" (recording 26.6s–31s) */}
        <Sequence durationInFrames={120}>
          <StudioShot
            recStart={26.6}
            w={land ? W - 80 : W}
            h={viewH}
            cam={
              land
                ? [
                    { f: 0, z: 1.35, x: 1000, y: 420 },
                    { f: 14, z: 1.9, x: 1500, y: 330 },
                    { f: 44, z: 1.9, x: 1500, y: 330 },
                    { f: 64, z: 1.25, x: 960, y: 420 },
                  ]
                : [
                    { f: 0, z: 1.7, x: 960, y: 420 },
                    { f: 14, z: 3.2, x: 1560, y: 360 },
                    { f: 44, z: 3.2, x: 1560, y: 360 },
                    { f: 64, z: 1.7, x: 960, y: 420 },
                  ]
            }
          />
        </Sequence>
        {/* …3m 33s later, it's there (recording 256.6s→) */}
        <Sequence from={120} durationInFrames={60}>
          <StudioShot recStart={256.8} w={land ? W - 80 : W} h={viewH} showCursor={false} cam={land ? [{ f: 0, z: 1.25, x: 960, y: 420 }, { f: 60, z: 1.4, x: 960, y: 420 }] : [{ f: 0, z: 1.7, x: 960, y: 420 }, { f: 60, z: 1.85, x: 960, y: 420 }]} />
        </Sequence>
      </div>

      {/* Terminal: the actual `magichour-remotion dev` output from that run */}
      <div
        style={{
          position: "absolute",
          right: land ? 70 : 50,
          bottom: land ? 60 : 120,
          width: land ? 760 : 980,
          padding: "22px 28px",
          borderRadius: 14,
          background: "#1b1914",
          color: "#efe9dd",
          fontFamily: MONO,
          fontSize: land ? 22 : 26,
          lineHeight: 1.7,
          boxShadow: "0 24px 60px rgba(30,20,5,0.35)",
          opacity: termIn * (1 - termOut),
          translate: `0 ${(1 - termIn) * 40 + termOut * 30}px`,
        }}
      >
        <div style={{ color: "#8f8878" }}>$ npx magichour-remotion dev</div>
        {LOG.filter((l) => frame >= l.at).map((l) => (
          <div key={l.text} style={{ color: l.c === CLAY ? "#ec9a74" : "#9fd3a8", whiteSpace: "pre" }}>
            {l.text}
          </div>
        ))}
      </div>

      {/* fast-forward chip */}
      <div
        style={{
          position: "absolute",
          left: land ? 80 : 80,
          bottom: land ? 70 : 470,
          fontFamily: MONO,
          fontSize: land ? 30 : 34,
          color: INK,
          background: PAPER,
          border: `2px solid ${INK}`,
          borderRadius: 999,
          padding: "10px 22px",
          opacity: interpolate(frame, [66, 72, 124, 132], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        ▶▶ +{mm}m {ss}s
      </div>

      <div style={{ position: "absolute", left: 80, top: land ? 40 : 150, width: land ? 1700 : 920 }}>
        <Tag at={0}>A style nobody generated yet</Tag>
        <div style={{ height: 14 }} />
        <Rise text="Generated, cached, swapped in." size={land ? 64 : 84} at={4} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 6. The code: one component.
// ---------------------------------------------------------------------------
const Code: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const land = o === "landscape";
  const lines = codeTokens as { c: string; k: string }[][];
  const hl = interpolate(frame, [30, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: land ? 110 : 80, top: land ? 120 : 160, width: land ? 760 : 920 }}>
        <Tag at={0}>The whole integration</Tag>
        <div style={{ height: 22 }} />
        <Rise text="One component." size={land ? 92 : 96} at={4} />
        <Rise text="Any composition." size={land ? 92 : 96} at={16} italic color={CLAY} />
      </div>
      <div
        style={{
          position: "absolute",
          left: land ? 900 : 60,
          top: land ? 210 : 820,
          width: land ? 900 : 960,
          padding: "40px 44px",
          borderRadius: 16,
          background: "#fbf9f4",
          border: `1px solid ${LINE}`,
          fontFamily: MONO,
          fontSize: land ? 30 : 30,
          lineHeight: 1.6,
          boxShadow: "0 20px 60px rgba(60,40,10,0.12)",
        }}
      >
        {lines.map((line, i) => {
          const t = interpolate(frame - i * 2, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
          const isHl = i === 6;
          return (
            <div key={i} style={{ opacity: t, translate: `${(1 - t) * 16}px 0`, position: "relative", whiteSpace: "pre", minHeight: "1.6em" }}>
              {isHl ? <div style={{ position: "absolute", left: -18, right: -18, top: 0, bottom: 0, background: `rgba(196,83,47,${0.14 * hl})`, borderRadius: 6 }} /> : null}
              <span style={{ position: "relative" }}>
                {line.map((tok, j) => (
                  <span key={j} style={{ color: tok.k }}>
                    {tok.c}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 7. Montage on the beat: six styles, two beats each.
// ---------------------------------------------------------------------------
const MONTAGE = ["Claymation", "Watercolor", "Yarn", "Paper Cut", "Crayon", "Origami"];

const Montage: React.FC<{ o: Orientation }> = ({ o }) => {
  const land = o === "landscape";
  return (
    <AbsoluteFill>
      {MONTAGE.map((style, i) => (
        <Sequence key={style} from={i * 30} durationInFrames={30}>
          <MontageCard o={o} style={style} index={i} />
        </Sequence>
      ))}
      <div style={{ position: "absolute", left: land ? 110 : 80, top: land ? 120 : 150 }}>
        <Tag>artStyle=</Tag>
      </div>
    </AbsoluteFill>
  );
};

const MontageCard: React.FC<{ o: Orientation; style: string; index: number }> = ({ o, style, index }) => {
  const frame = useCurrentFrame();
  const land = o === "landscape";
  const push = interpolate(frame, [0, 30], [1.04, 1], { easing: EASE });
  return (
    <AbsoluteFill>
      <Chart o={o} style={{ scale: `${push}` }}>
        {style === "Claymation" ? (
          <MagicRestyle composition="ChartBars" artStyle="Claymation" {...restyleProps("Claymation")} trimBefore={210} style={{ width: 1080, height: 1080 }} />
        ) : (
          <MagicRestyle composition="ChartBars" artStyle={style} {...restyleProps(style)} trim={{ start: 6, end: 8 }} trimBefore={30} style={{ width: 1080, height: 1080 }} />
        )}
        <ChartLabels frameOffset={210} />
      </Chart>
      <div style={{ position: "absolute", left: land ? 110 : 80, top: land ? 190 : 230, fontFamily: SERIF, fontSize: land ? 150 : 150, lineHeight: 1, color: INK, letterSpacing: -2 }}>
        <span style={{ fontStyle: index % 2 ? "italic" : "normal" }}>{style}</span>
      </div>
      <div style={{ position: "absolute", left: land ? 114 : 84, top: land ? 360 : 400, fontFamily: MONO, fontSize: 26, color: MUTED }}>
        {String(index + 1).padStart(2, "0")} / {String(MONTAGE.length).padStart(2, "0")}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 8. End card
// ---------------------------------------------------------------------------
const End: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const land = o === "landscape";
  const t = interpolate(frame, [10, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const cmd = (text: string, delay: number) => {
    const c = interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
    return (
      <div style={{ fontFamily: MONO, fontSize: land ? 34 : 30, color: INK, opacity: c, translate: `0 ${(1 - c) * 14}px`, padding: "14px 0", borderTop: `1px solid ${LINE}` }}>
        <span style={{ color: MUTED }}>$ </span>
        {text}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ padding: land ? "150px 110px" : "560px 80px" }}>
      <Tag>Remotion × Magic Hour</Tag>
      <div style={{ height: 30 }} />
      <Rise text="magic-hour-remotion" size={land ? 150 : 104} at={2} stagger={0} />
      <div style={{ fontFamily: SANS, fontSize: land ? 40 : 40, color: MUTED, marginTop: 20, opacity: t, maxWidth: 1300 }}>
        Every Magic Hour tool as a Remotion component.
      </div>
      <div style={{ marginTop: 60, maxWidth: land ? 1100 : 920 }}>
        {cmd("npm i magic-hour-remotion", 22)}
        {cmd("npx skills add ItsAdarsh008/magic-hour-remotion", 30)}
      </div>
      <div style={{ position: "absolute", left: land ? 110 : 80, right: land ? 110 : 80, bottom: land ? 60 : 120, fontFamily: SANS, fontSize: 18, color: MUTED, opacity: t, lineHeight: 1.5 }}>
        {SOURCES} Soundtrack generated with &lt;MagicMusic /&gt;.
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------------
const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.6 }) => (
  <Sequence from={at} durationInFrames={45}>
    <Audio src={staticFile(`demo/sfx/${src}`)} volume={volume} />
  </Sequence>
);

const Sound: React.FC = () => {
  const { fps } = useVideoConfig();
  // Cursor clicks inside the Studio shots, mapped from recording time to video frames.
  const studioClicks = [13.131, 15.744].map((t) => T.studio[0] + Math.round((t - 12.0) * fps));
  const studioClicks2 = [20.804, 22.72].map((t) => T.studio[0] + 95 + Math.round((t - 20.2) * fps));
  const genClicks = [27.481, 29.376].map((t) => T.generate[0] + Math.round((t - 26.6) * fps));
  return (
    <>
      <MagicMusic
        prompt={MUSIC_PROMPT}
        seconds={40}
        instrumental
        trimBefore={5 * fps}
        volume={(f) =>
          interpolate(f, [0, 6, LAUNCH_FRAMES - 40, LAUNCH_FRAMES], [0, 0.55, 0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        }
      />
      <Sfx at={48} src="thud.ogg" volume={0.5} />
      {[T.reveal[0], T.studio[0], T.generate[0], T.code[0], T.end[0]].map((f) => (
        <Sfx key={f} at={f - 4} src="whoosh.ogg" volume={0.35} />
      ))}
      {[...studioClicks, ...studioClicks2, ...genClicks].map((f) => (
        <Sfx key={`c${f}`} at={f} src="click.ogg" volume={0.7} />
      ))}
      <Sfx at={T.generate[0] + 120} src="confirm.ogg" volume={0.5} />
      {MONTAGE.map((_, i) => (
        <Sfx key={`m${i}`} at={T.montage[0] + i * 30} src="drop.ogg" volume={0.35} />
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------

export const LaunchDemo: React.FC<{ orientation: Orientation }> = ({ orientation: o }) => {
  useFonts();
  const scene = (k: keyof typeof T, el: React.ReactNode) => (
    <Sequence from={T[k][0]} durationInFrames={dur(k)} name={k}>
      {el}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {scene("hook", <Hook o={o} />)}
      {scene("reveal", <Reveal o={o} />)}
      {scene("layers", <Layers o={o} />)}
      {scene("studio", <Studio o={o} />)}
      {scene("generate", <Generate o={o} />)}
      {scene("code", <Code o={o} />)}
      {scene("montage", <Montage o={o} />)}
      {scene("end", <End o={o} />)}
      <Sound />
      <Grain />
    </AbsoluteFill>
  );
};
