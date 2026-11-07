import { QuartzComponent, QuartzComponentConstructor } from "./types"
import ContentConstructor from "./pages/Content"
import SearchConstructor from "./Search"
import { getDate } from "./Date"
import { FullSlug, resolveRelative } from "../util/path"
import style from "./styles/hybridHome.scss"
import migration from "../../migration/manifest.json"
// @ts-ignore
import menuScript from "./scripts/hybridHome.inline"

const topics = [
  { slug: "Rust/index", prefix: "Rust/", title: "Rust", description: "从所有权到切片，理解语言背后的规则。", category: "编程语言" },
  { slug: "常用工具/index", prefix: "常用工具/", title: "命令行工具", description: "find / fd、grep / rg：把常用工具用顺手。", category: "Linux" },
  { slug: "随记/index", prefix: "随记/", title: "随记", description: "课堂练习、零散记录，以及一些小发现。", category: "日常记录" },
]

// 首页复用 Quartz 搜索组件；资源以数组注册，由 Quartz 按内容自动去重。
export const HomeHeader = (() => {
  const Search = SearchConstructor()
  const Header: QuartzComponent = (props) => {
    if (props.fileData.slug !== "index") return null
    const href = (slug: string) => resolveRelative(props.fileData.slug!, slug as FullSlug)
    return (
      <nav class="home-nav" aria-label="主导航">
        <a class="home-skip-link" href="#content">跳至内容</a>
        <div class="home-nav-inner">
          <a class="home-brand" href={href("index")}>{props.cfg.pageTitle}</a>
          <div id="home-nav-links" class="home-nav-links">
            <a href={href("笔记导航")}>学习笔记</a>
            <a href={href("随记/index")}>随记</a>
            <a href={href("排版预览")}>排版预览</a>
          </div>
          <Search {...props} />
          <button class="home-menu-toggle" type="button" aria-label="打开导航" aria-expanded="false" aria-controls="home-nav-links">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </nav>
    )
  }
  Header.css = [...(Search.css ? [Search.css].flat() : []), style]
  Header.afterDOMLoaded = [menuScript, ...(Search.afterDOMLoaded ? [Search.afterDOMLoaded].flat() : [])]
  Header.beforeDOMLoaded = Search.beforeDOMLoaded
  return Header
}) satisfies QuartzComponentConstructor

// 只有根首页使用定制布局，其他文章仍交给 Quartz 原生 Content 组件。
export default (() => {
  const Content = ContentConstructor()
  const HybridHome: QuartzComponent = (props) => {
    const { fileData, allFiles, cfg } = props
    if (fileData.slug !== "index") return <Content {...props} />
    const href = (slug: string) => resolveRelative(fileData.slug!, slug as FullSlug)
    const notes = allFiles.filter((file) => file.slug && file.slug !== "index" && file.slug !== "排版预览" && !file.frontmatter?._generated_navigation && (file.frontmatter?._original_note || !file.slug.endsWith("/index")))
    const recent = notes
      .filter((file) => file.slug!.startsWith("随记/"))
      .sort((a, b) => (getDate(cfg, b)?.getTime() ?? 0) - (getDate(cfg, a)?.getTime() ?? 0))
      .slice(0, 2)

    return (
      <main id="content" class="preview-home popover-hint">
        {migration.pages.find((page) => page.source === "index.md")?.headings.map((heading) => (
          <span id={heading.id} class="legacy-home-anchor" data-legacy-home-destination={href("关于本站")} aria-hidden="true" />
        ))}
        <section class="preview-hero" aria-labelledby="home-heading">
          <div class="preview-eyebrow"><span class="preview-dot" /> ~/notes <span class="preview-muted">/ 学习与记录</span></div>
          <h1 id="home-heading">学到一点，<br />就记录一点<span class="preview-cursor">_</span></h1>
          <p class="preview-intro">这里是王佳贤的学习笔记与随记。<br />记录代码、工具，和慢慢理解这个世界的过程。</p>
          <div class="preview-actions">
            <a class="preview-button" href={href("笔记导航")}>开始阅读 <span aria-hidden="true">→</span></a>
            <a class="preview-text-link" href={href("排版预览")}>查看字体与排版 <span aria-hidden="true">↗</span></a>
          </div>
          <div class="preview-meta">Quartz <span>·</span> Gruvbox Dark <span>·</span> Monaspice / 更纱黑体</div>
        </section>

        <section aria-labelledby="topics-heading">
          <div class="preview-section-label"><span>01 / 学习笔记</span><span class="preview-muted">按主题慢慢积累</span></div>
          <h2 id="topics-heading" class="preview-section-title">正在学习</h2>
          <div class="preview-grid">
            {topics.map((topic, index) => (
              <a class="preview-card" href={href(topic.slug)}>
                <span class="preview-card-index">{String(index + 1).padStart(2, "0")} <span aria-hidden="true">↗</span></span>
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
                <span class="preview-card-footer">{notes.filter((file) => file.slug!.startsWith(topic.prefix)).length} 篇笔记 · {topic.category}</span>
              </a>
            ))}
          </div>
        </section>

        <section class="preview-bottom" aria-labelledby="recent-heading">
          <div>
            <div class="preview-section-label"><span>02 / 随记</span></div>
            <h2 id="recent-heading" class="preview-section-title">留一点生活的切片</h2>
            {recent.map((file) => {
              // Quartz 把纯日期解释为本地零点，不能转 UTC 后截取，否则会少一天。
              const created = getDate(cfg, file)
              const date = created && [created.getFullYear(), String(created.getMonth() + 1).padStart(2, "0"), String(created.getDate()).padStart(2, "0")].join("-")
              return (
                <a class="preview-entry" href={href(file.slug!)}>
                  {date && <time dateTime={date}>{date.replaceAll("-", ".")}</time>}
                  <span>{file.frontmatter?.title}</span><span aria-hidden="true">→</span>
                </a>
              )
            })}
            {recent.length === 0 && <p class="preview-empty">还没有随记，慢慢记录。</p>}
          </div>
          <aside class="preview-status">
            <span class="preview-eyebrow">关于这个网站</span>
            <p>换一种构建方式，<br />保留熟悉的阅读感觉。</p>
            <small>从 2026 年 4 月开始，记录学习、实践与零散发现。<a href={href("关于本站")}>看看建站时的想法与学习计划 →</a></small>
          </aside>
        </section>
      </main>
    )
  }
  HybridHome.css = style
  return HybridHome
}) satisfies QuartzComponentConstructor
