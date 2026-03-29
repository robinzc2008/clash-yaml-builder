# clash-yaml-builder

[English](#english) | [中文](#中文)

---

<a id="english"></a>

## English

`clash-yaml-builder` is a beginner-friendly desktop wizard for generating proxy routing configurations without writing YAML by hand.

At the moment, the app focuses on two working targets:

- `Sparkle`
- `Clash (Windows client)`

Other clients are still being adapted and are not the current stable focus.

### What it does

You paste your airport subscription link, choose which regions you want, decide which apps or websites should use which strategy groups, and the app generates a ready-to-use configuration for the selected client.

### Current status

- `Sparkle` is supported
- `Clash (Windows client)` is supported
- Other targets are still in progress

### Two output modes

The app currently supports two ways to use a generated configuration:

1. `Export YAML`
   Use this when you want a local file for manual import, backup, or offline use.

2. `Copy local subscription URL`
   Use this when you want the client to click `Update Subscription` later and fetch the newest nodes again using your saved routing rules.

### Difference between YAML and local subscription URL

- `YAML` is a local snapshot. It is stable and easy to back up, but it does not refresh airport nodes automatically.
- `Local subscription URL` is better for daily use. The client can update it later, and the app will regenerate the config with your current rules and the latest subscription nodes.

### Important note about updates

If you use the local subscription URL mode, the app must still be running in the background so the client can request updates from it.

- Closing the window sends the app to the system tray by default
- Fully exiting the app will stop the local update service
- If the app is fully exited, future node updates from the client may fail until the app is opened again

### Main features

- Step-by-step wizard for beginners
- Subscription import from raw airport links
- Region node groups such as Hong Kong, Japan, Singapore, and United States
- Strategy group assignment for AI, streaming, Apple, and custom groups
- Built-in rule presets and online rule sources
- Real-time project summary and validation
- YAML export for manual import
- Local subscription URL for client-side updates
- Desktop tray mode for background update service
- Project JSON import/export

### Quick start

```bash
npm install
npm run dev
```

Desktop development:

```bash
npm run tauri:dev
```

Production build:

```bash
npm run build
```

### Tech stack

- React 19
- TypeScript
- Vite
- Tauri 2
- Zod
- yaml
- MetaCubeX rule sources

### License

MIT

### Author

**Robin** — [robin.xin](https://www.robin.xin)

---

<a id="中文"></a>

## 中文

`clash-yaml-builder` 是一个面向小白用户的桌面向导工具，用来生成代理分流配置，不需要手写 YAML。

目前这个项目优先稳定支持两个客户端：

- `Sparkle`
- `Clash（Windows客户端）`

其他客户端还在持续适配中，暂时不是当前稳定交付重点。

### 这个工具做什么

你只需要粘贴机场原始订阅链接，选择需要的地区节点，再配置哪些应用、网站走哪些策略组，应用就会为对应客户端生成可直接使用的配置。

### 当前支持情况

- `Sparkle` 已支持
- `Clash（Windows客户端）` 已支持
- 其他目标仍在适配中

### 目前支持两种使用方式

1. `导出 YAML`
   适合手动导入、本地备份、或者离线保存一份稳定配置文件。

2. `复制本地订阅链接`
   适合日常使用。之后可以直接在客户端里点击“更新订阅”，按你当前保存的分流规则重新生成最新配置。

### YAML 和本地订阅链接的区别

- `YAML` 是一次性导出的本地快照，适合备份，也更直观，但不会自动跟着机场节点刷新。
- `本地订阅链接` 更适合长期使用。客户端后续点“更新订阅”时，应用会重新拉取机场订阅，并按你的规则重新生成配置。

### 关于更新的重要说明

如果你使用的是“本地订阅链接”模式，本应用需要继续在后台运行，客户端才能正常向它请求更新。

- 关闭主窗口时，应用默认会缩到系统托盘
- 只有彻底退出应用，本地更新服务才会停止
- 如果应用已彻底退出，之后客户端再更新节点时，可能会失败，需要重新打开本应用

### 主要功能

- 面向小白的分步向导
- 支持直接粘贴机场原始订阅链接
- 支持香港、日本、新加坡、美国等地区节点组
- 支持 AI、流媒体、Apple 和自定义策略组
- 支持内置规则模板和在线规则源
- 支持实时配置摘要和导出前校验
- 支持导出 YAML 文件
- 支持复制本地订阅链接给客户端更新
- 支持托盘常驻，提供后台更新服务
- 支持项目 JSON 导入导出

### 快速开始

```bash
npm install
npm run dev
```

桌面端开发：

```bash
npm run tauri:dev
```

生产构建：

```bash
npm run build
```

### 技术栈

- React 19
- TypeScript
- Vite
- Tauri 2
- Zod
- yaml
- MetaCubeX 规则源

### 许可证

MIT

### 作者

**Robin** — [robin.xin](https://www.robin.xin)
