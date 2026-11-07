import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import { transformSync } from "esbuild"

// 按 Quartz 的实际配置打包方式保留函数名，再模拟浏览器的独立 eval 环境。
const source = readFileSync(new URL("./navigation.ts", import.meta.url), "utf8")
const built = transformSync(source, { loader: "ts", format: "cjs", keepNames: true }).code
const module = { exports: {} as { sortNavigation?: (a: object, b: object) => number } }
vm.runInNewContext(built, { module, exports: module.exports })
const sort = vm.runInNewContext(`(${module.exports.sortNavigation!.toString()})`) as (a: object, b: object) => number
const node = (slug: string) => ({ slug, displayName: slug.split("/").at(-1)! })

test("侧栏排序函数可脱离打包环境序列化运行", () => {
  assert.ok(sort(node("MarkDown"), node("Rust")) < 0)
})
test("Rust 笔记沿用旧站章节顺序", () => {
  assert.ok(sort(node("Rust/基本语法与数据类型"), node("Rust/所有权")) < 0)
})
test("未登记的新笔记不丢失，排在同分类的已登记笔记之后", () => {
  assert.ok(sort(node("Rust/新笔记"), node("Rust/所有权")) > 0)
})
