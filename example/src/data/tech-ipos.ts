/**
 * Biggest tech & telecom IPOs by amount raised at pricing (US$ billions, base deal).
 * Sources checked Nov 19, 2026:
 * - Apple 1980: 4.6M shares at $22, $101.2M (AppleInsider, Deepwater)
 * - Microsoft 1986: $61M (Insider Monkey / NYT)
 * - Deutsche Telekom 1996: €10.0B (~$13B) (Nasdaq)
 * - Amazon 1997: $54M at $18/share (VentureBeat)
 * - NTT DoCoMo 1998: $18.1B (BusinessDay)
 * - AT&T Wireless 2000: $10.6B (Nasdaq)
 * - Google 2004: $1.67B (Fortune)
 * - Facebook 2012: $16.0B (Renaissance Capital)
 * - Alibaba 2014: $21.8B on the NYSE (Renaissance Capital)
 * - SoftBank Corp 2018: ¥2.65T (~$23.5B) (CNBC / CNN)
 * - Uber 2019: $8.1B (Fortune)
 * - Arm 2023: $4.87B (Axios)
 * - Cerebras 2026: $5.55B (Renaissance Capital / IPOScoop)
 * - SpaceX 2026: $75.0B (Renaissance Capital)
 * - Anthropic 2026: $81.3B (CNBC)
 */
export type Ipo = { name: string; year: number; raised: number; color: string };

export const TECH_IPOS: Ipo[] = [
  { name: "Apple", year: 1980, raised: 0.1012, color: "#a3aab5" },
  { name: "Microsoft", year: 1986, raised: 0.061, color: "#3fa7f5" },
  { name: "Deutsche Telekom", year: 1996, raised: 13.0, color: "#e2007a" },
  { name: "Amazon", year: 1997, raised: 0.054, color: "#ff9f1a" },
  { name: "NTT DoCoMo", year: 1998, raised: 18.1, color: "#e60033" },
  { name: "AT&T Wireless", year: 2000, raised: 10.6, color: "#00a8e0" },
  { name: "Google", year: 2004, raised: 1.67, color: "#4f8cff" },
  { name: "Facebook", year: 2012, raised: 16.0, color: "#5b6cff" },
  { name: "Alibaba", year: 2014, raised: 21.8, color: "#ff6a00" },
  { name: "SoftBank Corp", year: 2018, raised: 23.5, color: "#c7c9cc" },
  { name: "Uber", year: 2019, raised: 8.1, color: "#5d6670" },
  { name: "Arm", year: 2023, raised: 4.87, color: "#22c3a6" },
  { name: "Cerebras", year: 2026, raised: 5.55, color: "#ff5c8a" },
  { name: "SpaceX", year: 2026, raised: 75.0, color: "#dfe5ec" },
  { name: "Anthropic", year: 2026, raised: 81.3, color: "#d97757" },
];

export const SOURCES =
  "Amount raised at IPO pricing, base deal, US$. Sources: CNBC, Renaissance Capital, Fortune, Axios, Nasdaq, CNN, AppleInsider.";
