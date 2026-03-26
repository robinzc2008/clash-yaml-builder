import { z } from "zod";

export const builderProjectSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    name: z.string(),
    target: z.enum(["openclash", "windows-mihomo", "sparkle"]),
    mode: z.enum(["simple", "advanced"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  settings: z.object({
    finalPolicy: z.union([
      z.object({
        kind: z.literal("builtin"),
        value: z.enum(["DIRECT", "REJECT"]),
      }),
      z.object({
        kind: z.literal("group"),
        value: z.string(),
      }),
    ]),
    enableLanDirect: z.boolean(),
    enableAdBlock: z.boolean(),
  }),
  groups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["select", "url-test", "fallback", "load-balance"]),
      members: z.array(
        z.union([
          z.object({ kind: z.literal("builtin"), value: z.enum(["DIRECT", "REJECT"]) }),
          z.object({ kind: z.literal("group"), ref: z.string() }),
          z.object({ kind: z.literal("proxy-provider"), ref: z.string() }),
          z.object({ kind: z.literal("proxy"), value: z.string() }),
        ]),
      ),
    }),
  ),
  proxyProviders: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sourceType: z.enum(["http", "file"]),
      url: z.string().optional(),
      path: z.string().optional(),
      interval: z.number().optional(),
      filter: z.string().optional(),
      excludeFilter: z.string().optional(),
    }),
  ),
  ruleProviders: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sourceType: z.enum(["http", "file", "inline"]),
      behavior: z.enum(["domain", "ipcidr", "classical"]),
      format: z.enum(["yaml", "text", "mrs"]).optional(),
      url: z.string().optional(),
      path: z.string().optional(),
      interval: z.number().optional(),
      payload: z.array(z.string()).optional(),
      sourceLabel: z.string().optional(),
      sourceUrl: z.string().optional(),
    }),
  ),
  rules: z.array(
    z.object({
      id: z.string(),
      match: z.object({
        kind: z.enum([
          "domain",
          "domain_suffix",
          "domain_keyword",
          "ip_cidr",
          "src_ip_cidr",
          "process_name",
          "process_name_regex",
          "rule_set",
          "geoip",
          "match",
        ]),
        value: z.string().optional(),
      }),
      policy: z.union([
        z.object({
          kind: z.literal("builtin"),
          value: z.enum(["DIRECT", "REJECT"]),
        }),
        z.object({
          kind: z.literal("group"),
          value: z.string(),
        }),
      ]),
      priority: z.number(),
      enabled: z.boolean(),
      comment: z.string().optional(),
    }),
  ),
  features: z.array(
    z.object({
      key: z.string(),
      enabled: z.boolean(),
    }),
  ),
});

export type BuilderProjectDocument = z.infer<typeof builderProjectSchema>;
