import { build } from "esbuild"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { h } from "preact"
import render from "preact-render-to-string"
import type { QuartzPluginData } from "../plugins/vfile"
import type { FullSlug } from "../util/path"
import type { QuartzComponentProps } from "./types"

// 使用真实组件；这里只模拟 Quartz 构建时的文本资源加载方式。
const source = fileURLToPath(new URL("./HybridHome.tsx", import.meta.url))
const bundle = await build({
  entryPoints: [source],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  loader: { ".scss": "text" },
  plugins: [
    {
      name: "首页内联资源",
      setup(builder) {
        // 第三方包从实际安装位置加载，避免把原生模块打进 data URL。
        builder.onResolve({ filter: /^[^./]/ }, (args) => ({
          path: import.meta.resolve(args.path),
          external: true,
        }))
        builder.onResolve({ filter: /\.inline$/ }, (args) => ({
          path: path.resolve(args.resolveDir, args.path + ".ts"),
          namespace: "inline-text",
        }))
        builder.onLoad({ filter: /.*/, namespace: "inline-text" }, async (args) => ({
          contents: await readFile(args.path, "utf8"),
          loader: "text",
        }))
      },
    },
  ],
})
const { default: constructor, HomeHeader } = await import(
  "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64")
)
const Home = constructor()
function note(slug: string, title: string, generated = false): QuartzPluginData {
  return {
    slug: slug as FullSlug,
    frontmatter: { title, tags: [], _generated_navigation: generated },
  }
}
function props(allFiles: QuartzPluginData[] = []): QuartzComponentProps {
  return {
    cfg: { pageTitle: "Richard的个人博客", locale: "zh-CN", defaultDateType: "created" },
    fileData: {
      slug: "index",
      filePath: "content/index.md",
      frontmatter: { title: "首页", tags: [] },
    },
    allFiles,
    tree: { type: "root", children: [] },
    children: [],
    externalResources: { css: [], js: [] },
    ctx: {},
  } as unknown as QuartzComponentProps
}

test("首页只有一个可读主标题，重影和色带不重复进入读屏", () => {
  const html = render(h(Home, props()))
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
  assert.match(html, /<h1[^>]*>[\s\S]*?RICHARD[\s\S]*?<\/h1>/)
  assert.match(html, /class="preview-wordmark-echo"[^>]*aria-hidden="true"/)
  assert.match(html, /class="preview-ribbons"[^>]*aria-hidden="true"/)
})
test("首页简介使用确认后的具体学习内容描述", () => {
  const html = render(h(Home, props()))
  assert.match(html, /这里是 Richard 的学习笔记与随记，整理编程、工具实践和日常思考。/)
})
test("学习笔记提示说明主题整理与查阅用途", () => {
  assert.match(render(h(Home, props())), /按主题整理，方便查阅与回顾。/)
})
test("站名有独立文本区域，英文副标题保持分离", () => {
  const html = render(h(HomeHeader(), props()))
  assert.match(html, /<span class="home-brand-title">Richard的个人博客<\/span>/)
  assert.match(html, /<small>RICHARD \/ NOTES<\/small>/)
})
test("最近记录按钮指向本页实际存在的区域", () => {
  const html = render(h(Home, props()))
  assert.match(html, /href="#recent-notes"/)
  assert.match(html, /id="recent-notes"/)
})
test("全部分类与重点分类入口可在部署子路径中解析", () => {
  const html = render(h(Home, props()))
  const urls = [...html.matchAll(/href="([^"]+)"/g)].map((match) =>
    decodeURI(new URL(match[1], "https://example.com/quartz-site/").pathname),
  )
  for (const expected of [
    "/quartz-site/笔记导航",
    "/quartz-site/Rust/",
    "/quartz-site/常用工具/",
    "/quartz-site/随记/",
  ]) {
    assert.ok(urls.includes(expected), `缺少可用入口：${expected}`)
  }
})
test("分类篇数排除自动生成目录，保留真实笔记", () => {
  const html = render(
    h(
      Home,
      props([
        note("Rust/所有权", "所有权"),
        note("Rust/切片", "切片"),
        note("Rust/index", "Rust", true),
      ]),
    ),
  )
  assert.match(html, /2 篇笔记 · 编程语言/)
  assert.doesNotMatch(html, /3 篇笔记 · 编程语言/)
})
test("没有随记时显示可读空状态", () => {
  assert.match(render(h(Home, props())), /还没有随记，慢慢记录。/)
})
test("最近随记按日期排序并只显示两篇", () => {
  const files = ["2026-04-01", "2026-06-09", "2026-09-12"].map((date) => ({
    ...note(`随记/${date}`, date),
    dates: { created: new Date(`${date}T00:00:00`), modified: new Date(), published: new Date() },
  }))
  const html = render(h(Home, props(files)))
  assert.ok(html.indexOf("2026.09.12") < html.indexOf("2026.06.09"))
  assert.doesNotMatch(html, /2026.04.01/)
})
test("非首页仍然输出原生文章而不是定制首屏", () => {
  const page = props()
  page.fileData.slug = "Rust/所有权" as typeof page.fileData.slug
  const html = render(h(Home, page))
  assert.match(html, /<article/)
  assert.doesNotMatch(html, /preview-home|RICHARD/)
  assert.equal(render(h(HomeHeader(), page)), "")
})
test("首页关联图位于学习分类与最近记录之间", () => {
  const html = render(h(Home, props()))
  const position = html.indexOf('id="home-graph"')
  assert.ok(position > html.indexOf('id="topics-heading"'), "分类后应有图谱独立区域")
  assert.ok(position < html.indexOf('id="recent-notes"'), "图谱应在最近记录之前")
  assert.match(html, /id="home-graph"[^>]*aria-labelledby="home-graph-heading"/)
  assert.match(html, /id="home-graph-heading"/)
})
test("首页图谱使用完整索引且不添加标签节点，保留图形交互", () => {
  const html = render(h(Home, props([note("孤立笔记", "没有出链的笔记")])))
  const configurations = [...html.matchAll(/data-cfg="([^"]+)"/g)].map((match) =>
    JSON.parse(match[1].replaceAll("&quot;", '"')),
  )
  assert.equal(configurations.length, 2, "应同时提供内嵌图与放大图")
  for (const configuration of configurations) {
    assert.equal(configuration.depth, -1, "不能只绘制首页邻居，孤立笔记也应可见")
    assert.equal(configuration.showTags, false)
    assert.equal(configuration.drag, true)
    assert.equal(configuration.zoom, true)
  }
  assert.match(html, /class="global-graph-icon"[^>]*aria-label="全站关系图"/)
})
test("首页注册原生图谱资源，而不是仅输出空容器", () => {
  assert.ok([Home.css].flat().some((css: string) => css.includes(".graph-outer")))
  assert.ok([Home.afterDOMLoaded].flat().some((script: string) => script?.includes("renderGraph")))
})
test("非首页不会加入全站内嵌图谱区域", () => {
  const page = props()
  page.fileData.slug = "Rust/所有权" as FullSlug
  assert.doesNotMatch(render(h(Home, page)), /home-graph|preview-graph|graph-container/)
})
test("首页导航保留搜索、排版入口与手机菜单控制关系", () => {
  const html = render(h(HomeHeader(), props()))
  assert.match(html, /class="search-button"/)
  assert.match(html, /href="\.\/排版预览"/)
  assert.match(html, /aria-controls="home-nav-links"/)
  assert.match(html, /id="home-nav-links"/)
})
