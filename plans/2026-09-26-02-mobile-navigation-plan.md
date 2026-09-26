# 第 2 项：移动端目录实施计划

> **执行要求：**先阅读设计文档；原生执行使用 `superpowers:executing-plans`，若用户明确选择分代理执行则使用 `superpowers:subagent-driven-development`；逐项勾选步骤。本计划完成并确认后，才开始第 5 项。

**目标：**窄屏打开笔记时先看到正文，完整侧栏由中文按钮展开，桌面导航不变。

**架构：**沿用现有分类折叠脚本，在主题侧栏前动态插入原生按钮；CSS 只在低于主题的 `70em` 单列断点时隐藏已初始化的侧栏。未执行脚本时保留原导航。

**技术栈：**MkDocs 1.6.1、`terminal` 4.8.0、原生 JavaScript 与 CSS。

**设计文档：**`plans/2026-09-26-mkdocs-site-improvements-design.md` 的“2. 移动端导航”。

## 全局约束

- 顺序固定为 **2 → 5 → 6 → 4 → 1 → 3**；本项完成后再开始第 5 项。
- 保留 `terminal` 主题与 `gruvbox_dark` 配色；代码注释和页面文案使用简体中文。
- 不增设测试套件或 linter；每项唯一正式构建验证为 `mkdocs build`，浏览器仅用于交互抽查。
- 不修改其他已存在的笔记；不把 `plans/` 放进站点导航。

## 重点复核

1. 375×812 直接打开“所有权”：正文标题应处于首屏；在步骤 5 检查。
2. 不执行 JavaScript：目录不得被 CSS 隐藏；在步骤 5 检查。
3. 键盘聚焦按钮、按 Enter、再次按 Escape：展开状态与 `aria-expanded` 一致；在步骤 5 检查。
4. 首页无当前分类：仍可通过按钮访问所有分类；在步骤 5 检查。
5. 1280 像素桌面以及从手机宽度切换到桌面：侧栏仍正常显示；在步骤 5 检查。

---

### 任务 1：窄屏目录按钮

**文件：**修改 `docs/collapse_nav.js:5-47`、`docs/collapse_nav.css:1-27`。

**接口：**读取主题提供的 `#terminal-mkdocs-side-panel`；在其前插入 `.mobile-nav-toggle[aria-controls="terminal-mkdocs-side-panel"]`；用 `body.mobile-nav-ready` 和 `body.mobile-nav-open` 表示初始化与打开状态。现有 `.terminal-mkdocs-side-nav-li` 分类折叠功能保持不变。

- [ ] **步骤 1：记录改动前的可复现状态。**运行 `mkdocs build`，本地预览 `site/`，在 375×812 打开 `/Rust/所有权/`；当前正文在首屏以外。确认 1280 宽度下原侧栏正常。

```sh
mkdocs build
python -m http.server 8765 --bind 127.0.0.1 --directory site
```

- [ ] **步骤 2：在现有初始化流程中增加目录按钮。**保留 `setupCollapsibleNav()`，增加 `setupMobileNav()`，并在同一个 DOM 就绪回调中依次调用。按钮不存在时不加隐藏类；渲染时同步文字和 ARIA 状态。

```javascript
function setupMobileNav() {
  var panel = document.getElementById('terminal-mkdocs-side-panel');
  if (!panel) return;
  var button = document.createElement('button');
  var expanded = false;
  button.type = 'button';
  button.className = 'mobile-nav-toggle';
  button.setAttribute('aria-controls', panel.id);
  function render() {
    document.body.classList.toggle('mobile-nav-open', expanded);
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? '收起目录' : '打开目录';
  }
  button.addEventListener('click', function () { expanded = !expanded; render(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && expanded && window.matchMedia('(max-width: 69.999em)').matches) {
      expanded = false;
      render();
      button.focus();
    }
  });
  panel.parentNode.insertBefore(button, panel);
  render();
  document.body.classList.add('mobile-nav-ready');
}
```

- [ ] **步骤 3：添加仅窄屏生效的 CSS。**按钮在桌面不占位；窄屏只有 `mobile-nav-ready` 已设置时才隐藏未展开的侧栏。沿用主题字体和 gruvbox 颜色变量。

```css
.mobile-nav-toggle { display: none; }
@media only screen and (max-width: 69.999em) {
  .mobile-nav-toggle {
    display: block;
    margin-bottom: 1em;
    padding: 0.4em 0.8em;
    font: inherit;
    color: var(--gb-dm-fg1);
    background: var(--gb-dm-bg1);
    border: 1px solid var(--gb-dm-bg3);
    cursor: pointer;
  }
  body.mobile-nav-ready:not(.mobile-nav-open) #terminal-mkdocs-side-panel {
    display: none;
  }
}
```

- [ ] **步骤 4：正式构建验证。**运行 `mkdocs build`；预期退出码为 0，无模板或资源缺失错误。

```sh
mkdocs build
```

- [ ] **步骤 5：按“重点复核”逐一检查。**在首页、`/Rust/所有权/` 的 375×812 页面检查按钮、首屏、分类展开、Escape 与 `aria-expanded`；在 1280 宽度及禁用脚本时检查侧栏。任何失败先修本项并重跑 `mkdocs build`，不要进入第 5 项。

- [ ] **步骤 6：只提交本项文件。**

```sh
git add docs/collapse_nav.js docs/collapse_nav.css
git commit -m '改进手机端目录展示'
```
