# 王佳贤的个人博客

记录个人学习到的内容，和想记录的其他信息。

网站：<https://richard-code200.github.io/quartz-site/>

仓库：<https://github.com/Richard-code200/quartz-site>

现使用 **Quartz 4.5.2 + 定制首页**。首页采用已确认的“字形实验室”设计，文章页保留 Quartz 的目录、搜索、关系图、反向链接与悬浮预览；全站由同一个 Quartz 构建流程生成，不需要 Hugo 或 MkDocs。

## 本地运行

需要 Node.js 22、npm 10；静态验收使用 Python 3 标准库。

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci --no-audit --no-fund
npm run serve
```

打开 <http://localhost:8082/quartz-site/>。预览只监听本机，并使用与 GitHub Pages 一致的子路径；按 `Ctrl+C` 停止。

端口冲突时：`PORT=8083 npm run serve`。这是静态预览服务，修改后需重新构建 `.preview/` 并刷新，不会自动热更新：

```bash
QUARTZ_BASE_URL=localhost:8082/quartz-site npm run build -- --output .preview
```

本地预览会禁止索引，正式生产构建不会继承该限制。

## 构建和验证

```bash
npm run check
npm run build
npm run validate
npm test
```

生产文件在 `public/`，不纳入 Git。不要编辑构建产物，也不要再使用旧的 `mkdocs build`。

`SHARP_IGNORE_GLOBAL_LIBVIPS=1` 用于避免系统全局 libvips 触发 sharp 源码编译，不影响生成结果。

## 写笔记

- 内容在 `content/`，保留原站分类与文件名，例如 `content/Rust/所有权.md`。
- 文章开头使用 YAML 元数据：

```markdown
---
title: 笔记标题
tags: [Rust]
created: 2026-11-07
---

## 一个小节

正文……

> [!info] 提示
> 提示正文，可包含列表、代码块与表格。
```

- 文章标题由 `title` 渲染，正文从二级标题开始。
- 内部 Markdown 链接相对内容库根目录：`[所有权](Rust/所有权.md)`；也可使用 `[[Rust/所有权|所有权]]`。
- 新文章自动进入导航、搜索和关系图。旧站顺序记录在 `site.navigation.json`，调整它后运行 `python3 scripts/build_navigation.py`；未列入顺序表的新文章依然可见。
- 分类聚合页位于各目录 `index.md`。`content/笔记导航.md` 提供全部分类入口。
- 原首页的想法与学习计划保存在 `content/关于本站.md`。
- 首页卡片和最近随记由 Quartz 文章数据计算。新文章应提供 `created` 和合适的分类路径；`_original_note` 是旧站迁移标记，新笔记不需要添加。

### 首页与样式

- 首页组件：`quartz/components/HybridHome.tsx`。
- 首页样式：`quartz/components/styles/hybridHome.scss`。
- 页面布局：`quartz.layout.ts`；正文样式：`quartz/styles/custom.scss`。
- `content/index.md` 为首页搜索摘要与链接关系，修改首页入口时同步维护。
- Gruvbox 色板、Monaspice 和 Sarasa 字体均自托管，资源与许可证在 `quartz/static/`。
- 字体维护见 [`scripts/字体资源维护.md`](scripts/字体资源维护.md)。

## 旧网址兼容

普通文章同时有明确的 `.html` 文件，例如 `/Rust/所有权.html`。原 MkDocs 的 `/Rust/所有权/` 路径通过兼容页跳转，保留查询参数与标题锚点。

以上兼容均位于当前 `/quartz-site/` 项目路径下。GitHub 仓库更名并不自动保留原 Pages 的 `/mkdocs-site/` 前缀；若需要旧域名路径继续访问，必须另行配置跳转站或自定义域名，不能只依靠本站兼容页。

旧标题锚点通过 `LegacyAnchors` 注入，新的 Quartz 锚点也可以使用。原首页的旧标题链接会转至“关于本站”页的对应位置。

`migration/manifest.json` 保存 53 份原文的校验记录、758 个旧标题锚点与字体校验和。运行 `npm run validate` 可持续检查旧路径、锚点、资源与关系图。它不会把个人机器上的备份路径当作 CI 依赖。

## 部署

推送 `main` 后，`.github/workflows/publish.yml` 安装依赖、检查类型、构建并验收，再把 `public/` 发布到已有的 `gh-pages` 分支。保持 GitHub Pages 原有的分支发布设置即可。

仓库更名后，现行 Git 远程应为 `https://github.com/Richard-code200/quartz-site.git`；站点地址、页脚、RSS 与本机预览统一使用 `quartz-site`。生产验证会检查分享网址、站点地图和 RSS，防止旧项目路径残留。

本地修改不会自动推送。正式上线前先确认本地效果，再提交并推送到 `main`，由 GitHub Actions 完成构建与发布；远程发布结果以对应工作流运行记录为准。

## 迁移与回退

完整迁移说明见 [`migration/迁移说明.md`](migration/迁移说明.md)，包含原始备份位置、兼容方式与验收结果。`scripts/migrate_mkdocs.py` 仅用于首次从旧站备份导入，不应在日常维护中重复执行。

Quartz 的 MIT 许可证与版权说明保存在 `quartz/LICENSE.txt`；这不表示个人笔记也自动按 MIT 许可，详见 [`THIRD_PARTY.md`](THIRD_PARTY.md)。
