# 第 3 项：代码行号无障碍实施计划

> **执行要求：**先阅读设计文档；原生执行使用 `superpowers:executing-plans`，若用户明确选择分代理执行则使用 `superpowers:subagent-driven-development`；逐项勾选步骤。第 1 项完成后最后执行本计划。

**目标：**消除代码行生成的空名称、可被 Tab 聚焦的锚点，保留高亮和复制代码功能。

**架构：**只关闭 `pymdownx.highlight` 的行号锚点配置，不重写代码块模板或复制按钮逻辑。

**技术栈：**MkDocs 1.6.1、pymdown-extensions 10.21.2、Pygments、现有 `copy_code.js`。

**设计文档：**`plans/2026-09-26-mkdocs-site-improvements-design.md` 的“3. 代码行号无障碍”。

## 全局约束

- 顺序固定为 **2 → 5 → 6 → 4 → 1 → 3**；这是最后一项，前五项都应已构建检查。
- 保留 `terminal`、`gruvbox_dark`、Pygments 高亮及代码复制按钮。
- 不新增测试套件或 linter；唯一正式构建验证是 `mkdocs build`，浏览器用于交互抽查。
- 不改已有笔记正文、代码示例或站点首页文案。

## 重点复核

1. “所有权”页原先约 174 个 `#__codelineno-*` 空链接应消失：任务 1 步骤 3 检查。
2. Tab 进入代码区时不逐行停在无名称链接上：任务 1 步骤 3 检查。
3. Rust 高亮样式仍是 gruvbox，代码没有退化为普通段落：任务 1 步骤 3 检查。
4. 复制按钮仍出现，复制内容不带行号或按钮文案：任务 1 步骤 3 检查。
5. Markdown 笔记中的普通代码块与章节锚点仍正常：任务 1 步骤 3 检查。

---

### Task 1：关闭代码行锚点

**文件：**修改 `mkdocs.yml:81-83`。

**接口：**只调整 `pymdownx.highlight.anchor_linenums`，继续使用原有 `pygments_lang_class`、`docs/code_gruvbox.css` 和 `docs/copy_code.js`。

- [ ] **步骤 1：记录可复现基线。**运行 `mkdocs build`，打开 `/Rust/所有权/`；原页面包含大量无名称行号链接，连续按 Tab 可以在代码行之间移动。记录页面代码块外观与复制按钮。

```sh
mkdocs build
```

- [ ] **步骤 2：关闭锚点而不是关闭高亮。**保留 `pygments_lang_class`：

```yaml
  - pymdownx.highlight:
      anchor_linenums: false
      pygments_lang_class: true
```

- [ ] **步骤 3：构建并检查所有五项复核点。**运行 `mkdocs build`；在“所有权”和 Markdown 速查表中检查生成页面的代码、按钮和焦点，确认 `#__codelineno-*` 不再出现在可聚焦链接中。不要用截图上看不到行号来代替键盘检查。

```sh
mkdocs build
```

- [ ] **步骤 4：只提交本项文件。**

```sh
git add mkdocs.yml
git commit -m '移除代码行的空名称焦点链接'
```

## 六项最终验收

- [ ] 在上述单项构建全部通过后，再运行一次完整的 `mkdocs build`；在 375×812 与桌面宽度抽查首页及长篇文章，确认移动目录、中文标题和语言、本地图标、导航顺序、英文与中文搜索、代码焦点都仍符合设计文档。
- [ ] 查看 `git status --short`，确认只有预计修改；未检查线上部署前不要宣称线上已经修复。
