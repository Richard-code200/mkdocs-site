import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { QuartzComponent } from "./quartz/components/types"
import { HomeHeader } from "./quartz/components/HybridHome"
import { sortNavigation } from "./quartz/util/navigation"

// 首页使用移植的 Hugo 设计，其他页面保留 Quartz 原生知识花园布局。
const noteOnly = (component: QuartzComponent) => Component.ConditionalRender({
  component,
  condition: (page) => page.fileData.slug !== "index",
})
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [HomeHeader()],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/Richard-code200/mkdocs-site",
      RSS: "https://richard-code200.github.io/mkdocs-site/index.xml",
    },
  }),
}

const left = [
  Component.PageTitle(),
  Component.MobileOnly(Component.Spacer()),
  Component.Flex({
    components: [
      { Component: Component.Search({ enablePreview: true }), grow: true },
      { Component: Component.ReaderMode() },
    ],
  }),
  Component.Explorer({ title: "笔记导航", folderDefaultState: "collapsed", sortFn: sortNavigation }),
]

export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    noteOnly(Component.Breadcrumbs({ rootName: "首页" })),
    noteOnly(Component.ArticleTitle()),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => page.fileData.frontmatter?.created !== undefined,
    }),
    noteOnly(Component.TagList()),
  ],
  left: left.map(noteOnly),
  right: [
    Component.Graph({ localGraph: { showTags: false }, globalGraph: { showTags: true } }),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ].map(noteOnly),
}

export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs({ rootName: "首页" }), Component.ArticleTitle()],
  left,
  right: [Component.Graph({ localGraph: { showTags: false } })],
}
