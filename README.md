# clash-yaml-builder

[中文](#中文) | [English](#english)

---

## 中文

`clash-yaml-builder` 是一个面向小白用户的桌面向导工具，用来生成 `Sparkle` 和 `Clash（Windows 客户端）` 可直接使用的分流配置，不需要手写 YAML。

### 这个工具做什么

你只需要按步骤操作：

1. 选择目标客户端
2. 填入机场订阅链接
3. 选择地区节点组
4. 选择规则并分配策略组
5. 导出 YAML，或复制可更新订阅链接

应用会根据你的选择，生成适合目标客户端的配置。

### 当前稳定支持

- `Sparkle`
- `Clash（Windows 客户端）`

其他客户端后续会继续适配，但目前不是稳定交付重点。

### 两种导出方式

1. `导出 YAML 配置`
   适合手动导入、留作备份、或者保存一个固定快照。

2. `复制订阅链接（可更新）`
   适合日常使用。客户端导入这个本地链接后，后续点击“更新订阅”时，应用会重新拉取机场节点，并按你当前项目里的规则重新生成配置。

### YAML 和可更新订阅链接的区别

- `YAML` 是一次性导出的本地文件，稳定、直观，适合备份，但不会自动跟着机场节点变化。
- `可更新订阅链接` 更适合长期使用，客户端后续可以直接更新，应用会重新生成最新配置。

### 使用可更新订阅链接时要注意

- 关闭主窗口时，应用默认只会缩到托盘
- 如果你把应用彻底退出，本地订阅更新服务也会停止
- 想让客户端后续继续更新节点，应用需要保持在后台运行

### 主要功能

- 面向新手的分步向导
- 支持粘贴机场原始订阅链接
- 支持地区节点组，例如香港、日本、新加坡、美国
- 支持 AI、流媒体、Apple 和自定义策略组
- 支持内置规则模板和在线规则源
- 支持导出前校验和配置摘要
- 支持导出 YAML
- 支持复制本地可更新订阅链接
- 支持托盘常驻
- 支持项目 JSON 导入导出

### 快速开始

```bash
npm install
npm run dev
```

桌面开发：

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

### License

MIT

### Author

**Robin** - [robin.xin](https://www.robin.xin)

---

## English

`clash-yaml-builder` is a beginner-friendly desktop wizard for generating routing configurations for `Sparkle` and `Clash (Windows client)` without writing YAML by hand.

### What it does

You go through a simple flow:

1. Choose the target client
2. Paste your proxy subscription link
3. Select region node groups
4. Pick rules and assign strategy groups
5. Export YAML or copy an updatable subscription link

The app then generates a configuration that matches the selected client.

### Currently supported

- `Sparkle`
- `Clash (Windows client)`

Other clients may be added later, but they are not the current stable focus.

### Two export modes

1. `Export YAML`
   Best for manual import, backups, and fixed snapshots.

2. `Copy subscription link (updatable)`
   Best for daily use. After the client imports this local link, future “Update subscription” actions will fetch the latest nodes and rebuild the config using your current routing rules.

### YAML vs. updatable subscription link

- `YAML` is a one-time local file. It is stable and easy to back up, but it will not refresh subscription nodes automatically.
- `Updatable subscription link` is better for long-term use. The client can refresh later, and the app will regenerate the latest config.

### Important note for the updatable link mode

- Closing the main window sends the app to the tray by default
- Fully exiting the app stops the local update bridge
- If you want the client to keep updating through the local link, the app must remain running in the background

### Main features

- Step-by-step wizard for beginners
- Raw airport subscription import
- Region node groups such as Hong Kong, Japan, Singapore, and United States
- AI, streaming, Apple, and custom strategy groups
- Built-in presets and online rule sources
- Validation and configuration summary before export
- YAML export
- Local updatable subscription link
- Tray mode for background update service
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

**Robin** - [robin.xin](https://www.robin.xin)
