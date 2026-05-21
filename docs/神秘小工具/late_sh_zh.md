# late.sh

> 一个舒适的终端开发者俱乐部。Lo-fi 音乐、休闲游戏、聊天和科技新闻，全部通过 SSH 访问。

```bash
ssh late.sh
```

`late.sh` 是一个终端优先的社交应用：实时聊天、音乐、游戏、新闻、个人资料，以及一个你可以通过任何 SSH 客户端进入的始终在线的共享空间。

## 项目状态

本仓库是 `late.sh` 的主要代码库。

- 项目开放供源码阅读、本地开发、审计和贡献。
- 公开托管的 `late.sh` 服务仍然是官方部署。
- 在 FSL 保护期内，代码为源码可见（source-available），非 OSI 开源许可。

## 功能包含

- 包含仪表盘、聊天、个人资料、新闻和街机界面的 SSH TUI
- 实时全球聊天和共享活动动态
- 通过 Icecast/Liquidsoap 实现的音频流，支持浏览器与 CLI 配对
- 终端游戏，包括 2048、数独、Nonograms、扫雷和纸牌
- 用于着陆页、连接流程和配对客户端体验的 Web 前端
- 用于本地音频播放和同步可视化数据的伴随 CLI 工具

## 工作空间

这是一个包含四个 crate 的 Rust 工作空间：

| Crate       | 职责                                             |
| ----------- | ------------------------------------------------ |
| `late-cli`  | 用于本地音频播放、配对控制和可视化同步的伴随 CLI |
| `late-core` | 共享领域代码、数据库层、迁移和基础设施辅助工具   |
| `late-ssh`  | SSH 服务器和终端 UI 应用                         |
| `late-web`  | Web 服务器、着陆页、连接流程和浏览器配对         |

技术栈由 PostgreSQL、Icecast 和 Liquidsoap 支持。

## 快速开始

试用线上服务：

```bash
ssh late.sh
```

自行运行（需要 Docker）：

```bash
git clone https://github.com/mpiorowski/late-sh
cd late-sh
make start
```

然后连接到你的本地实例：

```bash
ssh localhost -p 2222
```

就这么简单。PostgreSQL、Icecast 和 Liquidsoap 都会自动启动。

## 伴随 CLI

安装伴随 CLI 以获取本地音频播放和同步可视化功能：

macOS / Linux / Termux：

```bash
curl -fsSL https://cli.late.sh/install.sh | bash
```

在 Termux 上，安装脚本会获取 Android CLI 构建版本，而非 GNU/Linux 版本。

Windows PowerShell（x64）：

```powershell
irm https://cli.late.sh/install.ps1 | iex
```

Nix / NixOS：

```bash
nix run github:mpiorowski/late-sh#late
```

或从源码构建：

```bash
mise install        # 可选 — 配置所需的 Rust 工具链
cargo build --release --bin late
```

## 本地开发

如果不想用 Docker 包裹 Rust 构建过程，可以在 Docker 中运行基础设施组件，而应用本体则在本地原生运行：

```bash
docker compose up -d postgres icecast liquidsoap
cargo run -p late-ssh
cargo run -p late-web
```

本地主机开发可以使用 Cargo 的正常默认配置，包括标准的仓库本地 `target/` 目录。`/app/target` 路径仅用于 Docker/开发容器。

```bash
export CARGO_HOME=$HOME/.cargo
```

使用 `mise install` 获取所需的 Rust 工具链、`mold` 链接器和 `cargo-nextest`。

## 验证

提交 PR 之前运行：

```bash
make check
```

这将运行 `cargo fmt --check`、`cargo clippy` 和 `cargo nextest`。
部分集成测试需要通过 testcontainers 使用 Docker。

## 贡献

欢迎贡献，但请先阅读项目政策：

本仓库使用 DCO 签名提交：

```bash
git commit -s
```

如果你分发 fork 版本，请勿将其宣称为官方的 `late.sh` 服务，或擅自使用项目品牌。

## 更多上下文
