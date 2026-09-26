# uv

uv 是一个用 Rust 编写的极快的 Python 包和项目管理器，由 [Astral](https://astral.sh)（Ruff 的开发者）出品。一个工具就能替代 `pip`、`pip-tools`、`pipx`、`poetry`、`pyenv`、`twine`、`virtualenv` 等多个工具，速度比 `pip` 快 10–100 倍。

/// info | 本机情况（2026-09）
- uv 0.12.9，安装在 `~/.local/bin/uv`
- 已安装 uv 托管的 Python 3.11.15（位于 `~/.local/share/uv/python`），系统另有 Python 3.14.7
- uv 默认优先使用托管的 Python，因此默认会选 3.11.15 而不是系统的 3.14.7
///

## 安装

macOS / Linux 使用官方独立安装脚本：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

也可以用 `pip install uv`、Homebrew 等方式安装，详见[官方安装文档](https://docs.astral.sh/uv/getting-started/installation/)。

## 管理 Python 版本

```bash
uv python install                 # 安装最新版
uv python install 3.12            # 安装指定版本
uv python install 3.11 3.12 3.13  # 一次安装多个版本
uv python list                    # 列出可用和已安装的版本
uv python list --only-installed   # 只列出已安装的版本
uv python find 3.12               # 打印解释器路径
uv python pin 3.12                # 在当前目录写入 .python-version，锁定版本
uv python uninstall 3.11          # 卸载
uv python upgrade 3.12            # 升级补丁版本（实验性功能）
```

/// info | 自动下载
不需要提前安装：当 `uv venv`、`uv run` 等命令需要某个版本而本机没有时，uv 会自动下载。由于 Python 官方不发布可分发二进制，uv 使用 [python-build-standalone](https://github.com/astral-sh/python-build-standalone) 项目提供的发行版。
///

其他要点：

- 托管 Python 安装在 `~/.local/share/uv/python`，不污染系统 Python，可用 `uv python uninstall` 干净删除
- uv 默认优先使用托管的 Python，想强制使用系统 Python 可加 `--python-preference only-system`
- `uv python install --default` 会额外安装 `python` / `python3` 到 PATH（实验性，可能遮蔽系统命令，谨慎使用）

## 项目管理

```bash
uv init demo          # 创建项目
cd demo
uv add requests       # 添加依赖：自动创建 .venv、解析、安装、写 uv.lock
uv run main.py        # 在项目环境中运行，无需 activate
```

`uv init` 生成的项目结构：

| 文件 | 作用 |
| --- | --- |
| `pyproject.toml` | 声明依赖和 `requires-python` |
| `uv.lock` | 跨平台锁文件，提交到 git，保证任何机器装出一致环境 |
| `.python-version` | 锁定本项目使用的 Python 版本 |
| `src/` | 源码目录 |
| `README.md` / `.gitignore` | 说明文件和忽略规则（会自动执行 `git init`） |

日常命令：

```bash
uv add requests          # 添加依赖
uv add --dev pytest      # 添加开发依赖
uv remove requests       # 删除依赖
uv lock                  # 只更新锁文件
uv sync                  # 按锁文件同步环境（拉取代码后的第一条命令）
uv run main.py           # 在项目环境中运行任意命令
uv tree                  # 查看依赖树
```

/// info | 不需要 activate
`uv run` 会自动处理虚拟环境，无需手动执行 `source .venv/bin/activate`。
///

## 单文件脚本

```bash
uv run hello.py                                     # 自动创建临时环境并运行
uv add --script hello.py requests                   # 把依赖写进脚本自身的内联元数据
uv run --with requests python -c "import requests"  # 临时带上依赖运行
```

## 命令行工具（pipx 替代）

```bash
uvx ruff check .          # 临时运行，用完即弃（等价于 uv tool run）
uv tool install ruff      # 持久安装
uv tool list              # 列出已安装的工具
uv tool upgrade --all     # 升级全部工具
```

工具安装在 `~/.local/share/uv/tools`，可执行文件链接到 `~/.local/bin`。

## 与 pip 兼容

```bash
uv venv --python 3.12                          # 创建虚拟环境
uv pip install requests                        # 用法与 pip 相同，速度快很多
uv pip freeze > requirements.txt
uv pip sync requirements.txt
uv pip compile requirements.in --output-file requirements.txt
```

老项目可以先用 `uv pip` 过渡，新项目建议直接使用 uv 的项目管理方式。

## 实用配置

### 国内镜像

在用户级配置 `~/.config/uv/uv.toml` 中配置（Windows 为 `%APPDATA%\uv\uv.toml`）：

```toml
[[index]]
url = "https://pypi.tuna.tsinghua.edu.cn/simple"
default = true
```

也可以只在单个项目里配置，在 `pyproject.toml` 中添加：

```toml
[[tool.uv.index]]
url = "https://pypi.tuna.tsinghua.edu.cn/simple"
default = true
```

或临时用环境变量：

```bash
UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple uv add requests
```

### 缓存与其他

- 升级 uv 本体：`uv self update`
- 缓存位于 `~/.cache/uv`，清理用 `uv cache prune`（清理无用缓存）或 `uv cache clean`（全部清空）
- 若缓存与目标目录不在同一文件系统，可能出现 hardlink 警告，可设置 `export UV_LINK_MODE=copy` 解决

## 起手式

```bash
uv init myproject --python 3.12 && cd myproject
uv add requests
uv run python main.py
```

## 参考资料

- [uv 官方文档](https://docs.astral.sh/uv/)
- [uv GitHub 仓库](https://github.com/astral-sh/uv)
