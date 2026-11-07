import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"
import { previewTheme } from "./quartz/util/previewTheme"
import HybridHome from "./quartz/components/HybridHome"
import { LegacyAnchors } from "./quartz/plugins/transformers/legacyAnchors"
import { LegacyRoutes } from "./quartz/plugins/emitters/legacyRoutes"

// 正式笔记站：保留原字体和配色；构建不依赖字体 CDN，不启用访问统计。
const colors = {
  light: "#282828",
  lightgray: "#504945",
  gray: "#928374",
  darkgray: "#ebdbb2",
  dark: "#fbf1c7",
  secondary: "#fabd2f",
  tertiary: "#8ec07c",
  highlight: "#3c3836",
  textHighlight: "#fabd2f",
}

const config: QuartzConfig = {
  configuration: {
    pageTitle: "王佳贤的个人博客",
    pageTitleSuffix: " · 王佳贤的个人博客",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "zh-CN",
    baseUrl: process.env.QUARTZ_BASE_URL ?? "richard-code200.github.io/mkdocs-site",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "local",
      cdnCaching: false,
      typography: {
        header: "MonaspiceXe Nerd Font",
        body: "MonaspiceAr Nerd Font",
        code: "MonaspiceNe Nerd Font",
      },
      // 固定使用深色，两套主题使用相同色值以避免首次渲染闪白。
      colors: { lightMode: colors, darkMode: colors },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({ priority: ["frontmatter", "filesystem"] }),
      Plugin.SyntaxHighlighting({
        theme: { light: previewTheme, dark: previewTheme },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      LegacyAnchors(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "absolute" }),
      Plugin.Description(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage({ pageBody: HybridHome() }),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({ enableSiteMap: true, enableRSS: true }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      LegacyRoutes(),
    ],
  },
}

export default config
