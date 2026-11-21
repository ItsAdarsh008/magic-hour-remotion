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
import { CLAY, EASE, EASE_IN_OUT, INK, LINE, MONO, MUTED, PAPER, SANS, fontsReady } from "./theme";
import { Grain, Rise, Tag } from "./parts";

export type Orientation = "landscape" | "portrait";

/*
 * The chart never leaves the center of the frame. Everything that happens, happens to it.
 * Timeline (30 fps). The music's drop (8.0s into the track) lands on the reveal at frame 90.
 */
const T = {
  hook: [0, 90], // the race finale, in clay
  reveal: [90, 150], // plain Remotion bars → clay
  layers: [150, 210], // why the numbers stay exact
  styles: [210, 480], // six looks, each painted in with a chart-shaped transition
  rapid: [480, 570], // the same six, one per beat
  end: [570, 705],
} as const;
export const LAUNCH_FRAMES = 705;
/** Short-form only: a 2.5s "what is Remotion" opener. */
export const INTRO_FRAMES = 75;
export const framesFor = (o: Orientation) => LAUNCH_FRAMES + (o === "portrait" ? INTRO_FRAMES : 0);

const MUSIC_PROMPT =
  "Playful, warm stop-motion animation soundtrack. Plucky marimba, pizzicato strings, upright bass, light hand claps and a soft kick. Steady 120 BPM, confident and curious, clean mix, starts immediately with no long intro, instrumental, no vocals.";

const STYLES = ["Watercolor", "Yarn", "Paper Cut", "Crayon", "Origami", "Claymation"] as const;
const SEG = 45; // frames per style in the main sequence
const TR = 16; // transition length

const useFonts = () => {
  const [handle] = React.useState(() => delayRender("fonts"));
  React.useEffect(() => {
    fontsReady.then(() => continueRender(handle));
  }, [handle]);
};

const layout = (o: Orientation) =>
  o === "landscape"
    ? { chart: { x: 560, y: 190, s: 800 }, top: 28, chip: 1050, title: 56 }
    : { chart: { x: 30, y: 470, s: 1020 }, top: 200, chip: 1590, title: 84 };

/** The chart, always in the same place. Children are drawn on the 1080x1080 race canvas. */
const Stage: React.FC<{ o: Orientation; children: React.ReactNode }> = ({ o, children }) => {
  const L = layout(o).chart;
  return (
    <div style={{ position: "absolute", left: L.x, top: L.y, width: L.s, height: L.s }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div style={{ width: 1080, height: 1080, transform: `scale(${L.s / 1080})`, transformOrigin: "0 0", position: "relative" }}>{children}</div>
      </div>
      {/* feather the edges so the clip's paper melts into the page */}
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 26px 12px ${PAPER}`, pointerEvents: "none" }} />
    </div>
  );
};

/** Centered headline above the chart. */
const Top: React.FC<{ o: Orientation; children: React.ReactNode }> = ({ o, children }) => {
  const L = layout(o);
  return <div style={{ position: "absolute", left: 0, right: 0, top: L.top, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>{children}</div>;
};

const Clay: React.FC<{ from: number }> = ({ from }) => (
  <MagicRestyle composition="ChartBars" artStyle="Claymation" {...restyleProps("Claymation")} trimBefore={from} style={{ width: 1080, height: 1080 }} />
);

/** The final second of a style's clip (race frames 210–240), then held on its last frame. */
const StyleClip: React.FC<{ style: string }> = ({ style }) => {
  const frame = useCurrentFrame();
  const video =
    style === "Claymation" ? (
      <Clay from={210} />
    ) : (
      <MagicRestyle composition="ChartBars" artStyle={style} {...restyleProps(style)} trim={{ start: 6, end: 8 }} trimBefore={30} style={{ width: 1080, height: 1080 }} />
    );
  return frame < 29 ? video : <Freeze frame={28}>{video}</Freeze>;
};

// ---------------------------------------------------------------------------
// Chart-shaped transitions (clip paths on the 1080 canvas)
// ---------------------------------------------------------------------------
const rowsPath = (p: number, mode: "grow" | "drop") => {
  const rows = 12;
  const rowH = 1080 / rows;
  let d = "";
  for (let i = 0; i < rows; i++) {
    const t = Math.max(0, Math.min(1, p * 1.9 - i * 0.075));
    const e = EASE(t);
    if (e <= 0) continue;
    if (mode === "grow") d += `M0 ${i * rowH} H${1080 * e} V${(i + 1) * rowH} H0 Z `;
    else d += `M0 ${i * rowH} H1080 V${i * rowH + rowH * e} H0 Z `;
  }
  return d ? `path('${d}')` : "inset(0 0 100% 0)";
};

const reveal = (kind: number, p: number): React.CSSProperties => {
  const e = EASE_IN_OUT(p);
  switch (kind % 5) {
    case 0: // each row paints in left→right, like bars growing
      return { clipPath: rowsPath(p, "grow") };
    case 1: // iris from the top of the chart
      return { clipPath: `circle(${e * 1600}px at 540px 120px)` };
    case 2: // rows drop in like blinds
      return { clipPath: rowsPath(p, "drop") };
    case 3: // diagonal sweep
      return { clipPath: `polygon(0 0, ${e * 220}% 0, ${e * 220 - 100}% 100%, 0 100%)` };
    default: // wipe out from the axis
      return { clipPath: `inset(0 ${(1 - e) * 100}% 0 0)` };
  }
};

// ---------------------------------------------------------------------------
// Code line under the chart: the only hint of the plugin, and enough.
// ---------------------------------------------------------------------------
const Chip: React.FC<{ o: Orientation; style: string; at: number; typeFrames?: number }> = ({ o, style, at, typeFrames = 10 }) => {
  const frame = useCurrentFrame();
  const L = layout(o);
  const typed = Math.floor(interpolate(frame - at, [0, typeFrames], [0, style.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const caret = Math.floor(frame / 8) % 2 === 0 && frame - at < 24;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: L.chip - 46, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: o === "landscape" ? 26 : 30, color: MUTED, padding: "8px 18px", borderRadius: 10, background: "rgba(255,255,255,0.45)", border: `1px solid ${LINE}` }}>
        <span style={{ color: "#3f6fb5" }}>&lt;MagicRestyle</span> <span style={{ color: "#7a5aa8" }}>artStyle</span>=
        <span style={{ color: CLAY }}>"{style.slice(0, typed)}</span>
        <span style={{ color: CLAY, opacity: caret ? 1 : 0 }}>|</span>
        <span style={{ color: CLAY }}>"</span> <span style={{ color: "#3f6fb5" }}>/&gt;</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------
const Hook: React.FC<{ o: Orientation }> = ({ o }) => (
  <AbsoluteFill>
    <Stage o={o}>
      <Clay from={150} />
      <ChartLabels frameOffset={150} />
    </Stage>
    <Top o={o}>
      <Rise text="Every tech IPO since 1980," size={layout(o).title} at={4} />
      <Rise text="made of clay." size={layout(o).title} at={26} italic color={CLAY} />
    </Top>
  </AbsoluteFill>
);

const Reveal: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [2, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });
  const x = 1080 * (1 - p);
  return (
    <AbsoluteFill>
      <Stage o={o}>
        <Freeze frame={28}>
          <Clay from={210} />
        </Freeze>
        <div style={{ position: "absolute", left: 0, top: 0, width: x, height: 1080, overflow: "hidden" }}>
          <ChartBars speed={0} frameOffset={239} />
        </div>
        <div style={{ position: "absolute", left: x - 2, top: 0, width: 4, height: 1080, background: INK, opacity: p > 0.01 && p < 0.99 ? 1 : 0 }} />
        <ChartLabels speed={0} frameOffset={239} />
      </Stage>
      <Top o={o}>
        <Rise text="The chart is Remotion." size={layout(o).title} at={0} />
        <Rise text="The clay is Magic Hour." size={layout(o).title} at={16} italic color={CLAY} />
      </Top>
    </AbsoluteFill>
  );
};

const Layers: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const L = layout(o).chart;
  const t = interpolate(frame, [0, 22, 44, 60], [0, 1, 1, 0], { extrapolateRight: "clamp", easing: EASE_IN_OUT });
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
            transform: `scale(${(L.s / 1080) * (1 - 0.12 * t)}) rotateX(${50 * t}deg) rotateZ(${-22 * t}deg)`,
          }}
        >
          <div style={{ position: "absolute", inset: 0, boxShadow: `0 ${40 * t}px ${90 * t}px rgba(60,40,10,${0.22 * t})` }}>
            <Freeze frame={28}>
              <Clay from={210} />
            </Freeze>
          </div>
          <div style={{ position: "absolute", inset: 0, transform: `translateZ(${240 * t}px)` }}>
            <ChartLabels speed={0} frameOffset={239} />
          </div>
        </div>
      </div>
      <Top o={o}>
        <Rise text="AI restyles the pixels." size={layout(o).title} at={0} />
        <Rise text="The numbers stay code." size={layout(o).title} at={14} italic color={CLAY} />
      </Top>
    </AbsoluteFill>
  );
};

const StyleLayer: React.FC<{ style: string; kind: number }> = ({ style, kind }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, TR], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, ...(p < 1 ? reveal(kind, p) : {}) }}>
      <StyleClip style={style} />
    </div>
  );
};

/** Six looks, each painted over the last with a different chart-shaped transition. */
const Styles: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const k = Math.min(STYLES.length - 1, Math.floor(frame / SEG));
  return (
    <AbsoluteFill>
      <Stage o={o}>
        <Freeze frame={28}>
          <Clay from={210} />
        </Freeze>
        {STYLES.map((style, i) => (
          <Sequence key={style} from={i * SEG} durationInFrames={i === STYLES.length - 1 ? SEG : SEG + TR} layout="none">
            <StyleLayer style={style} kind={i} />
          </Sequence>
        ))}
        <ChartLabels speed={0} frameOffset={239} />
      </Stage>
      <Top o={o}>
        <Tag at={0}>artStyle</Tag>
        <div style={{ height: 6 }} />
        <div style={{ position: "relative", height: layout(o).title * 1.4, width: "100%" }}>
          {STYLES.map((style, i) => (
            <Sequence key={style} from={i * SEG} durationInFrames={SEG} layout="none">
              <div style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                <Rise text={style} size={layout(o).title * 1.25} at={2} italic={i % 2 === 1} stagger={2} />
              </div>
            </Sequence>
          ))}
        </div>
      </Top>
      <Chip o={o} style={STYLES[k]} at={k * SEG} />
    </AbsoluteFill>
  );
};

/** The same looks again, one per beat. */
const RAPID = ["Claymation", "Watercolor", "Yarn", "Paper Cut", "Crayon", "Origami"];

const Rapid: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const k = Math.min(RAPID.length - 1, Math.floor(frame / 15));
  return (
    <AbsoluteFill>
      <Stage o={o}>
        {RAPID.map((style, i) => (
          <Sequence key={style} from={i * 15} durationInFrames={15} layout="none">
            <StyleClip style={style} />
          </Sequence>
        ))}
        <ChartLabels speed={0} frameOffset={239} />
      </Stage>
      <Top o={o}>
        <Rise text="One prop." size={layout(o).title} at={0} />
        <Rise text="Every Magic Hour style." size={layout(o).title} at={10} italic color={CLAY} />
      </Top>
      <Chip o={o} style={RAPID[k]} at={k * 15} typeFrames={0.01} />
    </AbsoluteFill>
  );
};

const End: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const land = o === "landscape";
  const t = interpolate(frame, [8, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
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
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: land ? 1200 : 920 }}>
        <Tag>Remotion × Magic Hour</Tag>
        <div style={{ height: 26 }} />
        <Rise text="magic-hour-remotion" size={land ? 140 : 104} at={2} stagger={0} />
        <div style={{ fontFamily: SANS, fontSize: 40, color: MUTED, marginTop: 18, opacity: t }}>Every Magic Hour tool as a Remotion component.</div>
        <div style={{ marginTop: 56 }}>
          {cmd("npm i magic-hour-remotion", 20)}
          {cmd("npx skills add ItsAdarsh008/magic-hour-remotion", 28)}
        </div>
      </div>
      <div style={{ position: "absolute", left: land ? 110 : 80, right: land ? 110 : 80, bottom: land ? 50 : 110, fontFamily: SANS, fontSize: 18, color: MUTED, opacity: t, lineHeight: 1.5, textAlign: "center" }}>
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
  return (
    <>
      {/* Anthropic overtakes SpaceX in the hook (race frame ~200) */}
      <Sfx at={200 - 150} src="thud.ogg" volume={0.5} />
      <Sfx at={T.reveal[0]} src="whoosh.ogg" volume={0.35} />
      <Sfx at={T.end[0] - 4} src="whoosh.ogg" volume={0.3} />
      {STYLES.map((_, i) => (
        <Sfx key={`s${i}`} at={T.styles[0] + i * SEG} src="whoosh.ogg" volume={0.22} />
      ))}
      {RAPID.map((_, i) => (
        <Sfx key={`r${i}`} at={T.rapid[0] + i * 15} src="drop.ogg" volume={0.35} />
      ))}
    </>
  );
};


/** Short-form opener: Remotion in one line, while the plain race plays up to where the clay picks up. */
const Intro: React.FC<{ o: Orientation }> = ({ o }) => {
  const frame = useCurrentFrame();
  const L = layout(o);
  const c = interpolate(frame, [18, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <AbsoluteFill>
      <Stage o={o}>
        <ChartBars speed={2} />
        <ChartLabels speed={2} />
      </Stage>
      <Top o={o}>
        <Tag at={0}>What's Remotion?</Tag>
        <div style={{ height: 14 }} />
        <Rise text="Videos made from" size={L.title} at={2} />
        <Rise text="React code." size={L.title} at={12} italic color={CLAY} />
      </Top>
      <div style={{ position: "absolute", left: 0, right: 0, top: L.chip - 46, display: "flex", justifyContent: "center", opacity: c, translate: `0 ${(1 - c) * 12}px` }}>
        <div style={{ fontFamily: MONO, fontSize: 30, color: MUTED, padding: "8px 18px", borderRadius: 10, background: "rgba(255,255,255,0.45)", border: `1px solid ${LINE}` }}>
          <span style={{ color: "#3f6fb5" }}>&lt;BarChartRace</span> <span style={{ color: "#7a5aa8" }}>data</span>={"{"}
          <span style={{ color: CLAY }}>ipos</span>
          {"}"} <span style={{ color: "#3f6fb5" }}>/&gt;</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------

export const LaunchDemo: React.FC<{ orientation: Orientation }> = ({ orientation: o }) => {
  useFonts();
  const { fps } = useVideoConfig();
  const intro = o === "portrait" ? INTRO_FRAMES : 0;
  const total = LAUNCH_FRAMES + intro;
  const scene = (k: keyof typeof T, el: React.ReactNode) => (
    <Sequence from={T[k][0]} durationInFrames={T[k][1] - T[k][0]} name={k}>
      {el}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {intro > 0 && (
        <Sequence durationInFrames={intro} name="intro">
          <Intro o={o} />
        </Sequence>
      )}
      <Sequence from={intro} name="main">
        {scene("hook", <Hook o={o} />)}
        {scene("reveal", <Reveal o={o} />)}
        {scene("layers", <Layers o={o} />)}
        {scene("styles", <Styles o={o} />)}
        {scene("rapid", <Rapid o={o} />)}
        {scene("end", <End o={o} />)}
        <Sound />
      </Sequence>
      {/* the track's drop (8s in) still lands on the reveal */}
      <MagicMusic
        prompt={MUSIC_PROMPT}
        seconds={40}
        instrumental
        trimBefore={5 * fps - intro}
        volume={(f) => interpolate(f, [0, 6, total - 40, total], [0, 0.55, 0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <Grain />
    </AbsoluteFill>
  );
};
