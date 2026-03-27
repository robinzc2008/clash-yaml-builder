/**
 * Loyalsoldier v2ray-rules-dat — 提供 geoip.dat / geosite.dat 二进制文件，
 * 供 Clash/Mihomo 的 geodata-mode 使用。数据源比单独的 yaml 规则文件更全面，
 * 特别是 geoip 部分融合了 IPIP.net 等国内 IP 数据库。
 *
 * @see https://github.com/Loyalsoldier/v2ray-rules-dat
 */

export type GeoDataSourceId = "loyalsoldier" | "metacubex";

export interface GeoDataSourceDef {
  id: GeoDataSourceId;
  label: string;
  labelZh: string;
  repo: string;
  geoxUrl: {
    geoip: string;
    geosite: string;
    mmdb: string;
  };
}

export const geoDataSources: Record<GeoDataSourceId, GeoDataSourceDef> = {
  loyalsoldier: {
    id: "loyalsoldier",
    label: "Loyalsoldier (recommended)",
    labelZh: "Loyalsoldier（推荐）",
    repo: "https://github.com/Loyalsoldier/v2ray-rules-dat",
    geoxUrl: {
      geoip:
        "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",
      geosite:
        "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat",
      mmdb:
        "https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/Country.mmdb",
    },
  },
  metacubex: {
    id: "metacubex",
    label: "MetaCubeX",
    labelZh: "MetaCubeX",
    repo: "https://github.com/MetaCubeX/meta-rules-dat",
    geoxUrl: {
      geoip:
        "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
      geosite:
        "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
      mmdb:
        "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb",
    },
  },
};

/** 根据选择的数据源返回 geox-url 配置块 */
export function buildGeoxUrlConfig(sourceId: GeoDataSourceId) {
  const src = geoDataSources[sourceId] ?? geoDataSources.loyalsoldier;
  return src.geoxUrl;
}
