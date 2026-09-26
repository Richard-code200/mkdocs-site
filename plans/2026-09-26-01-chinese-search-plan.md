# 第 1 项：中文搜索实施计划

> **执行要求：**先阅读设计文档；原生执行使用 `superpowers:executing-plans`，若用户明确选择分代理执行则使用 `superpowers:subagent-driven-development`；逐项勾选步骤。第 4 项完成后执行本计划；完成后才开始第 3 项。

**目标：**中文词组能找到已有笔记，输入法和粘贴可用，同时维持主题现有的英文 Lunr 搜索。

**架构：**独立脚本读取 MkDocs 已生成的搜索索引，只对包含汉字的查询做页面级包含匹配；英文仍交给 `search/main.js` 与 Worker。脚本在输入事件边界挡住中文查询触发的英文搜索，并避免旧 Worker 结果覆盖中文结果。

**技术栈：**MkDocs 搜索索引、原生 JavaScript、`terminal` 搜索弹窗。

**设计文档：**`plans/2026-09-26-mkdocs-site-improvements-design.md` 的“1. 中文搜索与输入事件”。

## 全局约束

- 顺序固定为 **2 → 5 → 6 → 4 → 1 → 3**；英文搜索本身可用，不把前次自动化误报作为修复目标。
- 继续使用英文 Lunr Worker；不要简单设置 `search.lang: zh`，当前 `lunr.zh.js` 的浏览器分词依赖缺失。
- 页面文案与代码注释使用简体中文；结果文本用 DOM `textContent`，不可直接插入索引中的 HTML。
- 仅 `mkdocs build` 是正式构建验证，不增设测试套件；浏览器抽查实际输入行为。

## 重点复核

1. 中文“所有权”应命中标题，正文中的中文词组也应可搜：任务 1 步骤 6 检查。
2. 粘贴和输入法 `compositionend` 后无需额外按键；英文粘贴也返回结果：任务 1 步骤 6 检查。
3. 从英文迅速切到中文、再切回英文时，旧异步结果不能覆盖当前查询：任务 1 步骤 6 检查。
4. 在 `/Rust/所有权/` 搜到其他页面后，结果链接仍留在本站路径：任务 1 步骤 6 检查。
5. 索引加载失败、单个汉字、空查询与无结果词组必须分别显示合适反馈：任务 1 步骤 6 检查。

---

### Task 1：为现有弹窗补中文查询分支

**文件：**新建 `docs/chinese_search.js`；修改 `mkdocs.yml:102-105` 的 `extra_javascript`。

**接口：**入口 `setupChineseSearch(): void` 在 DOM 就绪时运行；读取主题现有的 `#mkdocs-search-query`、`#mkdocs-search-results`、`base_url`、`doSearch()`、`displayResults()`；读取 `search/search_index.json` 中 `docs: [{title, text, location}]`。不修改 MkDocs 安装目录或主题原文件。

- [ ] **步骤 1：验证真实失败与正常基线。**先运行 `mkdocs build`。浏览器中用真实按键输入英文 `Cargo`，应有结果；输入“所有权”并触发真实 `keyup`，应显示未找到结果。不要仅以自动化 `fill`/`type` 的表现判定英文搜索失败。

```sh
mkdocs build
python -m http.server 8765 --bind 127.0.0.1 --directory site
```

- [ ] **步骤 2：实现索引加载与匹配。**页面级文档指 `location` 不含 `#` 的条目；标题优先，结果按 URL 去重、最多 20 条。失败的请求不缓存，下一次中文输入可重新尝试。

```javascript
var pagesPromise = null;
function hasHan(text) { return /[\u3400-\u9fff]/.test(text); }
function hanCount(text) { return (text.match(/[\u3400-\u9fff]/g) || []).length; }
function loadPages() {
  if (!pagesPromise) {
    var root = new URL(base_url + '/', window.location.href);
    pagesPromise = fetch(new URL('search/search_index.json', root)).then(function (response) {
      if (!response.ok) throw new Error('搜索索引加载失败');
      return response.json();
    }).then(function (data) {
      return data.docs.filter(function (doc) { return doc.location.indexOf('#') === -1; });
    }).catch(function (error) { pagesPromise = null; throw error; });
  }
  return pagesPromise;
}
function matchingPages(pages, query) {
  var lowered = query.toLowerCase();
  var seen = new Set();
  return pages.filter(function (page) {
    var matches = page.title.toLowerCase().includes(lowered) || page.text.toLowerCase().includes(lowered);
    if (!matches || seen.has(page.location)) return false;
    seen.add(page.location);
    return true;
  }).sort(function (a, b) {
    return Number(b.title.toLowerCase().includes(lowered)) - Number(a.title.toLowerCase().includes(lowered));
  }).slice(0, 20);
}
```

- [ ] **步骤 3：渲染安全的结果和反馈。**`results` 是 `#mkdocs-search-results`；链接以站点根目录为基准并限制为当前域名，文字只用 `textContent`，摘要截取命中位置附近的正文。

```javascript
function message(text) {
  var p = document.createElement('p');
  p.textContent = text;
  results.replaceChildren(p);
}
function renderPages(pages, query) {
  if (!pages.length) { message('未找到匹配的笔记'); return; }
  var root = new URL(base_url + '/', window.location.href);
  var fragment = document.createDocumentFragment();
  pages.forEach(function (page) {
    var href = new URL(page.location, root);
    if (href.origin !== window.location.origin) return;
    var article = document.createElement('article');
    var heading = document.createElement('h3');
    var link = document.createElement('a');
    var summary = document.createElement('p');
    var from = Math.max(0, page.text.toLowerCase().indexOf(query.toLowerCase()) - 40);
    link.href = href.href;
    link.textContent = page.title;
    summary.textContent = page.text.slice(from, from + 180);
    heading.appendChild(link);
    article.appendChild(heading);
    article.appendChild(summary);
    fragment.appendChild(article);
  });
  results.replaceChildren(fragment);
}
```

- [ ] **步骤 4：连接输入法、粘贴与旧 Worker 的结果边界。**代码放在同一自执行函数内；`input`、`compositionend` 走中文分支，中文 `keyup` 在捕获阶段拦住主题监听器；对中文查询暂时忽略主题的 `displayResults`。用序号核对异步结果是否仍对应当前输入，短查询、空查询与网络错误分别反馈。

```javascript
var input = document.getElementById('mkdocs-search-query');
var results = document.getElementById('mkdocs-search-results');
if (!input || !results) return;
var generation = 0;
var wasHan = false;
var originalDisplay = window.displayResults;
window.displayResults = function (items) {
  if (!input.value.trim() || hasHan(input.value.trim())) return;
  return originalDisplay(items);
};
function update(event) {
  var query = input.value.trim();
  var current = ++generation;
  if (!query) { results.replaceChildren(); wasHan = false; return; }
  if (!hasHan(query)) {
    if ((wasHan || event.inputType === 'insertFromPaste' || event.type === 'compositionend') &&
        typeof window.doSearch === 'function' && typeof window.min_search_length === 'number') {
      window.doSearch();
    }
    wasHan = false;
    return;
  }
  wasHan = true;
  if (hanCount(query) < 2) { message('请至少输入两个汉字'); return; }
  message('正在搜索…');
  loadPages().then(function (pages) {
    if (current !== generation || input.value.trim() !== query) return;
    renderPages(matchingPages(pages, query), query);
  }, function () {
    if (current === generation && input.value.trim() === query) message('搜索暂不可用，请稍后重试');
  });
}
input.addEventListener('keyup', function (event) {
  if (!input.value.trim() || hasHan(input.value)) event.stopImmediatePropagation();
}, true);
input.addEventListener('input', function (event) { if (!event.isComposing) update(event); });
input.addEventListener('compositionend', update);
```

- [ ] **步骤 5：挂载脚本。**将步骤 2–4 放在 `setupChineseSearch()` 函数体内、外部再用自执行函数隔离作用域；在文件末尾以如下方式调用。把 `chinese_search.js` 追加到 `mkdocs.yml` 的 `extra_javascript` 中，保留已有 `collapse_nav.js` 和 `copy_code.js`。

```javascript
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupChineseSearch);
} else {
  setupChineseSearch();
}
```

```yaml
extra_javascript:
  - collapse_nav.js
  - copy_code.js
  - chinese_search.js
```

- [ ] **步骤 6：构建与浏览器检查。**运行 `mkdocs build`；按“重点复核”验证中文、英文、输入法、粘贴、快速切换、深层链接与错误反馈。模拟索引失败时只阻断中文分支的索引请求，不改产品代码；如果任一情形失败，先修本项再继续。

```sh
mkdocs build
```

- [ ] **步骤 7：只提交本项文件。**

```sh
git add docs/chinese_search.js mkdocs.yml
git commit -m '为笔记搜索补充中文查询'
```
