/** Shared Magic Hour restyle settings for the IPO chart. */


/** How each material should look in the reference image (stronger than the video prompt). */
const LOOK: Record<string, string> = {
  Claymation: "chunky handmade plasticine with visible fingerprints and soft stop-motion studio lighting",
  Yarn: "thick knitted wool with visible stitches, like a cozy knitted blanket",
  "Paper Cut": "layered colored construction paper cut-outs with soft drop shadows",
  Crayon: "bold waxy crayon strokes on textured paper, like a child's drawing",
  Origami: "crisply folded colored origami paper with sharp creases and soft shadows",
};

const MATERIAL: Record<string, string> = {
  Claymation: "modeling clay",
  Watercolor: "watercolor paint",
  Yarn: "knitted yarn",
  "Paper Cut": "layered cut paper",
  Crayon: "wax crayon",
  Origami: "folded origami paper",
};

const chartPrompt = (style: string) =>
  `${style} style: thick horizontal bars made of ${MATERIAL[style] ?? style} on a plain blank background, ` +
  "a simple bar chart, flat, minimal, clean edges, no scenery, no trees, no buildings, no landscape, no people, no text";

/**
 * Restyle settings that keep a chart a chart.
 * - Watercolor supports Magic Hour's v1 model: a custom prompt describing exactly what's there is enough.
 * - Newer styles (Claymation, Yarn, Paper Cut, Crayon) only run on v3, which follows a reference image.
 *   The plugin makes that reference itself: a still of ChartBars, restyled by Magic Hour's image editor.
 */
export const restyleProps = (style: string) => {
  if (style === "Watercolor") {
    return { version: "v1" as const, promptType: "custom" as const, prompt: chartPrompt(style) };
  }
  return {
    promptType: "custom" as const,
    prompt: chartPrompt(style),
    referenceImage: {
      kind: "image-edit" as const,
      image: { kind: "still" as const, composition: "ChartBars", frame: 239 },
      prompt:
        `Recreate this exact bar chart in ${style} style: every bar is made of ${LOOK[style] ?? MATERIAL[style] ?? style}, ` +
        "with the same color, position, length and order. Keep the layout identical and the background plain. " +
        "No text, no extra objects, no scenery.",
    },
  };
};

