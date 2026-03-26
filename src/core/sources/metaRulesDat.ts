export const META_RULES_DAT_REPO =
  "https://github.com/MetaCubeX/meta-rules-dat";

const META_BRANCH_RAW_BASE =
  "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo";

export type MetaRulesDatGeositeKey =
  | "openai"
  | "github"
  | "google"
  | "youtube"
  | "telegram"
  | "apple"
  | "cn"
  | "netflix"
  | "spotify";

export function buildMetaRulesDatGeositeUrl(
  key: MetaRulesDatGeositeKey,
): string {
  return `${META_BRANCH_RAW_BASE}/geosite/${key}.yaml`;
}

export const metaRulesDatCatalog: Record<
  MetaRulesDatGeositeKey,
  { label: string; url: string }
> = {
  openai: {
    label: "OpenAI",
    url: buildMetaRulesDatGeositeUrl("openai"),
  },
  github: {
    label: "GitHub",
    url: buildMetaRulesDatGeositeUrl("github"),
  },
  google: {
    label: "Google",
    url: buildMetaRulesDatGeositeUrl("google"),
  },
  youtube: {
    label: "YouTube",
    url: buildMetaRulesDatGeositeUrl("youtube"),
  },
  telegram: {
    label: "Telegram",
    url: buildMetaRulesDatGeositeUrl("telegram"),
  },
  apple: {
    label: "Apple",
    url: buildMetaRulesDatGeositeUrl("apple"),
  },
  cn: {
    label: "China Mainland",
    url: buildMetaRulesDatGeositeUrl("cn"),
  },
  netflix: {
    label: "Netflix",
    url: buildMetaRulesDatGeositeUrl("netflix"),
  },
  spotify: {
    label: "Spotify",
    url: buildMetaRulesDatGeositeUrl("spotify"),
  },
};
