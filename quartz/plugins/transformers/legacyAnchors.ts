import { visit } from "unist-util-visit"
import { toString } from "hast-util-to-string"
import { QuartzTransformerPlugin } from "../types"
import manifest from "../../../migration/manifest.json"

// 去掉不同 Markdown 引擎对标点、泛型和智能引号的排版差异。
const normalize = (text: string) => text.replace(/<[^>]*>/g, "").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()

export const LegacyAnchors: QuartzTransformerPlugin = () => ({
  name: "LegacyAnchors",
  htmlPlugins() {
    return [() => (tree, file) => {
      const source = file.data.frontmatter?._legacy_source
      const record = manifest.pages.find((page) => page.source === source)
      if (!record) return
      const used = new Set<string>()
      visit(tree, "element", (node) => { if (node.properties.id) used.add(String(node.properties.id)) })
      const headings = record.headings.filter((heading) => heading.level !== 1)
      const consumed = new Set<number>()
      visit(tree, "element", (node) => {
        if (!/^h[1-6]$/.test(node.tagName)) return
        const level = Number(node.tagName[1])
        const text = normalize(toString(node))
        const index = headings.findIndex((old, i) => !consumed.has(i) && old.level === level && normalize(old.text) === text)
        if (index < 0) return
        consumed.add(index)
        const old = headings[index].id
        if (used.has(old)) return
        node.children.unshift({ type: "element", tagName: "span", properties: { id: old, className: ["legacy-anchor"], ariaHidden: "true" }, children: [] })
        used.add(old)
      })
    }]
  },
})
