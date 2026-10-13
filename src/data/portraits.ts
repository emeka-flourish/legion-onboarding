// Illustrated placeholder portraits for the invented providers, drawn in code (src/components/providers/
// ProviderPortrait.tsx). No photos: these are not real people, and nothing is downloaded. Browser-safe.

export type HairStyle = "short" | "side" | "buzz" | "waves" | "curly" | "coily" | "long" | "bob" | "bun" | "locs" | "headscarf" | "bald";

export interface Portrait {
  /** 0 (lightest) to 5 (deepest). */
  skin: 0 | 1 | 2 | 3 | 4 | 5;
  hair: HairStyle;
  hairColor: "black" | "darkBrown" | "brown" | "auburn" | "blonde" | "gray";
  top: "navy" | "teal" | "plum" | "rose" | "slate" | "olive" | "sky" | "coral";
  bg: "blue" | "indigo" | "pink" | "green" | "amber" | "sky" | "violet" | "rose" | "teal";
  glasses?: boolean;
  beard?: boolean;
  scarf?: "teal" | "plum" | "navy" | "rose";
}

export const SKIN = ["#F6D7C3", "#EBC19D", "#D8A07A", "#B97E56", "#8B5A3C", "#5C3A26"] as const;
export const HAIR = {
  black: "#1F1A17",
  darkBrown: "#3A2A20",
  brown: "#6B4632",
  auburn: "#8E3B22",
  blonde: "#C9A15B",
  gray: "#A3A3A3",
} as const;
export const TOP = {
  navy: "#1E3A8A",
  teal: "#0F766E",
  plum: "#6B21A8",
  rose: "#BE185D",
  slate: "#334155",
  olive: "#4D7C0F",
  sky: "#0369A1",
  coral: "#C2410C",
} as const;
export const BG = {
  blue: "#DBEAFE",
  indigo: "#E0E7FF",
  pink: "#FCE7F3",
  green: "#DCFCE7",
  amber: "#FEF3C7",
  sky: "#E0F2FE",
  violet: "#EDE9FE",
  rose: "#FFE4E6",
  teal: "#CCFBF1",
} as const;
export const SCARF = { teal: "#0F766E", plum: "#7E22CE", navy: "#1E40AF", rose: "#BE185D" } as const;
