export type TenantEmailThemeName =
  | "sand"
  | "rose"
  | "slate"
  | "sage"
  | "ocean"
  | "plum";

type TenantEmailPalette = {
  background: string;
  text: string;
  soft: string;
  accent: string;
  card: string;
  cardAlt: string;
  border: string;
  muted: string;
  dark: string;
  dark2: string;
};

const palettes: Record<TenantEmailThemeName, TenantEmailPalette> = {
  sand: {
    background: "#F3EEEA",
    text: "#2B2A28",
    soft: "#B0A695",
    accent: "#776B5D",
    card: "#EBE3D5",
    cardAlt: "#F7F2EC",
    border: "#4B4844",
    muted: "#5A5753",
    dark: "#4B4844",
    dark2: "#5A5753",
  },
  rose: {
    background: "#FFF7F8",
    text: "#33262B",
    soft: "#D6AEB9",
    accent: "#A85D72",
    card: "#F4E2E7",
    cardAlt: "#FFF0F3",
    border: "#6E4A56",
    muted: "#735C65",
    dark: "#5E3F49",
    dark2: "#735C65",
  },
  slate: {
    background: "#F5F7FA",
    text: "#1F2937",
    soft: "#A7B3C3",
    accent: "#475569",
    card: "#E8EDF3",
    cardAlt: "#F0F3F7",
    border: "#334155",
    muted: "#64748B",
    dark: "#334155",
    dark2: "#475569",
  },
  sage: {
    background: "#F5F8F4",
    text: "#25322A",
    soft: "#A8B8AA",
    accent: "#5F7D68",
    card: "#E6EEE6",
    cardAlt: "#F1F6F1",
    border: "#405748",
    muted: "#65736A",
    dark: "#405748",
    dark2: "#566B5D",
  },
  ocean: {
    background: "#F3F8FA",
    text: "#20343C",
    soft: "#9DB7C1",
    accent: "#39758A",
    card: "#E1EEF2",
    cardAlt: "#EDF5F7",
    border: "#315B69",
    muted: "#607985",
    dark: "#315B69",
    dark2: "#466C79",
  },
  plum: {
    background: "#FAF7FB",
    text: "#342A37",
    soft: "#B9A6BE",
    accent: "#76577E",
    card: "#ECE3EF",
    cardAlt: "#F6F0F7",
    border: "#5B4461",
    muted: "#756679",
    dark: "#5B4461",
    dark2: "#6A5270",
  },
};

export function normalizeTenantEmailTheme(
  value: string | null | undefined,
): TenantEmailThemeName {
  return value === "rose" ||
    value === "slate" ||
    value === "sage" ||
    value === "ocean" ||
    value === "plum"
    ? value
    : "sand";
}

export function applyTenantEmailTheme(
  html: string,
  theme: string | null | undefined,
) {
  const palette = palettes[normalizeTenantEmailTheme(theme)];

  const replacements: Array<[RegExp, string]> = [
    [/#f8f3ef/gi, palette.cardAlt],
    [/#2f2723/gi, palette.dark],
    [/#eadbd2/gi, palette.soft],
    [/#6f5a50/gi, palette.muted],
    [/#9b6f5b/gi, palette.accent],
    [/#8a756b/gi, palette.dark2],
  ];

  return replacements.reduce(
    (result, [pattern, color]) => result.replace(pattern, color),
    html,
  );
}
