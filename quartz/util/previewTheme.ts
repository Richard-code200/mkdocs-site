// 沿用原站 Gruvbox 色值，映射到 Shiki / TextMate 语义范围。
// 注释颜色还用作 CSS 的字体定位标记，使其使用 MonaspiceRn。
export const previewTheme = {
  name: "mkdocs-gruvbox",
  displayName: "原站 Gruvbox Dark",
  type: "dark" as const,
  colors: {
    "editor.background": "#1d2021",
    "editor.foreground": "#ebdbb2",
  },
  settings: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#928374", fontStyle: "italic" } },
    { scope: ["keyword", "storage"], settings: { foreground: "#fb4934" } },
    { scope: "keyword.operator", settings: { foreground: "#ebdbb2" } },
    { scope: ["constant.language", "constant.numeric", "constant.character"], settings: { foreground: "#d3869b" } },
    { scope: ["storage.type", "entity.name.type", "support.type"], settings: { foreground: "#fabd2f" } },
    { scope: ["string", "punctuation.definition.string"], settings: { foreground: "#b8bb26" } },
    { scope: "constant.character.escape", settings: { foreground: "#f38019" } },
    { scope: ["entity.name.function", "support.function", "entity.name.namespace"], settings: { foreground: "#fabd2f" } },
    { scope: ["support.constant", "support.variable", "variable.language"], settings: { foreground: "#8ec07c" } },
    { scope: ["variable", "entity.other.attribute-name", "entity.name.tag"], settings: { foreground: "#83a598" } },
    { scope: "entity.other.attribute-name.decorator", settings: { foreground: "#f38019" } },
    { scope: "invalid", settings: { foreground: "#fb4934" } },
    { scope: "markup.deleted", settings: { foreground: "#fb4934" } },
    { scope: "markup.inserted", settings: { foreground: "#b8bb26" } },
    { scope: "source.shell keyword.operator", settings: { foreground: "#f38019" } },
  ],
}
