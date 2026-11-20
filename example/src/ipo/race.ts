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
  yearsEndFrame: 190, // year counter reaches 2026 here, then holds
  left: 300, // x where bars start (names live to the left)
  right: 270, // space for the value label at the bar end
  top: 140,
  rowHeight: 96,
  barHeight: 72,
  growFrames: 18,
};

export type BarState = Ipo & {
  /** 0..1 how far the bar has grown in */
  grow: number;
  width: number;
  y: number;
  shownValue: number;
  visible: boolean;
};

const appearFrame = (ipo: Ipo) => {
  const t = (ipo.year - RACE.startYear) / (RACE.endYear - RACE.startYear);
  // The three 2026 IPOs arrive in their real order: Cerebras (May), SpaceX (Jun), Anthropic (Nov).
  const order2026: Record<string, number> = { Cerebras: -26, SpaceX: -14, Anthropic: 0 };
  return Math.round(t * RACE.yearsEndFrame) + (order2026[ipo.name] ?? 0);
};

export const yearAt = (frame: number) =>
  Math.round(
    interpolate(frame, [0, RACE.yearsEndFrame], [RACE.startYear, RACE.endYear], {
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
    };
  });
  return { bars, scaleMax };
};
