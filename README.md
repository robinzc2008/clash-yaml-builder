# clash-yaml-builder

[English](#english) | [中文](#中文)

---

<a id="english"></a>

## English

A cross-platform wizard for generating proxy routing configuration files (Clash / OpenClash / Mihomo / Sparkle) — no YAML knowledge required.

### What it does

This tool takes your intent — "which apps should go through which region's proxy nodes" — and turns it into a ready-to-use YAML configuration file. The entire process is a step-by-step wizard designed for beginners.

### Features

- **Step-by-step wizard** — 5–7 guided steps from device selection to YAML export
- **Multi-platform support** — OpenClash (router), Mihomo (Windows), Sparkle (Windows / macOS / Linux)
- **Subscription management** — paste your proxy subscription URLs, they're embedded directly in the output
- **Region node groups** — organize nodes by country/area (Hong Kong, Japan, USA…) with customizable regex filters
- **Regex helper** — generate regex patterns from plain keywords, supports include + exclude logic
- **Strategy groups** — assign which region nodes each app category (AI, Streaming, etc.) can use
- **Rule library** — built-in presets + full MetaCubeX online rule catalog with search (loads the `geo/` tree reliably via GitHub’s API — no more empty sync when the repo root tree is truncated)
- **Simple / Advanced mode** — beginners get fewer steps with auto-assigned rules; power users get full control
- **Live YAML preview** — see the generated configuration in real-time before exporting
- **Project import/export** — save and reload your configuration as JSON
- **Local draft persistence** — your progress is auto-saved in browser localStorage
- **Dark sci-fi UI** — "Nexus" design system with glassmorphism, glow effects, and Space Grotesk typography

### Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Pure CSS (custom design system) |
| Desktop | Tauri 2 (optional) |
| Schema | Zod validation |
| YAML | yaml library |
| Rules | MetaCubeX meta-rules-dat |

### Architecture

```
src/
├── core/               # Platform-agnostic core
│   ├── model/          # BuilderProject type system + Zod schema
│   ├── presets/         # Built-in rule packs + region presets
│   ├── renderers/       # YAML renderers (OpenClash, Mihomo, Sparkle)
│   ├── capabilities/    # Platform feature support matrix
│   ├── sources/         # MetaCubeX remote rule catalog
│   └── validation/      # Project validation
├── application/         # Use cases (wizard→project, project→YAML)
├── features/wizard/     # Wizard state, types, persistence, routing
├── i18n/               # Internationalization (EN + ZH)
└── App.tsx             # Main UI component
```

### Design Philosophy

- **Unified project model** — user intent is captured in a platform-agnostic `BuilderProject`, then rendered per-platform
- **Layered architecture** — adding a new platform only requires a new renderer + capability definition
- **Rule abstraction** — rule sources (built-in presets, online catalog) are decoupled from the UI
- **Low refactoring cost** — new platforms, rule sources, or routing scenarios each only touch one layer

### Changelog

- **v0.2.1** — Fixed MetaCubeX full rule catalog sync returning no rules (GitHub truncates huge recursive trees at repo root; the app now requests the `geo/` subtree so geosite/geoip YAML entries appear in search again). Version bump for Windows desktop builds.
- **Earlier versions** — See [GitHub Releases](https://github.com/robinzc2008/clash-yaml-builder/releases).

### License

MIT

### Author

**Robin** — [robin.xin](https://www.robin.xin)

---

<a id="中文"></a>

## 中文

跨平台代理分流配置文件生成器（Clash / OpenClash / Mihomo / Sparkle）— 不需要手写 YAML。

### 这个工具做什么

把你的意图 —「哪些应用走哪个地区的代理节点」— 变成一份可以直接使用的 YAML 配置文件。整个过程是一步一步的向导式操作，专为小白设计。

### 核心功能

- **向导式操作** — 5–7 步引导，从选设备到导出 YAML
- **多平台支持** — OpenClash（路由器）、Mihomo（Windows）、Sparkle（Windows / macOS / Linux）
- **订阅管理** — 粘贴机场订阅链接，自动写入最终配置
- **地区节点组** — 按国家/地区整理节点（香港、日本、美国…），支持自定义正则过滤
- **正则助手** — 用关键词自动生成正则表达式，支持「包含 + 排除」逻辑
- **策略组** — 为每个应用分类（AI、流媒体等）指定可用的地区节点
- **规则库** — 内置规则包 + MetaCubeX 在线规则全量搜索（通过 GitHub 单独拉取 `geo/` 子树，避免根目录递归树被截断后同步结果为空）
- **简单 / 高级模式** — 新手少步骤自动分配；进阶用户完全掌控
- **实时 YAML 预览** — 导出前实时查看生成的配置
- **项目导入/导出** — 保存和加载配置为 JSON 文件
- **本地草稿自动保存** — 进度自动存储在浏览器 localStorage
- **暗色科技感 UI** — "Nexus" 设计系统，玻璃拟态 + 发光效果 + Space Grotesk 字体

### 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript |
| 构建 | Vite 7 |
| 样式 | 纯 CSS（自定义设计系统） |
| 桌面端 | Tauri 2（可选） |
| 校验 | Zod |
| YAML | yaml 库 |
| 规则源 | MetaCubeX meta-rules-dat |

### 架构设计

```
src/
├── core/               # 平台无关的核心层
│   ├── model/          # BuilderProject 类型系统 + Zod Schema
│   ├── presets/         # 内置规则包 + 地区预设
│   ├── renderers/       # YAML 渲染器（OpenClash、Mihomo、Sparkle）
│   ├── capabilities/    # 平台功能支持矩阵
│   ├── sources/         # MetaCubeX 远程规则目录
│   └── validation/      # 项目校验
├── application/         # 用例层（向导→项目、项目→YAML）
├── features/wizard/     # 向导状态、类型、持久化、路由逻辑
├── i18n/               # 国际化（中文 + 英文）
└── App.tsx             # 主 UI 组件
```

### 设计理念

- **统一项目模型** — 用户意图先保存在平台无关的 `BuilderProject` 中，再按目标平台渲染
- **分层架构** — 加新平台只需新增渲染器 + 功能定义
- **规则抽象** — 规则来源（内置包、在线目录）与 UI 解耦
- **低重构成本** — 新平台、新规则源、新分流场景各自只改一层

### 更新记录

- **v0.2.1** — 修复 MetaCubeX 全量规则库同步后条数为 0 的问题（GitHub 对超大仓库的根目录 recursive tree 会截断，导致拿不到 `geo/`；现改为先取 `geo` 子目录再递归，geosite/geoip 规则恢复可搜索）。同步更新 Windows 桌面端版本号。
- **更早版本** — 见 [GitHub Releases](https://github.com/robinzc2008/clash-yaml-builder/releases)。

### 许可

MIT

### 作者

**Robin** — [robin.xin](https://www.robin.xin)
