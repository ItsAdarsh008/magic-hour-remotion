/**
 * Biggest tech IPOs by amount raised at pricing (US$ billions, base deal).
 * Sources checked Nov 19, 2026:
 * - Anthropic: CNBC, Nov 18 2026 — 980M shares at $83, $81.3B
 * - SpaceX: Renaissance Capital, Jun 11 2026 — 555.6M shares at $135, $75.0B
 * - Alibaba: Renaissance Capital — $21.8B on the NYSE, 2014
 * - Facebook: Renaissance Capital / Nasdaq — $16.0B, 2012
 * - Uber: Fortune/Bloomberg, May 2019 — $8.1B
 * - Cerebras: Renaissance Capital / IPOScoop, May 2026 — 30M shares at $185, $5.55B
 * - Arm: Axios / S&P Global, Sep 2023 — 95.5M shares at $51, $4.87B
 * - Google: Fortune — $1.67B, Aug 2004
 */
export type Ipo = { name: string; year: number; raised: number; color: string };

export const TECH_IPOS: Ipo[] = [
  { name: "Google", year: 2004, raised: 1.67, color: "#4f8cff" },
  { name: "Facebook", year: 2012, raised: 16.0, color: "#5b6cff" },
  { name: "Alibaba", year: 2014, raised: 21.8, color: "#ff8a3d" },
  { name: "Uber", year: 2019, raised: 8.1, color: "#9aa3ad" },
  { name: "Arm", year: 2023, raised: 4.87, color: "#22c3a6" },
  { name: "Cerebras", year: 2026, raised: 5.55, color: "#ff5c8a" },
  { name: "SpaceX", year: 2026, raised: 75.0, color: "#c9d1d9" },
  { name: "Anthropic", year: 2026, raised: 81.3, color: "#d97757" },
];

export const SOURCES =
  "Sources: CNBC, Renaissance Capital, Fortune, Axios, IPOScoop. Amount raised at pricing, base deal.";
