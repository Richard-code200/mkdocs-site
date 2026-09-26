# 第 5 项：中文站点标识实施计划

> **执行要求：**先阅读设计文档；原生执行使用 `superpowers:executing-plans`，若用户明确选择分代理执行则使用 `superpowers:subagent-driven-development`；逐项勾选步骤。第 2 项确认完成后执行本计划；完成后才开始第 6 项。

**目标：**统一博客名称、页面语言和搜索界面文案，提供不返回 404 的本地图标。

**架构：**通过 `theme.custom_dir: overrides` 覆盖 `terminal` 的少量 Jinja 块、搜索文案片段和按钮宏；只保留一枚自带的 SVG 图标，不复制整个主题。

**技术栈：**MkDocs 1.6.1、`terminal` 4.8.0、Jinja 模板、SVG。

**设计文档：**`plans/2026-09-26-mkdocs-site-improvements-design.md` 的“5. 标题、语言与图标”。

## 全局约束

- 顺序固定为 **2 → 5 → 6 → 4 → 1 → 3**；不得提前改第 6、4、1、3 项。
- 保留 `terminal` 与 `gruvbox_dark`，不复制整份 `base.html`；文案及代码注释用简体中文。
- 内置英文搜索配置不变，第 1 项才处理中文检索。
- 仅 `mkdocs build` 是正式构建验证；浏览器仅检查生成页面行为。

## 重点复核

1. 首页与深层文章的 `<html lang="zh-CN">`：任务 1 步骤 4 检查。
2. 本地图标在深层文章使用正确的相对路径且返回 200：任务 1 步骤 4 检查。
3. 生成页面不再引用主题默认的六种缺失图标：任务 1 步骤 4 检查。
4. 搜索弹窗的标题、占位提示和关闭按钮的无障碍名称均为中文：任务 2 步骤 4 检查。
5. 顶部搜索入口与英文 `Cargo` 搜索仍能使用：任务 2 步骤 4 检查。

---

### Task 1：页面标题、语言与单一图标

**文件：**修改 `mkdocs.yml:1,69-74`；新建 `overrides/main.html`、`docs/img/favicon.svg`。

**接口：**`overrides/main.html` 继承主题的 `base.html`，仅覆盖 `site_lang` 和 `favicon` 块；MkDocs 将 `docs/img/favicon.svg` 复制到站点 `img/`。

- [ ] **步骤 1：记录现状。**运行 `mkdocs build` 并检查 `site/index.html` 和 `site/Rust/所有权/index.html`；预期尚有 `lang="en"`、`My Mkdocs Site` 和指向不存在图标的 `<link>`。

```sh
mkdocs build
```

- [ ] **步骤 2：改站点配置。**设置 `site_name: 王佳贤的个人博客`；在 `theme` 下加 `custom_dir: overrides`，删除不起作用的 `language: zh`，但暂时不动第 6 项的 `features`。

```yaml
site_name: 王佳贤的个人博客
theme:
  name: terminal
  palette: gruvbox_dark
  custom_dir: overrides
  features:
    - navigation.tabs
```

- [ ] **步骤 3：增加最小模板覆盖与图标。**使用主题已提供的块名及 MkDocs 的 `url` 过滤器；SVG 只使用路径与纯色，不依赖中文字体。

```jinja2
{% extends "base.html" %}
{% block site_lang %}lang="zh-CN"{% endblock site_lang %}
{% block favicon %}<link rel="icon" type="image/svg+xml" href="{{ 'img/favicon.svg' | url }}">{% endblock favicon %}
```

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="王佳贤的个人博客">
  <rect width="64" height="64" rx="8" fill="#282828" />
  <path d="M16 19 L29 32 L16 45 M33 45 H49" fill="none" stroke="#fabd2f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
</svg>
```

- [ ] **步骤 4：构建并检查两层页面。**运行 `mkdocs build`；预期首页与 `/Rust/所有权/` 均为 `zh-CN`，浏览器标题含中文博客名，`img/favicon.svg` 可加载，没有旧的 `img/favicon-*.png` / `img/android-chrome-*.png` 链接。

```sh
mkdocs build
```

- [ ] **步骤 5：只提交本任务文件。**

```sh
git add mkdocs.yml overrides/main.html docs/img/favicon.svg
git commit -m '统一博客名称、页面语言和图标'
```

### Task 2：搜索入口与弹窗中文化

**文件：**新建 `overrides/partials/search/modal.html`、`overrides/macros/top-nav/search-button.j2`。

**接口：**主题 `partials/search/modal.html` 创建 `search_modal_ns` 后包含 `partials/search/mkdocs/search-modal.html`；顶部 `partials/top-nav/search-button.html` 导入 `make_search_button(idx_in_menu)`。沿用这两个名称，不改搜索输入框的 `mkdocs-search-query` 标识。

- [ ] **步骤 1：记录现状。**本地预览首页，当前顶部入口与弹窗分别显示 `Search`、`Type to start searching`、`Close`。

- [ ] **步骤 2：用同名局部模板设置中文字符串。**以下属性名与主题原有模板一致；不得重写弹窗完整 DOM。

```jinja2
{% set search_modal_ns = namespace() %}
{% set search_modal_ns.header = "搜索" %}
{% set search_modal_ns.instructions = "输入关键词开始搜索" %}
{% set search_modal_ns.no_results = "未找到匹配的笔记" %}
{% set search_modal_ns.prompt = "搜索笔记" %}
{% set search_modal_ns.tooltip = "输入关键词搜索笔记" %}
{% set search_modal_ns.screen_reader_close_text = "关闭" %}
{% set search_modal_ns.close_text = "×" %}
{% include "partials/search/mkdocs/search-modal.html" %}
```

- [ ] **步骤 3：覆盖顶部搜索按钮宏。**保留原按钮的 Bootstrap 属性和 schema.org 结构，只修改显示文案。

```jinja2
{% macro make_search_button(idx_in_menu) %}
<li property="itemListElement" typeof="ListItem">
  <a href="#" class="menu-item" data-toggle="modal" data-target="#mkdocs_search_modal" property="item" typeof="SearchAction">
    <i aria-hidden="true" class="fa fa-search"></i> <span property="name">搜索</span>
  </a>
  <meta property="position" content="{{ idx_in_menu }}">
</li>
{% endmacro %}
```

- [ ] **步骤 4：构建与人工检查。**运行 `mkdocs build`；在首页和文章页打开搜索弹窗，检查中文文案、焦点、关闭按钮。用真实按键输入英文 `Cargo`，确认原有英文搜索仍返回结果（自动化工具的 `fill`/`type` 不触发主题的 `keyup`，不可据此判断搜索失效）。

```sh
mkdocs build
```

- [ ] **步骤 5：只提交本任务文件。**

```sh
git add overrides/partials/search/modal.html overrides/macros/top-nav/search-button.j2
git commit -m '翻译终端主题的搜索界面'
```
