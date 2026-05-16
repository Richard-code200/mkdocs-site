# AGENTS.md

## AI 行为准则

- **所有输出必须使用简体中文**，包括思考过程、代码注释、commit message 等
- 专有名词和技术术语可保留英文（如 Rust、MkDocs、highlight.js）

## 技术栈

- **MkDocs** + **`terminal`** 主题（**不是** `mkdocs-material`），配色 `gruvbox_dark`
- 所有文档使用简体中文编写
- 部署地址：`https://richard-code200.github.io/mkdocs-site/`

## 命令

```sh
mkdocs build              # 构建站点到 site/ 目录（唯一的验证方式）
mkdocs gh-deploy --force  # 部署到 gh-pages 分支
```

本项目无 linter、无测试套件 —— `mkdocs build` 是验证修改的唯一途径。

## 关键配置要点

- **`mkdocs.yml` 中无 `nav` 配置** —— 导航由 `docs/` 目录结构自动生成
- **代码块语言标签必须小写**（如 `rust` 而非 `Rust`），否则 highlight.js 无法识别
- **Callout 语法** 使用 `///` 块（pymdownx.blocks.details），**不是** Material 主题的 `!!! note`：

  ```markdown
  /// info | 标题
  内容
  ///
  ```

  有三种类型：`info`、`warning`、`important`

- **行内高亮**：`#!rust 代码`（inlinehilite）、`==高亮==`（mark）、`~~删除~~`（tilde）、`^上标^`（caret）
- 代码块高亮使用 highlight.js（通过 CDN 加载 + `docs/add_hljs_highlight.js`）
- `site/` 目录已加入 .gitignore

## 部署

- 推送到 `main` 分支时通过 GitHub Actions 自动部署（`.github/workflows/publish.yml`）
- CI 流程会同时安装 `mkdocs-material` 和 `mkdocs-terminal`，但实际只使用 `terminal`
- 通过 `mkdocs gh-deploy --force` 部署
