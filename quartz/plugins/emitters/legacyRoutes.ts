import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { FullSlug } from "../../util/path"
import manifest from "../../../migration/manifest.json"

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")

// 旧 MkDocs 目录式网址转向明确的 .html 文件，避免目录与无扩展名路由相互重定向。
export const LegacyRoutes: QuartzEmitterPlugin = () => ({
  name: "LegacyRoutes",
  async *emit(ctx) {
    for (const page of manifest.pages) {
      if (page.source === "index.md" || page.source.endsWith("/index.md")) continue
      const slug = page.target.slice(0, -3)
      const filename = slug.split("/").at(-1)!
      const destination = `../${encodeURIComponent(filename)}.html`
      const title = page.headings.find((heading) => heading.level === 1)?.text ?? filename
      const content = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><link rel="canonical" href="${destination}"><meta http-equiv="refresh" content="0;url=${destination}"><script>location.replace(${JSON.stringify(destination)}+location.search+location.hash)</script></head><body><p>此笔记已迁移至 <a href="${destination}">${escape(title)}</a>。</p></body></html>`
      yield write({ ctx, slug: `${slug}/index` as FullSlug, ext: ".html", content })
    }
  },
})
