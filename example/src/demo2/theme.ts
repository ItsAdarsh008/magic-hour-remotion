import { loadFont } from "@remotion/fonts";
import { Easing, staticFile } from "remotion";

export const PAPER = "#f3efe6"; // same as the chart background, so the chart sits in the page, not on a card
export const INK = "#17150f";
export const MUTED = "#6f6a5f";
export const CLAY = "#c4532f";
export const LINE = "#d9d2c3";

export const SERIF = "'Instrument Serif', Georgia, serif";
export const SANS = "'Space Grotesk', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', Menlo, monospace";

export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

const fonts: [string, string, string, string][] = [
  ["Instrument Serif", "fonts/instrument-serif-latin-400-normal.woff2", "400", "normal"],
  ["Instrument Serif", "fonts/instrument-serif-latin-400-italic.woff2", "400", "italic"],
  ["Space Grotesk", "fonts/space-grotesk-latin-400-normal.woff2", "400", "normal"],
  ["Space Grotesk", "fonts/space-grotesk-latin-500-normal.woff2", "500", "normal"],
  ["Space Grotesk", "fonts/space-grotesk-latin-700-normal.woff2", "700", "normal"],
  ["JetBrains Mono", "fonts/jetbrains-mono-latin-400-normal.woff2", "400", "normal"],
  ["JetBrains Mono", "fonts/jetbrains-mono-latin-500-normal.woff2", "500", "normal"],
];

export const fontsReady = Promise.all(
  fonts.map(([family, file, weight, style]) => loadFont({ family, url: staticFile(file), weight, style })),
);
