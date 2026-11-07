#!/usr/bin/env python3
"""生成自包含的 Quartz 侧栏排序函数；未列出的新文章仍自动展示。"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
categories = json.loads((ROOT / 'site.navigation.json').read_text())
order = {}
for position, category in enumerate(categories):
    order[category['folder']] = (position + 1) * 1000
    for index, file in enumerate(category['files']):
        order[file[:-3].removesuffix('/index')] = (position + 1) * 1000 + index + 1
order.update({'笔记导航': 1, '关于本站': 99000, '排版预览': 99001})
body = json.dumps(order, ensure_ascii=False, indent=2)
code = '''import { FileTrieNode } from "./fileTrie"

// 顺序表须在函数内；不要嵌套函数，避免序列化后遗失 esbuild 的命名辅助函数。
export const sortNavigation = (a: FileTrieNode, b: FileTrieNode): number => {
  const order: Record<string, number> = ORDER
  const aSlug = a.slug.replace(/\\/index$/, "").replace(/\\/$/, "")
  const bSlug = b.slug.replace(/\\/index$/, "").replace(/\\/$/, "")
  const aRank = order[aSlug] ?? ((order[aSlug.split("/")[0]] ?? 90000) + 900)
  const bRank = order[bSlug] ?? ((order[bSlug.split("/")[0]] ?? 90000) + 900)
  return aRank - bRank || a.displayName.localeCompare(b.displayName, "zh-CN", { numeric: true })
}
'''
(ROOT / 'quartz/util/navigation.ts').write_text(code.replace('ORDER', body))
print(f'已生成导航顺序：{len(order)} 项。')
