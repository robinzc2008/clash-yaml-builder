import type { AppLanguage } from "../model/types";

export interface RegionPreset {
  id: string;
  /** 英文名 */
  name: string;
  /** 中文名 */
  nameZh: string;
  /** url-test 正则过滤 */
  filter: string;
  /** 默认组类型 */
  type: "url-test" | "select";
  tolerance: number;
  interval: number;
  /** 是否默认启用（向导初始状态） */
  enabledByDefault: boolean;
  i18n?: Partial<Record<AppLanguage, { name: string }>>;
}

/**
 * 内置地区节点组预设，正则与用户博客模板中的规则一致。
 * 每条 filter 用正向先行断言匹配地区关键字。
 */
export const regionPresets: RegionPreset[] = [
  {
    id: "region-manual",
    name: "👆 Manual Select",
    nameZh: "👆 手动选择节点",
    filter: "",
    type: "select",
    tolerance: 0,
    interval: 0,
    enabledByDefault: true,
  },
  {
    id: "region-hk",
    name: "♻️ Hong Kong",
    nameZh: "♻️ 香港",
    filter: "^(?=.*(港|香港|(?i)HK|Hongkong)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 60,
    enabledByDefault: true,
  },
  {
    id: "region-jp",
    name: "♻️ Japan",
    nameZh: "♻️ 日本",
    filter: "^(?=.*(日|(?i)JP|Japan)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 60,
    enabledByDefault: true,
  },
  {
    id: "region-tw",
    name: "♻️ Taiwan",
    nameZh: "♻️ 台湾",
    filter: "^(?=.*(台|湾|灣|(?i)TW|Taiwan)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 60,
    enabledByDefault: true,
  },
  {
    id: "region-sg",
    name: "♻️ Singapore",
    nameZh: "♻️ 新加坡",
    filter: "^(?=.*(新加坡|坡|狮城|SG|Singapore)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 60,
    enabledByDefault: true,
  },
  {
    id: "region-kr",
    name: "♻️ Korea",
    nameZh: "♻️ 韩国",
    filter: "^(?=.*(韩|韩国|韓國|首尔|汉城|(?i)KR|Korea)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 60,
    enabledByDefault: true,
  },
  {
    id: "region-us",
    name: "♻️ United States",
    nameZh: "♻️ 美国",
    filter:
      "^(?=.*(美|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|硅谷|拉斯|洛杉|圣何塞|圣克拉|西雅|芝加|(?i)US|States|America)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 60,
    enabledByDefault: true,
  },
  {
    id: "region-ru",
    name: "♻️ Russia",
    nameZh: "♻️ 俄罗斯",
    filter: "^(?=.*(俄|俄罗斯|(?i)RU|Russia)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 300,
    enabledByDefault: false,
  },
  {
    id: "region-sea",
    name: "♻️ Southeast Asia",
    nameZh: "♻️ 东南亚",
    filter:
      "^(?=.*(越|越南|柬|柬埔寨|马来西亚|泰|泰国|印度尼西亚|印尼|老挝|菲|菲律宾|(?i)VN|Vietnam|KH|Cambodia|MY|Malaysia|TH|Thailand|Indonesia|Laos|Philippines)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 100,
    enabledByDefault: false,
  },
  {
    id: "region-au",
    name: "♻️ Australia",
    nameZh: "♻️ 澳洲",
    filter:
      "^(?=.*(澳洲|澳大利亚|新西兰|悉尼|墨尔本|(?i)AU|Australia|NewZealand|Sydney|Melbourne)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 300,
    enabledByDefault: false,
  },
  {
    id: "region-eu",
    name: "♻️ Europe",
    nameZh: "♻️ 欧洲",
    filter:
      "^(?=.*(德国|英国|希腊|芬兰|意大利|比利时|法国|荷兰|冰岛|瑞士|瑞典|西班牙|爱尔兰|挪威|立陶宛|波兰|(?i)GR|UK|FR|Germany|Greece|Finland|Italy|Belgium|France|Netherlands|Iceland|Switzerland|Sweden|Spain|Ireland|Norway|Poland)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 300,
    enabledByDefault: false,
  },
  {
    id: "region-me",
    name: "♻️ Middle East",
    nameZh: "♻️ 中东",
    filter:
      "^(?=.*(阿拉伯|迪拜|沙特|利雅得|吉达|卡塔尔|以色列|土耳其|埃及|约旦|开罗|巴林|利比亚|也门|(?i)Arab|Dubai|Saudi|Arabia|Riyadh|Jeddah|Qatar|Israel|Turkey|Egypt|Jordan|Cairo|Bahrain|Libya|Yemen)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 300,
    enabledByDefault: false,
  },
  {
    id: "region-latam",
    name: "♻️ Latin America",
    nameZh: "♻️ 拉丁美洲",
    filter:
      "^(?=.*(巴西|阿根廷|墨西哥|秘鲁|玻利维亚|智利|哥伦比亚|厄瓜多尔|巴拉圭|乌拉圭|委内瑞拉|(?i)Brazil|Argentina|Mexico|Peru|Bolivia|Chile|Colombia|Ecuador|Paraguay|Venezuela|Uruguay)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 300,
    enabledByDefault: false,
  },
  {
    id: "region-iepl",
    name: "🚊 IEPL",
    nameZh: "🚊 IEPL专线",
    filter: "(?i)IEPL|专线",
    type: "select",
    tolerance: 0,
    interval: 0,
    enabledByDefault: false,
  },
  {
    id: "region-all",
    name: "🌐 All",
    nameZh: "🌐 所有",
    filter: "^(?!.*(?i:DIRECT|REJECT|直连|拒绝)).*$",
    type: "url-test",
    tolerance: 20,
    interval: 300,
    enabledByDefault: false,
  },
];

/** 根据预设生成默认的可编辑地区组列表 */
export function buildDefaultRegionGroups(language: "en" | "zh") {
  return regionPresets
    .filter((p) => p.enabledByDefault)
    .map((p) => ({
      id: p.id,
      name: language === "zh" ? p.nameZh : p.name,
      filter: p.filter,
      type: p.type as "select" | "url-test",
      tolerance: p.tolerance,
      interval: p.interval,
    }));
}
