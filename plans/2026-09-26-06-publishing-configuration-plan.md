# 第 6 项：代码标签与发布配置实施计划

> **执行要求：**先阅读设计文档；原生执行使用 `superpowers:executing-plans`，若用户明确选择分代理执行则使用 `superpowers:subagent-driven-development`；逐项勾选步骤。第 5 项完成后执行本计划；完成后才开始第 4 项。

**目标：**统一代码块语言标签，让 CI 仅安装此站点实际需要且版本固定的依赖。

**架构：**不改变主题或部署方式；代码标签就地修正，发布所需 Python 包记录在根目录依赖清单，GitHub Actions 按此清单构建和部署。

**技术栈：**MkDocs 1.6.1、`terminal` 4.8.0、pymdown-extensions 10.21.2、GitHub Actions。

**设计文档：**`plans/2026-09-26-mkdocs-site-improvements-design.md` 的“6. 代码标签与发布依赖”。

## 全局约束

- 顺序固定为 **2 → 5 → 6 → 4 → 1 → 3**；保留前两项完成的模板覆盖和手机端导航。
- 保留 `main` 推送触发与 `mkdocs gh-deploy --force`；CI 不安装未使用的 `mkdocs-material`。
- 保留 `terminal` 和 `gruvbox_dark`；代码块语言标签使用小写。
- 不增加 linter 或测试套件；唯一正式构建验证为 `mkdocs build`。

## 重点复核

1. Markdown 示例与 C 示例仍显示为代码而非正文：任务 1 步骤 3 检查。
2. 三处语言标签都小写，Pygments 样式仍存在：任务 1 步骤 3 检查。
3. 新环境安装根目录依赖清单后可执行 `mkdocs build`：任务 2 步骤 4 检查。
4. CI 在 `main` 推送时先构建再部署，且没有 Material 安装：任务 2 步骤 4 检查。
5. 第 5 项的 `theme.custom_dir: overrides` 与搜索入口没有被误删：任务 2 步骤 4 检查。

---

### Task 1：统一语言标签

**文件：**修改 `docs/MarkDown/MarkDown.md:7,19,80`。

**接口：**Markdown 围栏语言名称交给现有的 `pymdownx.highlight` / Pygments，高亮仍由构建时生成。

- [ ] **步骤 1：确认现状。**查看三处围栏，当前分别为 `Markdown`、`Markdown`、`C`；其余正文和示例内容无需改写。

- [ ] **步骤 2：仅改围栏首行。**

````markdown
```markdown
# 一级标题 (对应 HTML h1)
```

```markdown
这是 **粗体** 文字
```

```c
#include <stdio.h>
```
````

- [ ] **步骤 3：构建验证并检查生成页面。**运行 `mkdocs build`，确认 `/MarkDown/MarkDown/` 中三处仍是有高亮的代码块。

```sh
mkdocs build
```

- [ ] **步骤 4：只提交这一篇。**

```sh
git add docs/MarkDown/MarkDown.md
git commit -m '统一代码块语言标签'
```

### Task 2：固定依赖并精简 CI

**文件：**新建 `requirements.txt`；修改 `mkdocs.yml:69-75`、`.github/workflows/publish.yml:12-18`。

**接口：**CI 通过 `pip install -r requirements.txt` 获取站点依赖；主题仍使用第 5 项的 `custom_dir: overrides`，不再携带无效的 `navigation.tabs`。

- [ ] **步骤 1：确认当前依赖。**本地已确认 `mkdocs 1.6.1`、`mkdocs-terminal 4.8.0`、`pymdown-extensions 10.21.2` 能运行项目；CI 目前无版本固定且额外安装 Material。

- [ ] **步骤 2：写依赖清单，移除主题无效选项。**`mkdocs.yml` 的 `theme` 部分保留如下结构，不动其他配置：

```text
mkdocs==1.6.1
mkdocs-terminal==4.8.0
pymdown-extensions==10.21.2
```

```yaml
theme:
  name: terminal
  palette: gruvbox_dark
  custom_dir: overrides
```

- [ ] **步骤 3：让发布工作流使用清单。**保留 `checkout@v4`、`setup-python@v4`、`main` 触发和发布权限；将 Python 版本从浮动 `3.x` 固定为 `3.12`，显式构建后再部署。

```yaml
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: mkdocs build
      - run: mkdocs gh-deploy --force
```

- [ ] **步骤 4：用清单创建临时环境并构建。**先运行当前环境的 `mkdocs build`，再在 `/tmp/opencode` 新建隔离环境按清单安装并构建；检查工作流仍在 `main` 推送触发、未含 `mkdocs-material`、没有改动部署命令，生成页面仍有第 5 项的中文标题与模板覆盖。不要在本地执行 `gh-deploy`。

```sh
mkdocs build
python3 -m venv /tmp/opencode/mkdocs-deps-verify
/tmp/opencode/mkdocs-deps-verify/bin/pip install -r requirements.txt
/tmp/opencode/mkdocs-deps-verify/bin/mkdocs build
```

- [ ] **步骤 5：只提交本任务文件。**

```sh
git add requirements.txt mkdocs.yml .github/workflows/publish.yml
git commit -m '固定站点依赖并精简发布工作流'
```
