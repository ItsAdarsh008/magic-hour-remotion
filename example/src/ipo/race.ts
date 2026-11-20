import { interpolate, Easing } from "remotion";
import { TECH_IPOS, type Ipo } from "../data/tech-ipos";

/**
 * Shared layout math for the bar chart race. The bars layer (restyled by Magic Hour)
 * and the labels layer (crisp text from Remotion) both call this, so they stay aligned.
 */
export const RACE = {
  size: 1080, // square canvas, reused by 16:9 and 9:16 versions
  fps: 30,
  durationInFrames: 240, // 8s
  startYear: 2004,
  endYear: 2026,
  yearsEndFrame: 190, // the last IPO (Anthropic) lands here, then the chart holds
  topN: 10,
  left: 300, // x where bars start (names live to the left)
  right: 270, // space for the value label at the bar end
  top: 128,
  rowHeight: 84,
  barHeight: 62,
  growFrames: 18,
};

export type BarState = Ipo & {
  /** 0..1 how far the bar has grown in */
  grow: number;
  width: number;
  y: number;
  shownValue: number;
  visible: boolean;
  /** 1 inside the top 10, fading to 0 as a bar is pushed out of it */
  fade: number;
};

/**
 * Entries arrive at a steady rhythm (not by calendar year), so the chart fills up fast
 * like a classic bar chart race. The year counter interpolates between entries.
 * The 2026 trio gets extra breathing room for the big finish.
 */
const APPEAR: number[] = (() => {
  const n = TECH_IPOS.length;
  const lateStart = n - 3;
  return TECH_IPOS.map((_, i) =>
    i < lateStart ? Math.round((i / lateStart) * 140) : [152, 168, RACE.yearsEndFrame][i - lateStart],
  );
})();

const appearFrame = (ipo: Ipo) => APPEAR[TECH_IPOS.indexOf(ipo)];

export const yearAt = (frame: number) =>
  Math.round(
    interpolate(frame, APPEAR, TECH_IPOS.map((x) => x.year), {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

const growsAt = (frame: number) =>
  TECH_IPOS.map((ipo) => {
    const f0 = appearFrame(ipo);
    const g = interpolate(frame, [f0, f0 + RACE.growFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    return { ipo, g, visible: frame >= f0 };
  });

const ranksAt = (frame: number): Record<string, number> => {
  const ranked = growsAt(frame)
    .filter((x) => x.visible)
    .sort((a, b) => b.ipo.raised * b.g - a.ipo.raised * a.g);
  return Object.fromEntries(ranked.map((x, i) => [x.ipo.name, i]));
};

export const raceAt = (frame: number): { bars: BarState[]; scaleMax: number } => {
  const grows = growsAt(frame);

  // The axis rescales smoothly to the biggest visible bar: early IPOs fill the chart,
  // then SpaceX and Anthropic squash everything before them.
  const targetMax = Math.max(2, ...grows.map((x) => x.ipo.raised * x.g));
  const scaleMax = targetMax;
  const maxWidth = RACE.size - RACE.left - RACE.right;

  // Smooth overtakes: average each bar's rank over the last 10 frames.
  const SMOOTH = 10;
  const history = Array.from({ length: SMOOTH }, (_, i) => ranksAt(frame - i));

  const bars: BarState[] = grows.map(({ ipo, g, visible }) => {
    const ranks = history.map((h) => h[ipo.name]).filter((r): r is number => r !== undefined);
    const rank = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;
    return {
      ...ipo,
      grow: g,
      visible,
      width: (ipo.raised * g * maxWidth) / scaleMax,
      y: RACE.top + rank * RACE.rowHeight,
      shownValue: ipo.raised * g,
      fade: Math.max(0, Math.min(1, RACE.topN - rank)),
    };
  });
  return { bars, scaleMax };
};
