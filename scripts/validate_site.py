#!/usr/bin/env python3
"""验证构建产物、旧站兼容性与资源；可额外核对备份中的全部原始代码块。"""

import argparse
import hashlib
import json
import re
import tarfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
BASE = '/mkdocs-site'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()
        self.canonical = None
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ('id', 'name'):
            if attrs.get(key):
                self.ids.add(attrs[key])
        self.links.extend(attrs[key] for key in ('href', 'src') if attrs.get(key))
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')
        if tag == 'meta' and attrs.get('name') == 'robots' and 'noindex' in attrs.get('content', ''):
            self.noindex = True


def code_blocks(text):
    if text.startswith('---\n'):
        text = text.split('\n---\n', 1)[1]
    result = []
    fence = None
    quote_depth = 0
    language = ''
    lines = []
    for line in text.splitlines():
        if fence:
            for _ in range(quote_depth):
                line = re.sub(r'^> ?', '', line, count=1)
            if re.match(r'^\s*' + re.escape(fence[0]) + '{' + str(len(fence)) + r',}\s*$', line):
                result.append((language, '\n'.join(lines)))
                fence = None
            else:
                lines.append(line.rstrip())
        else:
            opening = re.match(r'^((?:> ?)*)\s*(`{3,}|~{3,})(.*)$', line)
            if opening:
                quote_depth = opening.group(1).count('>')
                fence = opening.group(2)
                language = opening.group(3).strip()
                lines = []
    if fence:
        raise ValueError('代码围栏没有闭合')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'public')
    parser.add_argument('--audit-archive', type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    manifest = json.loads((ROOT / 'migration/manifest.json').read_text())
    errors = []
    pages = {}
    for file in output.rglob('*.html'):
        page = Page()
        page.feed(file.read_text())
        pages[file] = page
    if not pages:
        raise SystemExit('没有构建产物，请先运行 npm run build')

    def resolve(origin, value):
        url = urlsplit(value)
        path = unquote(url.path)
        if path == BASE:
            dest = output / 'index.html'
        elif path.startswith(BASE + '/'):
            dest = output / path[len(BASE) + 1:]
        elif path.startswith('/'):
            dest = output / path.lstrip('/')
        elif path:
            dest = origin.parent / path
        else:
            dest = origin
        dest = dest.resolve()
        if dest.is_dir():
            dest /= 'index.html'
        if not dest.exists() and not dest.suffix:
            dest = dest.with_suffix('.html')
        return dest, unquote(url.fragment)

    links = anchors = 0
    for file, page in pages.items():
        for link in page.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            dest, fragment = resolve(file, link)
            links += 1
            if not dest.exists():
                errors.append(f'{file.relative_to(output)}：资源不存在 {link}')
            elif fragment and dest in pages:
                anchors += 1
                target = pages[dest]
                if target.canonical:
                    canonical, _ = resolve(dest, target.canonical)
                    target = pages.get(canonical, target)
                if fragment not in target.ids:
                    errors.append(f'{file.relative_to(output)}：锚点不存在 {link}')

    for css in output.rglob('*.css'):
        for value in re.findall(r'url\([\'\"]?([^\)\'\" ]+)', css.read_text()):
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path:
                continue
            if not (css.parent / unquote(url.path)).resolve().exists():
                errors.append(f'{css.relative_to(output)}：CSS 资源不存在 {value}')

    old_anchors = redirects = 0
    for record in manifest['pages']:
        target = ROOT / 'content' / record['target']
        if not target.exists():
            errors.append(f'原文未迁移：{record["source"]}')
            continue
        html = output / (record['target'][:-3] + '.html')
        if html not in pages:
            errors.append(f'文章未构建：{record["target"]}')
            continue
        for heading in record['headings']:
            old_anchors += 1
            if heading['id'] not in pages[html].ids:
                errors.append(f'旧锚点丢失：{record["target"]}#{heading["id"]}')
        if record['source'] != 'index.md' and not record['source'].endswith('/index.md'):
            alias = output / record['old_url'] / 'index.html'
            if alias not in pages or not pages[alias].canonical:
                errors.append(f'旧网址未兼容：{record["old_url"]}')
            else:
                dest, _ = resolve(alias, pages[alias].canonical)
                if dest != html:
                    errors.append(f'兼容页目标错误：{record["old_url"]}')
                redirects += 1

    for name, expected in manifest['font_sha256'].items():
        font = output / 'static/fonts' / name
        if not font.exists() or hashlib.sha256(font.read_bytes()).hexdigest() != expected:
            errors.append(f'原始字体或许可证发生变化：{name}')

    index = json.loads((output / 'static/contentIndex.json').read_text())
    def simple(slug):
        return '/' if slug == 'index' else (slug[:-5] if slug.endswith('/index') else slug)
    nodes = {simple(slug) for slug in index}
    for slug, item in index.items():
        for linked in item.get('links', []):
            if simple(linked) not in nodes:
                errors.append(f'无效关系图链接：{slug} → {linked}')
    home = (output / 'index.html').read_text()
    if home.count('<h1 ') != 1 or 'class="preview-home popover-hint"' not in home:
        errors.append('定制首页结构不正确')
    home_page = pages[output / 'index.html']
    for record in manifest['pages']:
        if record['source'] == 'index.md':
            for heading in record['headings']:
                if heading['id'] not in home_page.ids:
                    errors.append(f'原首页锚点缺少转接：#{heading["id"]}')
    if output.name == 'public' and home_page.noindex:
        errors.append('正式首页仍禁止搜索引擎索引')

    audited = 0
    if args.audit_archive:
        with tarfile.open(args.audit_archive) as backup:
            for record in manifest['pages']:
                raw = backup.extractfile('./docs/' + record['source']).read()
                if hashlib.sha256(raw).hexdigest() != record['source_sha256']:
                    errors.append(f'备份校验失败：{record["source"]}')
                old = code_blocks(raw.decode())
                new = code_blocks((ROOT / 'content' / record['target']).read_text())
                if old != new:
                    errors.append(f'代码块内容改变：{record["target"]}（原 {len(old)}，新 {len(new)}）')
                audited += len(old)

    print(f'验证：{len(pages)} 个 HTML，{links} 条本地引用，{anchors} 个站内锚点。')
    print(f'迁移：{manifest["source_count"]} 份原文，{old_anchors} 个旧标题锚点，{redirects} 个旧路径兼容页；字体逐字节校验。')
    if args.audit_archive:
        print(f'代码审计：{audited} 个原始代码块。')
    for error in errors[:60]:
        print('错误：' + error)
    if errors:
        raise SystemExit(f'验证失败：{len(errors)} 项')
    print('全部验证通过。')


if __name__ == '__main__':
    main()
