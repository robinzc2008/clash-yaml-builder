export const META_RULES_DAT_REPO =
  "https://github.com/MetaCubeX/meta-rules-dat";

const META_TREES_API =
  "https://api.github.com/repos/MetaCubeX/meta-rules-dat/git/trees/meta?recursive=1";
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

interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
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

function buildRemoteRuleItemFromTree(
  kind: MetaRulesDatRemoteKind,
  name: string,
): MetaRulesDatRemoteItem {
  return {
    id: `${kind}:${name}` as const,
    kind,
    name,
    providerName: `${kind}:${name}`,
    behavior: kind === "geosite" ? "domain" : "ipcidr",
    url:
      kind === "geosite"
        ? buildMetaRulesDatGeositeUrl(name)
        : buildMetaRulesDatGeoipUrl(name),
    sourceLabel: `MetaCubeX ${kind}:${name}`,
    sourceUrl: META_RULES_DAT_REPO,
    searchText: `${kind} ${name} MetaCubeX meta-rules-dat geo/${kind}/${name}`.toLowerCase(),
  };
}

/**
 * 使用 Git Trees API 一次性拉取整棵目录树，然后从中筛选 geo/geosite/*.yaml 和 geo/geoip/*.yaml。
 * 这比旧的 Contents API 可靠得多 — Contents API 对单目录有 1000 文件上限，
 * 而 geosite 目录（yaml + list + mrs）经常刚好卡在这个边界，导致部分规则丢失。
 */
export async function fetchMetaRulesDatRemoteCatalog(): Promise<MetaRulesDatRemoteItem[]> {
  const response = await fetch(META_TREES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub Trees API returned ${response.status}`);
  }

  const data = (await response.json()) as GitHubTreeResponse;

  const geositePrefix = "geo/geosite/";
  const geoipPrefix = "geo/geoip/";
  const yamlSuffix = ".yaml";

  const items: MetaRulesDatRemoteItem[] = [];

  for (const entry of data.tree) {
    if (entry.type !== "blob") continue;

    if (entry.path.startsWith(geositePrefix) && entry.path.endsWith(yamlSuffix)) {
      const name = entry.path.slice(geositePrefix.length, -yamlSuffix.length);
      if (name && !name.includes("/")) {
        items.push(buildRemoteRuleItemFromTree("geosite", name));
      }
    } else if (entry.path.startsWith(geoipPrefix) && entry.path.endsWith(yamlSuffix)) {
      const name = entry.path.slice(geoipPrefix.length, -yamlSuffix.length);
      if (name && !name.includes("/")) {
        items.push(buildRemoteRuleItemFromTree("geoip", name));
      }
    }
  }

  return items.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return left.name.localeCompare(right.name);
  });
}

export function buildRemoteRuleProviderFromId(id: string, alias?: string) {
  const [kind, rawName] = id.split(":");
  const name = rawName?.trim();

  if (!name || (kind !== "geosite" && kind !== "geoip")) {
    return null;
  }

  const providerName = alias?.trim() || `${kind}:${name}`;

  return {
    id: `remote-rule-provider-${kind}-${name}`.replace(/[^a-z0-9-]/gi, "-"),
    name: providerName,
    sourceType: "http" as const,
    behavior: kind === "geosite" ? ("domain" as const) : ("ipcidr" as const),
    format: "yaml" as const,
    interval: 86400,
    url: kind === "geosite" ? buildMetaRulesDatGeositeUrl(name) : buildMetaRulesDatGeoipUrl(name),
    sourceLabel: `MetaCubeX ${kind}:${name}`,
    sourceUrl: META_RULES_DAT_REPO,
  };
}
