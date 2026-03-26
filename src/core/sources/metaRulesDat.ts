export const META_RULES_DAT_REPO =
  "https://github.com/MetaCubeX/meta-rules-dat";

const META_RULES_DAT_API_BASE =
  "https://api.github.com/repos/MetaCubeX/meta-rules-dat/contents/geo";
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

export type MetaRulesDatRemoteKind = "geosite" | "geoip";

export interface MetaRulesDatRemoteItem {
  id: `${MetaRulesDatRemoteKind}:${string}`;
  kind: MetaRulesDatRemoteKind;
  name: string;
  providerName: string;
  behavior: "domain" | "ipcidr";
  url: string;
  sourceLabel: string;
  sourceUrl: string;
  searchText: string;
}

interface GitHubContentEntry {
  name: string;
  path: string;
  type: string;
  download_url: string | null;
}

export function buildMetaRulesDatGeositeUrl(
  key: MetaRulesDatGeositeKey | string,
): string {
  return `${META_BRANCH_RAW_BASE}/geosite/${key}.yaml`;
}

export function buildMetaRulesDatGeoipUrl(key: string): string {
  return `${META_BRANCH_RAW_BASE}/geoip/${key}.yaml`;
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

function buildRemoteRuleItem(kind: MetaRulesDatRemoteKind, entry: GitHubContentEntry) {
  const name = entry.name.replace(/\.yaml$/i, "");
  return {
    id: `${kind}:${name}` as const,
    kind,
    name,
    providerName: `${kind}:${name}`,
    behavior: kind === "geosite" ? "domain" : "ipcidr",
    url:
      entry.download_url ??
      (kind === "geosite"
        ? buildMetaRulesDatGeositeUrl(name)
        : buildMetaRulesDatGeoipUrl(name)),
    sourceLabel: `MetaCubeX ${kind}:${name}`,
    sourceUrl: META_RULES_DAT_REPO,
    searchText: `${kind} ${name} MetaCubeX meta-rules-dat ${entry.path}`.toLowerCase(),
  } satisfies MetaRulesDatRemoteItem;
}

async function fetchDirectory(kind: MetaRulesDatRemoteKind): Promise<MetaRulesDatRemoteItem[]> {
  const response = await fetch(`${META_RULES_DAT_API_BASE}/${kind}?ref=meta`, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }

  const data = (await response.json()) as GitHubContentEntry[];

  return data
    .filter((entry) => entry.type === "file" && entry.name.endsWith(".yaml"))
    .map((entry) => buildRemoteRuleItem(kind, entry));
}

export async function fetchMetaRulesDatRemoteCatalog(): Promise<MetaRulesDatRemoteItem[]> {
  const [geosite, geoip] = await Promise.all([
    fetchDirectory("geosite"),
    fetchDirectory("geoip"),
  ]);

  return [...geosite, ...geoip].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }

    return left.name.localeCompare(right.name);
  });
}

export function buildRemoteRuleProviderFromId(id: string) {
  const [kind, rawName] = id.split(":");
  const name = rawName?.trim();

  if (!name || (kind !== "geosite" && kind !== "geoip")) {
    return null;
  }

  return {
    id: `remote-rule-provider-${kind}-${name}`.replace(/[^a-z0-9-]/gi, "-"),
    name: `${kind}:${name}`,
    sourceType: "http" as const,
    behavior: kind === "geosite" ? ("domain" as const) : ("ipcidr" as const),
    format: "yaml" as const,
    interval: 86400,
    url: kind === "geosite" ? buildMetaRulesDatGeositeUrl(name) : buildMetaRulesDatGeoipUrl(name),
    sourceLabel: `MetaCubeX ${kind}:${name}`,
    sourceUrl: META_RULES_DAT_REPO,
  };
}
