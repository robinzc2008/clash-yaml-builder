## v0.2.2

### English

**Sparkle / Mihomo-compatible YAML export**

- **Fix:** Sparkle target previously emitted camelCase top-level keys (`groups`, `proxyProviders`, `ruleProviders`). The Clash Meta kernel only accepts the standard kebab-case fields (`proxy-groups`, `proxy-providers`, `rule-providers`). Rules referenced policy groups such as `🤖 AI`, but those groups were never loaded, causing `proxy [...] not found` on profile check.
- **Consistency:** Built-in direct in `proxy-groups` now lists **`直连`** when the config injects a `direct` proxy named 直连 (same as `proxy` on proxy-providers for subscription fetch). OpenClash and Windows Mihomo renderers use the same behavior.
- **Dev utility:** `scripts/generate-sparkle-sample.ts` — optional `SUB_URL` env to emit a test YAML for Sparkle.
- **Docs:** `docs/implementation-overview.html`, `docs/effect-summary.html` (architecture / effect diagrams, Chinese “plain language” section).
- **Repo:** `.gitignore` adds `sparkle-test*.yaml` for local samples that may contain subscription tokens.

**Windows desktop (GitHub Actions)** — after publish: `clash-yaml-builder-v0.2.2-windows-setup.exe`, `clash-yaml-builder-v0.2.2-windows-portable.exe`.

---

### 中文

**Sparkle 与标准 Mihomo / Clash YAML 对齐**

- **修复：** Sparkle 导出曾使用 camelCase 顶层键（`groups`、`proxyProviders` 等），内核只认 `proxy-groups`、`proxy-providers`、`rule-providers`，导致策略组未加载、规则引用组名时报 `proxy not found`。
- **一致：** 在已注入 `name: 直连` 的 direct 节点时，策略组内直连选项使用 **`直连`**，与订阅拉取的 `proxy: 直连` 一致；OpenClash、Windows Mihomo 同步。
- **脚本：** `scripts/generate-sparkle-sample.ts`，可通过环境变量 `SUB_URL` 本地生成 Sparkle 测试 YAML。
- **文档：** `docs/` 下架构与效果示意 HTML（含人话版说明）。
- **仓库：** `.gitignore` 忽略 `sparkle-test*.yaml`，避免含 token 的测试文件被提交。

**Windows 桌面构建** — Release 发布后由 CI 上传：`clash-yaml-builder-v0.2.2-windows-setup.exe` 与便携版。
