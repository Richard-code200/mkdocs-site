---
title: Pi Agent 使用笔记
description: 本机 Pi 与 Pi-Bolt 的配置、常用功能、扩展和快捷键速查。
created: "2026-11-11"
modified: "2026-11-11"
tags: [ai, agent, 工具, 快捷键]
aliases: [ai-agents/pi-agent]
---

本机 Pi 和 Pi-Bolt 的配置速查。先列高频操作，再看配置关系、扩展和快捷键；未实测的部分单独标注。

> 核查日期：2026-11-11（本机环境快照）。
> 本文的「Pi」指命令 `pi`，即 `@earendil-works/pi-coding-agent`；本机没有单独的 `pi-agent` 可执行命令。
> 未特别标注的核心功能两者均有；**【扩展】**表示由当前安装的包提供；**【Pi-Bolt 专属】**表示当前环境仅由 `pi-bolt` 提供，不代表同类功能无法通过其他 Pi 扩展实现。
> 依据本机配置、两套程序的 CLI 帮助、随附文档及已安装扩展说明核对。快捷键未在真实终端逐项按键实测，最终以当前界面提示和 `/hotkeys` 为准。

## 1. 先记住这些

| 想做什么 | 操作 |
|---|---|
| 在项目目录开始工作 | `cd /path/to/project` 后执行 `pi` 或 `pi-bolt` |
| 接着当前目录的上次会话 | `pi -c` / `pi-bolt -c` |
| 选择历史会话 | `/resume`，或启动时使用 `-r` |
| 查看可用命令 / 快捷键 | 输入 `/` / 执行 `/hotkeys` |
| 换模型 / 调整推理强度 | `/model` / `/thinking`；快捷键 `Ctrl+L` / `Shift+Tab` |
| 收藏与最近模型 | **【扩展】** `/pick`、`/fav` |
| 看工具 / 推理过程 | `Ctrl+O` / `Ctrl+T` 折叠、展开 |
| 新会话 / 压缩上下文 | `/new` / `/compact` |
| 跑长命令 | 让 agent「在后台运行，结束后报告」，用 `/bg` 查看 |
| 临时问个旁支问题 | **【扩展】** `/btw 问题`，默认不写入主对话 |
| 重载资源 | `/reload`；有子代理等活动任务时先确认是否会被中断 |
| 退出 | `/quit`；Vim NORMAL 下也可 `:q` 或 `ZZ`（输入须为空） |

**当前启用了 Vim 输入编辑器。** INSERT 模式第一次 `Esc` 通常只是进入 NORMAL；在空闲 NORMAL 下再按 `Esc` 才传给 Pi 中断任务。若有待完成的 Vim 指令、建议或弹窗，按键可能先由它们处理。

## 2. 安装与配置关系

### 2.1 本机安装

| 项目 | Pi | Pi-Bolt |
|---|---|---|
| 启动命令 | `pi` | `pi-bolt` |
| 实测版本 | **1.5.1** | **Pi-Bolt 1.2.0，基于 Pi 1.5.0** |
| 运行形式 | npm / Node.js | Linux x64 编译版，**JIT off** |
| 命令入口 | `~/.local/bin/pi` | `~/.local/bin/pi-bolt` |
| 实际入口 | `~/.local/lib/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js` | `~/.pi-bolt/pi-bolt-linux-x64/pi` |
| 当前共享包 | 17 个 | 同左，另有 2 个专用包 |

- 当前 Node.js 为 `v22.22.2`。
- 两者默认使用同一个用户配置目录 **`~/.pi/agent/`**，并非两套完全隔离的环境。修改共享模型、主题、扩展配置时，另一程序通常也会受影响。
- 当前进程未设置 `PI_CODING_AGENT_DIR`、`PI_CODING_AGENT_SESSION_DIR`、`PI_PACKAGE_DIR` 覆盖项。
- 本次从 `/home/errorichard/workspace` 核查，未发现该目录的 `.pi/settings.json`；其他项目仍可能有覆盖配置。
- **【Pi-Bolt 专属】** `pi-bolt compile --status` 实测为 **没有扩展编译进二进制**。不能因为主程序已编译，就认为所有 npm 扩展也已 AOT 编译。

### 2.2 当前主要设置

来源：`~/.pi/agent/settings.json`。

| 设置 | 当前值 / 含义 |
|---|---|
| `defaultProvider` | `openai-codex` |
| `defaultModel` | `gpt-6.1-sol`（配置中的模型 ID，不表示本次已验证 API 可用） |
| `defaultThinkingLevel` | `high` |
| `theme` | `ansi-dark`，来自已安装的 ANSI 主题包 |
| `extensions` | 含 `-builtin:usage` 排除项；另安装了 `@narumitw/pi-usage` 提供用量界面 |
| `piBolt.packagesOverlay` | `true`，Pi-Bolt 在公共包列表上叠加专用包 |
| `piBolt.packages` | `opensec-pi-todo@2.13.1`、`opensec-pi-fff@0.11.0` |

以下是**未显式覆盖的默认行为**，不是配置文件中已经写入的值：

- 没有 `keybindings.json`：核心使用默认绑定，但扩展仍会拦截或增加按键。
- 没有 `piVim` 设置块：Vim 扩展按自身默认值运行。
- 没有 `tuiMode` 设置：随附文档默认是 `fullscreen`；启动参数仍可覆盖。
- 没有 `modelPick` 设置：模型选择扩展默认记住最近选择，见下文。
- 没有 `pi-btw.json`、`pi-tool.json`、`pi-usage.json`、`pi-fff.json`：对应扩展没有单独的用户配置文件。

### 2.3 配置层级

```text
用户设置：~/.pi/agent/settings.json
    ↓ 信任项目后加载
项目设置：<工作目录>/.pi/settings.json
    ↓ 本次启动覆盖
CLI 参数，例如 --model、--thinking、--use-theme
```

- 普通项目设置可覆盖用户设置；资源列表有合并与排除规则，不能一律理解为整个列表替换。
- 项目资源涉及代码执行能力，陌生仓库不要直接信任。`--approve` 是信任项目资源，不是逐条工具调用审批。
- 项目 `SYSTEM.md` / `APPEND_SYSTEM.md` 与用户同名文件存在优先级，不是简单拼接。
- 上级目录的 `AGENTS.md` 等上下文文件也可能影响行为；不要只检查 `.pi/settings.json`。

## 3. 常用功能

### 3.1 启动、续接与一次性任务

```bash
cd /path/to/project
pi                         # 交互会话
pi -c                      # 续接当前目录最近会话
pi -r                      # 选择历史会话
pi --name "检查登录逻辑"    # 为新会话命名
pi @README.md "概括这个项目"
pi -p "解释 README 的结构" # 非交互：处理后退出，仍可能使用工具
pi --no-session            # 不保存本次会话
```

上述一般也可将 `pi` 换成 `pi-bolt`。`-p` 不是只读或沙箱模式，`--no-session` 也不是禁止联网。

### 3.2 输入与文件引用

- `Enter` 提交；INSERT 下 `Shift+Enter` 或 `Ctrl+J` 换行。
- 输入 `@` 搜索并引用文件；`Tab` 补全路径。
- **【扩展】** CC 扩展还提供历史 Session / Subagent 引用与补全。
- **【Pi-Bolt 专属】** 当前 FFF 扩展接管文件、目录的 `@` 搜索建议。
- `Ctrl+G` 打开外部编辑器：当前 `VISUAL=nvim`、`EDITOR=nvim`，未配置额外的 `externalEditor`。
- `Ctrl+V` 可通过 Pi 粘贴图片或剪贴板内容，实际取决于终端与桌面剪贴板支持。
- 输入 `!git status` 执行命令并把输出加入上下文；`!!git status` 执行但不把输出送给模型。**两者都会执行，不是安全隔离机制。**

### 3.3 工作中追加要求

| 操作 | 时机 |
|---|---|
| 运行中输入消息并按 `Enter` | Steering：在当前响应及其工具调用结束后，指导下一轮响应 |
| `Alt+Enter` | Follow-up：等当前任务完成后再处理 |
| `Alt+↑` | 把排队消息取回输入框 |
| `Esc` | 中断；启用 Vim 后须考虑当前模式 |

### 3.4 模型、推理与用量

| 命令 | 说明 |
|---|---|
| `/model [provider/model]` | 原生模型选择 |
| `/thinking [level]` | 设置推理级别；可用档位由模型决定 |
| `/scoped-models` | 限定 `Ctrl+P` 循环切换的模型范围 |
| `/settings` | 常用配置、主题、显示选项 |
| `/pick` | **【扩展】** 收藏优先、最近使用其次的模型选择器 |
| `/fav` | **【扩展】** 收藏 / 取消收藏当前模型 |
| `/usage` | **【扩展】** 查询当前供应商用量、限额与重置时间 |
| `/fast` | **【扩展】** 支持的 Codex 模型 Fast 路由开关，可能消耗更多套餐额度 |

**模型选择会影响下次启动：** `pi-model-pick` 默认将通过 `/pick`、`/model` 或 `Ctrl+P` 选择的模型保存为默认模型。恢复历史会话则不会因此修改默认值。当前没有设置 `modelPick.rememberLast: false`。

`/usage` 和 `/fast` 不接受参数；不要照旧教程写 `/usage --all`。用量数字依赖供应商接口，不能把状态栏费用估算直接当成真实账单。

### 3.5 会话、上下文和文件回退

| 命令 | 说明 |
|---|---|
| `/new` | 新建会话 |
| `/resume` | 选择并继续历史会话 |
| `/name [名称]` | 命名当前会话 |
| `/session` | 查看会话路径、ID、消息与用量统计 |
| `/tree` | 查看、切换对话分支和历史位置 |
| `/fork` | 从较早用户消息分出新会话 |
| `/clone` | 复制当前会话到新会话 |
| `/compact [要求]` | 压缩上下文；摘要不等于完整保留所有细节 |
| `/copy` | 复制最后的 assistant 回复 |
| `/export [路径]` | 导出 HTML 或 JSONL |

**【扩展】检查点：** `pi-checkpoints` 会在 `/tree`、`/fork` 回到早期位置时询问是否恢复文件，并列出受影响文件。

- **只跟踪 Pi 的 `edit` / `write` 工具修改**，不跟踪 Shell 命令的任意改动，也不能假定 `lsp_fix` 写入受保护。
- 手工修改过的文件会提示恢复可能丢失后续修改；可以拒绝文件回退，只切换对话。
- 数据位于 `~/.pi/agent/checkpoints/`；它不是 Git、完整备份或系统级回滚。
- `/share` 会上传会话，可能含源码、工具输出和意外暴露的凭据。私人笔记和配置不应未经检查就分享。

### 3.6 后台任务与网页检索

**【扩展】后台任务 `pi-background`：**

- 长构建、测试、下载让 agent 使用 `bg_run`，结束后自动报告退出码和日志尾部。
- `/bg` 选择任务，`/bg bg1` 查看指定任务；退出面板用 `Esc`。
- 普通 Shell 命令运行超过约 2 分钟会自动转后台；运行中 `Ctrl+B` 可提前转后台。
- agent 可用 `bg_status` 检查、`bg_kill` 停止；不需要通过 Shell 反复轮询。
- 关闭 Pi 会停止这些任务；不能等同于长期驻留的 systemd 服务。

**【扩展】网页研究 `pi-web-agent`：**

- agent 使用 `web_explore` 搜索和阅读网页、PDF、GitHub 等；普通请求可直接说「查找……，并给出处」。
- `/web-agent` 打开菜单；`/web-agent doctor` 检查；`/web-agent settings` 设置。
- 默认 DuckDuckGo 搜索、HTTP 读取与本地浏览器渲染；本次未联网验证实际后端。
- 本机配置额外放行 `198.18.0.0/15` 和 `2001:2::/32` 两段基准测试地址；这不代表放行全部私网，亦未验证其实际用途。
- `agent-browser` 是另一项浏览器自动化 Skill，适合点击、填表等交互；不要与网页研究工具混淆。

### 3.7 旁支问题、审阅与辅助提示

| 功能 | 用法 / 限制 |
|---|---|
| 临时旁支问答 | `/btw 问题` 或 `/btw`；默认沿用主模型与推理级别，不执行工具 |
| 带回答回主对话 | BTW 界面 `Ctrl+R`；选择内容后填入主输入框，不自动提交 |
| 退出旁支 | BTW 界面 `Ctrl+C`；完成过的交流仅在当前扩展实例内可恢复 |
| 更新旁支上下文 | BTW 界面通常为 `F9`，先预览再确认；没有自动同步 |
| 浏览器批注代码改动 | `/feedback`，也可 `/feedback dev` 指定比较分支；依赖 Git 仓库 |
| 下一问建议 | 空输入框显示灰字，`Tab` / `→` 接受，`Esc` 隐藏 |
| 回来后快速回顾 | `/recap`；满足条件时，任务结束约 3 分钟后自动生成 |
| 风险小提醒 | `pi-heads-up` 在工具任务后按需显示，不保证每次出现 |

**额外模型请求：** 下一问建议、回顾和 heads-up 会使用模型生成内容，通常复用缓存，但不意味着免费；旁支问答和子代理也会产生独立的模型消耗。

### 3.8 子代理与 Skills

**【扩展】`pi-subagents`** 提供子代理；不是 Pi 核心自动存在的能力。可以直接请求：

```text
用 scout 梳理登录模块的数据流。
让 reviewer 只读审查当前 diff。
让 oracle 挑战这个方案的假设，先不要改代码。
```

- `/subagents-fleet`：看运行中的子任务；`/subagents-stop`：选择停止任务。
- `/subagents-doctor`：诊断；`/subagents-guide`：当前安装版指南。
- 常见角色：`scout`、`worker`、`reviewer`、`oracle`；研究类角色可能还有额外工具依赖。
- 当前模型按需暴露 `subagents_enable`，启用后再使用完整子代理工具；安装不等于自动启动子代理。
- 当前协作规则要求有明确委派授权；任务复杂本身不是启动子代理的理由。
- 父会话 `Esc` 会停止前台子任务，后台子任务仍可能继续；不要将它当作「停止所有工作」。
- 当前没有发现 `~/.pi/agent/extensions/subagent/config.json`，不应把配置示例中的 `Ctrl+B` 脱离子任务当成已启用快捷键。

**Skills** 是按需读取的工作说明，不等于安装后立即可用的外部服务。用 `/skill:名称` 显式调用，例如：

```text
/skill:brainstorming 先讨论这个功能的目标和范围
/skill:systematic-debugging 排查这个测试失败
```

本机资源包括：Superpowers（需求讨论、计划、TDD、调试、验证等）、`agent-browser`、`find-skills`、`last30days`、Google 的 `gccli` / `gdcli` / `gmcli`、子代理相关 Skills。

用户 skills 目录还存在 `grill-me`、`handoff`、`teach`、`wait-what` 的有效符号链接；目录存在不保证每个都出现在本次会话菜单，以 `/skill:` 补全和启动诊断为准。Google 登录与各 Skill 所需外部依赖未在本次测试。

### 3.9 LSP 定向诊断

**【扩展】** `/lsp` 查看服务器命令；agent 用 `lsp_diagnostics` 做诊断，用 `lsp_fix` 执行支持的源码修复或 import 整理。

本机 `~/.pi/agent/pi-lsp.json`：超时 `30000ms`，配置了以下服务器。

| 服务器 / 命令 | 文件类型 |
|---|---|
| `typescript-language-server --stdio` | TS / JS 系列 |
| `biome lsp-proxy` | JSON、CSS、GraphQL、HTML、Vue、Astro、Svelte |
| `ty server` | Python |
| `ruff server` | Python |
| `rust-analyzer` | Rust；额外 `pullDiagnosticsGraceMs: 5000` |
| `gopls` | Go |
| `yaml-language-server --stdio` | YAML |
| `bash-language-server start` | sh、bash、zsh、ksh |

8 个可执行入口均在 PATH 中找到；**未逐一验证服务器启动、工具链及项目诊断效果**。

Python 同时匹配 ty 与 Ruff，诊断默认可选两者；修复应明确需要的 server。`lsp_fix` 默认预览、不落盘，写入需 `write: true`。LSP 按调用启动和关闭，不是持续监测，也不能代替项目正式测试、lint 和构建。

## 4. 常用快捷键

### 4.1 核心操作（Linux）

> 主输入框、会话选择器、搜索框和弹窗可能对同一个按键赋予不同作用；下表以主界面为主。

| 快捷键 | 功能 / 当前环境注意事项 |
|---|---|
| `Enter` | 提交；忙碌时可作为 steering |
| `Shift+Enter` / `Ctrl+J` | INSERT 下换行 |
| `Tab` | 补全；有下一问建议时可接受建议 |
| `Esc` | 原生中断 / 取消；当前需考虑 Vim 模式 |
| `Ctrl+C` | 原生清空输入，再次按退出；有选区或弹窗时可能先复制 / 取消 |
| `Ctrl+D` | INSERT 下向前删除，空输入时退出；**NORMAL 下变为 Vim 半页移动，不退出** |
| `Ctrl+L` | 打开原生模型选择器 |
| `Ctrl+P` / `Ctrl+Shift+P` | 下一个 / 上一个限定范围模型；EX 模式下 `Ctrl+P` 用于命令历史 |
| `Shift+Tab` | 循环推理级别 |
| `Ctrl+T` | 折叠 / 展开推理内容 |
| `Ctrl+O` | 折叠 / 展开工具输出；会话树中用于切换过滤器 |
| `Ctrl+G` | 外部编辑器；搜索状态下可能用于下一个匹配 |
| `Ctrl+X` | 复制最后回复；会话树中复制选中消息等 |
| `Ctrl+V` | Pi 剪贴板粘贴，依赖宿主支持 |
| `Alt+Enter` / `Alt+↑` | 追加 follow-up / 取回排队消息 |
| `Ctrl+Z` | 挂起整个 Pi 进程，Shell 用 `fg` 恢复；**不是撤销** |
| `Ctrl+Shift+M` | **【扩展】** 打开 `/pick` 收藏模型选择器 |
| `Ctrl+B` | **【扩展】** 有运行中 Shell 时提前转后台；否则 INSERT 通常左移，NORMAL 通常 Vim 上翻页 |
| `Ctrl+Shift+T` | **【Pi-Bolt 专属】** 折叠 / 展开 Todo 面板 |

### 4.2 INSERT 下编辑文本

| 快捷键 | 功能 |
|---|---|
| `Ctrl+A` / `Ctrl+E` | 行首 / 行尾 |
| `Ctrl+←` / `Ctrl+→` | 按单词移动；部分场景全屏消息跳转会优先处理 |
| `Alt+B` / `Alt+F` | 按单词左移 / 右移 |
| `Ctrl+W` / `Alt+Backspace` | 删除前一个词 |
| `Ctrl+U` / `Ctrl+K` | 删除到行首 / 行尾 |
| `Ctrl+Y` / `Alt+Y` | 恢复最近删除文本 / 轮换删除历史 |
| `Ctrl+-` | 原生编辑撤销 |
| `↑` / `↓` | 移动光标，在输入边界可浏览历史提示词 |

这些是 Pi 的 readline 风格绑定，不是完整 Vim Insert 控制键集。

### 4.3 Vim NORMAL / VISUAL

| 按键 | 功能 |
|---|---|
| `Esc` / `Ctrl+[` | INSERT → NORMAL；VISUAL → NORMAL；空闲 NORMAL 再按传给 Pi |
| `i` / `a` | 当前光标前 / 后开始输入 |
| `I` / `A` | 行首非空白处 / 行尾开始输入 |
| `o` / `O` | 下方 / 上方新建一行并输入 |
| `h j k l` | 左、下、上、右；首尾逻辑行的裸 `k/j` 可进入提示词历史 |
| `w b e` | 单词前进、后退、词尾 |
| `0` / `^` / `$` | 行首 / 首个非空白字符 / 行尾 |
| `gg` / `G` / `25gg` | 输入开头 / 结尾 / 第 25 行 |
| `dd` / `2dw` | 删除一行 / 两个词 |
| `ciw` / `ci"` | 修改词内 / 双引号内内容 |
| `yy` / `p` / `P` | 复制一行 / 光标后粘贴 / 光标前粘贴 |
| `u` / `Ctrl+R` / `.` | 撤销 / 重做 / 重复上次修改 |
| `v` / `V` | 字符 / 整行选择；`y` 复制，`d` 删除，`c` 修改 |
| `Ctrl+D` / `Ctrl+U` | 输入区域下 / 上半页移动 |
| `Ctrl+F` / `Ctrl+B` | 输入区域下 / 上整页移动；运行中 Shell 的后台转移可优先截获 `Ctrl+B` |
| `:tree` / `:model` | 从 EX 小命令行调用 Pi 对应 slash 命令，保留草稿 |
| `:!git status` | 执行 Shell，保留当前输入草稿 |
| `:q` / `ZZ` | 输入为空或纯空白时退出；不保存文件 |
| `:q!` / `ZQ` | 丢弃输入草稿强制退出 |

注意：默认复制、删除、修改会尽力同步系统剪贴板，`p/P` 也可能读取系统剪贴板。扩展不是完整 Vim：没有宏、命名寄存器、完整搜索或 `:w`、`:s` 等 Ex 语义。

### 4.4 全屏记录、列表与扩展界面

| 场景 | 快捷键 |
|---|---|
| 全屏记录翻页 | `PageUp` / `PageDown` |
| 跳到记录开头 / 末尾 | `Ctrl+Home` / `Ctrl+End` |
| 跳上一 / 下一标记消息 | `Ctrl+Shift+↑` / `Ctrl+Shift+↓`，也有 `Ctrl+↑/↓` 默认绑定 |
| 搜索屏幕记录 | `Ctrl+Shift+F`；`Enter` / `Shift+Enter` 下一 / 上一匹配，`Esc` 关闭 |
| 模型 / 推理选择器保存默认值 | `Ctrl+S`；模型扩展还可能自动记忆选择 |
| 会话选择器 | `Ctrl+R` 重命名，`Ctrl+P` 路径显示，`Ctrl+S` 排序，`Ctrl+N` 仅已命名过滤；`Ctrl+D` 删除会话 |
| 子代理 Fleet | `j/k` 选择，`J/K` 滚动，`x` / `Ctrl+O` 工具详情，`s` 发指导，`D` 确认后停止，`Esc` 关闭 |
| BTW | `Ctrl+R` 带回主对话，`Ctrl+C` 退出；分栏时通常 `F6` 切焦点，通常 `F9` 导入主线更新，冲突时有替代键 |

**终端注意：** 本次进程处于 tmux（`TERM=tmux-256color`）。tmux、终端应用及桌面可能截获 `Ctrl+B`、Shift 组合、Alt 组合；本次没有调整这些设置。组合键不生效时先看界面提示、`/hotkeys` 和终端键盘协议设置，不要直接认定 Pi 配置失效。

## 5. 当前扩展清单

以下是本机安装版本，不是最新版本承诺。

| 包 / 版本 | 作用 / 入口 |
|---|---|
| `pi-ansi-themes`（Git `210afa6`） | ANSI 主题，当前 `ansi-dark` |
| `pi-subagents` `0.87.0` | 子代理、工作流、Fleet；`/subagents-fleet` |
| `@narumitw/pi-usage` `0.69.2` | 用量与 Fast；`/usage`、`/fast` |
| `pi-vim` `0.16.0` | Vim 输入编辑器 |
| `@narumitw/pi-btw` `0.63.6` | 旁支问答；`/btw` |
| `@narumitw/pi-lsp` `0.49.12` | 定向诊断和源码修复；`/lsp` |
| `@narumitw/pi-tool` `0.4.2` | 工具目录；`/tool`，仅浏览、不启用或执行工具 |
| `pi-background` `0.4.2` | 后台命令；`/bg` |
| `pi-checkpoints` `0.1.1` | 配合 `/tree`、`/fork` 恢复受跟踪文件 |
| `pi-feedback` `0.1.0` | 浏览器代码批注；`/feedback` |
| `pi-model-pick` `0.2.0` | 收藏、最近模型；`/pick`、`/fav` |
| `pi-next-prompt` `0.1.3` | 下一问建议 |
| `pi-away` `0.1.4` | 离开后回顾；`/recap` |
| `pi-heads-up` `0.1.4` | 任务后的风险提示 |
| `pi-cc-extensions` **`1.0.11` 固定版本** | CC 风格渲染、状态栏、上下文查看；`/ccstyle`、`/context` |
| `@demigodmode/pi-web-agent` `1.17.0` | 网页研究；`web_explore`、`/web-agent` |
| `superpowers`（Git `22f0b46`） | Skills 与流程引导，不是 Pi-Bolt 独有 |
| **【Pi-Bolt 专属】** `opensec-pi-todo` **`2.13.1` 固定版本** | agent 的 `todo` 工具、任务面板、`/todos` |
| **【Pi-Bolt 专属】** `opensec-pi-fff` **`0.11.0` 固定版本** | `fffind`、`ffgrep` 和 `@` 补全 |

当前 CC 界面配置：`mode=compact`、隐藏启动页、启用上下文命令与会话引用、单行自定义 footer，显示模型、上下文、缓存、速率、费用、用量、Git、目录。Diff 为自动布局，宽度达到 120 列可并排显示，具体仍受终端限制。

存在 `pi-statusline.json`，但公共包列表没有 `@narumitw/pi-statusline`；**配置文件存在不等于该扩展正在使用**，当前明确配置的 footer 来自 CC 扩展。

## 6. Pi-Bolt 专属补充

### 6.1 Todo 与 FFF（当前环境专用包）

- `/todos` 查看任务；`Ctrl+Shift+T` 折叠面板。任务状态从会话工具记录恢复，可跨 `/reload`、上下文压缩；不是独立项目管理数据库。
- `/fff-health` 看索引及原生引擎状态；`/fff-rescan` 重扫；`/fff-mode tools-and-ui` 是默认模式，另有 `tools-only` 和 `override`。
- `fffind` 按路径模糊搜索或 glob 匹配；`ffgrep` 搜索文件内容，支持路径约束和分页。
- 两个 OpenSec 包都要求 Bun；当前不由 Node 版 Pi 加载。若要给 Node Pi 提供同类功能，需要另外评估对应 Node 兼容包，不要直接把这两项搬入公共列表。
- 本机没有 Todo 自定义配置，因此面板按默认最多 12 行、默认折叠键运行。

### 6.2 编译、协议与远程控制

| 项目 | 当前状态 / 用法 |
|---|---|
| 扩展 AOT 编译 | `pi-bolt compile --status`：当前没有编译内置扩展；`compile --list` 可只看候选项 |
| 诊断 | `pi-bolt doctor` 输出安装诊断；分享前检查路径和环境信息 |
| ACP / MCP server 模式 | CLI 额外支持 `--acp`、`--mcp`；未验证实际编辑器 / 客户端连接 |
| 手机远程控制 | `pi-bolt remote-control status` 实测为 **off**；本次未配对或打开监听，历史配对状态未检查 |
| 旧版本目录 | `~/.pi-bolt/pi-bolt-linux-x64.previous/` 存在，不代表已验证可回退 |

注意：普通 Pi 也支持**连接 MCP 服务器**（`/mcp`、`pi mcp`）；这里标注的是 Pi-Bolt CLI 将**自身作为 MCP server** 的能力，不是说 MCP 客户端只能用 Pi-Bolt。

`pi-bolt compile` 会下载构建资料并替换当前二进制；远程控制涉及端口、隧道、手机读取本地会话与文件。**本次仅核查状态，没有编译、启用服务或改网络设置。** 需要使用时再评估权限、备份和回退，不在笔记生成过程中顺便开启。

## 7. 配置文件与资料索引

以下 `~` 均指 `/home/errorichard`。

| 路径 | 用途 / 本次状态 |
|---|---|
| `~/.pi/agent/settings.json` | 两程序共享设置，含 Pi-Bolt overlay |
| `~/.pi/agent/APPEND_SYSTEM.md` | 中文协作、文件组织、风险与恢复要求；影响默认工作方式 |
| `~/.pi/agent/auth.json` | 凭据，**不要粘贴或公开**；本笔记未复制其内容 |
| `~/.pi/agent/models-store.json` | 模型目录缓存；存在，不是手工 `models.json` 的替代示例 |
| `~/.pi/agent/models.json` | 自定义端点、模型与覆盖；本次不存在 |
| `~/.pi/agent/keybindings.json` | 自定义核心快捷键；本次不存在 |
| `~/.pi/agent/mcp.json` | 用户 MCP 服务器；本次不存在 |
| `~/.pi/agent/pi-lsp.json` | LSP 服务器映射 |
| `~/.pi/agent/pi-cc-extensions.json` | CC 渲染、Diff、footer 设置 |
| `~/.pi/agent/pi-statusline.json` | 遗留或备用状态栏配置，未确认有消费者 |
| `~/.pi/agent/model-picker-state.json` | 模型收藏与最近使用记录 |
| `~/.pi/agent/extensions/pi-web-agent/config.json` | 网页研究配置 |
| `~/.pi/agent/extensions/subagent/config.json` | 子代理自定义配置位置；本次不存在 |
| `~/.pi/agent/skills/`、`~/.agents/skills/` | 用户 Skills；含符号链接与资源目录 |
| `~/.pi/agent/npm/node_modules/` | 已安装 npm 包及各自 README |
| `~/.pi/agent/git/` | Git 来源包，如 Superpowers、ANSI themes |
| `~/.pi/agent/sessions/` | 会话记录，可能含私密内容 |
| `~/.pi/agent/checkpoints/` | 检查点文件快照 |
| `~/.config/rpiv-todo/config.json` | **【Pi-Bolt 专属包】** Todo 可选配置；本次不存在 |
| `~/.pi-bolt/pi-bolt-linux-x64/docs/` | 当前 Pi-Bolt 随附文档 |
| `~/.local/lib/node_modules/@earendil-works/pi-coding-agent/docs/` | 当前 npm Pi 随附文档 |

MCP 内建支持仍可用，但当前用户目录和核查工作目录没有 `mcp.json`，不能把「具备 MCP 能力」写成「已连接 MCP 服务」。

## 8. 维护、核查与安全

### 8.1 只读检查命令

```bash
command -v pi pi-bolt
pi --version
pi-bolt --version
pi list
pi-bolt list
pi --help
pi-bolt --help
pi update --help
pi-bolt update --help
pi-bolt compile --status
pi-bolt remote-control status
```

会话内常用检查：`/hotkeys`、`/tool`、`/lsp`、`/context`、`/subagents-doctor`；**【Pi-Bolt 专属】**另有 `/todos`、`/fff-health`。部分诊断或状态页可能展示本地信息，分享前检查。

### 8.2 更新（以下仅为参考，本次未执行）

```bash
# 更新各自程序，不能混用
pi update
pi-bolt update

# 更新扩展；公共包会影响两套程序
pi update --extensions
pi-bolt update --extensions

# 刷新模型目录
pi update --models
```

- **Pi-Bolt 应使用 `pi-bolt update`**。上游 README 中安装 / 更新 Pi 的命令不会替你正确更新 Pi-Bolt。
- 固定版本包应保留其版本约束，不把「更新扩展」理解为自动升级所有 pin 到最新。
- 更新前备份必要配置、核对兼容性；会话中用 `/reload` 或重启加载新资源。运行中的后台任务和子代理可能受重载、退出影响。
- **【Pi-Bolt 专属】** `pi-bolt update --rollback` 可交换到上次替换的构建；不能撤销共享配置、npm 包或用户文件变更，也未在活动环境试回滚。

### 8.3 环境核查边界与笔记维护

**已核实：** 命令路径、版本、实际包列表及版本、关键配置、无自定义核心 keybindings、8 个 LSP 入口可发现、Pi-Bolt 无内置编译扩展、远程控制关闭。

**未实测：** 每个 TUI 按键、模型请求、计费与额度、逐个 LSP 项目诊断、网页后端、剪贴板、Google 授权、子代理执行、检查点恢复、远程接入和二进制回退。包已安装不代表所有功能都已验证正常。

环境核查只读取配置和运行检查命令，没有主动修改 Pi / Pi-Bolt 配置、安装或升级包、开启服务，也没有直接读取或复制认证文件内容。CLI 自身的缓存 / 运行状态不作为不可变保证。

本文暂存于 Quartz 的 `content/常用工具/pi-agent.md`，分类入口位于 `content/常用工具/index.md`，以后再进一步整理。原路径 `content/ai-agents/pi-agent.md` 已迁至此处，旧网址通过 `aliases` 保留跳转。只撤销这篇站点笔记时，移除文章和分类入口后重新构建发布即可，不涉及 Pi 运行环境回滚；恢复前先核对后续内容修改。

### 8.4 内容来源

- 两套本机 CLI 的 `--version`、`--help`、`list`、`update --help`。
- Pi-Bolt 的 `compile --status`、`remote-control status`。
- 两套随附文档：`configuration.md`、`settings.md`、`usage.md`、`slash-commands.md`、`keybindings.md`；另参考 Pi-Bolt `PLUGINS.md`、`remote-control.md`、`mcp.md`、`skills.md`。
- 上述配置文件；各已安装包的 README；Vim、后台、模型选择和 Superpowers 的相关实现；子代理的配置、可观测性说明。
- Pi-Bolt 项目：<https://github.com/opensec-git/Pi-Bolt>。

环境更新后，优先以**当前 CLI 帮助、当前安装版文档和会话菜单**重新核对，而不是把本文当作永久不变的快捷键规范。
