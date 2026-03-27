## v0.2.1

### English

**Fix: MetaCubeX full rule catalog showed zero rules after sync**

The wizard pulls the online rule list from [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) using GitHub’s Git Trees API. Calling `recursive=1` on the **repository root** returns a **truncated** tree for very large repos—often only early paths such as `asn/`, with **`geo/` missing entirely**. The UI then filtered nothing and search (e.g. “steam”) found no entries.

**Change:** request the **non-recursive** tree for the `meta` branch, locate the `geo` directory’s tree SHA, then `recursive=1` **only on that subtree**. Paths inside that response are `geosite/*.yaml` and `geoip/*.yaml`, which we index again.

**Also in this release**

- Version bump to **0.2.1** (`package.json`, Tauri config, Cargo) for Windows desktop artifacts.
- README: changelog section + note on reliable rule catalog loading.

**Desktop builds (Windows)**

After this release is published, GitHub Actions uploads:

- `clash-yaml-builder-v0.2.1-windows-setup.exe` (NSIS installer)
- `clash-yaml-builder-v0.2.1-windows-portable.exe` (portable binary)

If assets are still building, refresh the release page in a few minutes.

---

### 中文

**修复：MetaCubeX 全量规则库同步后规则数量为 0**

向导从 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) 通过 GitHub Git Trees API 拉取在线规则列表。对**仓库根目录**使用 `recursive=1` 时，超大仓库会返回 **被截断** 的树——经常出现只有靠前的 `asn/` 等路径，**完全没有 `geo/`**，界面筛选结果为空，搜索（例如「steam」）也找不到规则。

**改动：**先拉取 `meta` 分支的**非递归**根 tree，找到 `geo` 目录的 tree SHA，再**仅对该子树**执行 `recursive=1`。子树内路径为 `geosite/*.yaml`、`geoip/*.yaml`，与现有 RAW 地址逻辑一致，全量名录与搜索恢复正常。

**本版本其它说明**

- 版本号提升至 **0.2.1**（前端与 Tauri / Cargo 一致），便于 Windows 安装包与便携版区分。
- README 增加更新记录，并说明全量规则库的加载方式。

**桌面版（Windows）**

Release 发布后会由 GitHub Actions 上传：

- `clash-yaml-builder-v0.2.1-windows-setup.exe`（NSIS 安装包）
- `clash-yaml-builder-v0.2.1-windows-portable.exe`（便携版）

若 Assets 仍显示构建中，请过几分钟刷新 Release 页面。
