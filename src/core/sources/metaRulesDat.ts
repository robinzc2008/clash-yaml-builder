export const META_RULES_DAT_REPO =
  "https://github.com/MetaCubeX/meta-rules-dat";

/** 分支名 → 用于解析根 tree（勿对整个仓库 recursive，超大时会 truncated 且只剩 asn 等前缀片段） */
const META_BRANCH = "meta";
const META_TREES_ROOT_API = `https://api.github.com/repos/MetaCubeX/meta-rules-dat/git/trees/${META_BRANCH}`;
const META_BRANCH_RAW_BASE =
  `https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/${META_BRANCH}/geo`;

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
 * 拉取 MetaCubeX geo 规则全量目录（geosite + geoip 的 .yaml）。
 *
 * 说明：不能对仓库根直接用 `?recursive=1` — GitHub 会在超大树上设置 `truncated: true`，
 * 返回的 `tree` 往往只有最前面的目录（例如全是 `asn/`），从而导致 geo 规则数为 0。
 * 正确做法：先取分支根 tree（非 recursive），找到 `geo` 子目录的 SHA，再对该子 tree 做 recursive。
 */
export async function fetchMetaRulesDatRemoteCatalog(): Promise<MetaRulesDatRemoteItem[]> {
  const rootResponse = await fetch(META_TREES_ROOT_API, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!rootResponse.ok) {
    throw new Error(`GitHub Trees API (root) returned ${rootResponse.status}`);
  }

  const rootData = (await rootResponse.json()) as GitHubTreeResponse;
  const geoEntry = rootData.tree.find((e) => e.path === "geo" && e.type === "tree");

  if (!geoEntry) {
    throw new Error("meta-rules-dat: root tree has no geo/ directory");
  }

  const geoResponse = await fetch(`${geoEntry.url}?recursive=1`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!geoResponse.ok) {
    throw new Error(`GitHub Trees API (geo) returned ${geoResponse.status}`);
  }

  const data = (await geoResponse.json()) as GitHubTreeResponse;

  if (data.truncated) {
    throw new Error(
      "meta-rules-dat: geo tree still truncated — report upstream or split geosite/geoip fetches",
    );
  }

  /** 子树内路径为 geosite/foo.yaml、geoip/cn.yaml（无前缀 geo/） */
  const geositePrefix = "geosite/";
  const geoipPrefix = "geoip/";
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
