#!/usr/bin/env python3
"""从迁移前完整备份生成全部 Quartz 内容与回归清单，只在首次迁移时运行。"""

import argparse
import hashlib
import json
import posixpath
import re
import subprocess
import tarfile
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

import yaml

ROOT = Path(__file__).resolve().parents[1]


class Headings(HTMLParser):
    def __init__(self):
        super().__init__()
        self.headings = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if re.fullmatch('h[1-6]', tag) and attrs.get('id') and 'modal-title' not in attrs.get('class', ''):
            self.current = {'level': int(tag[1]), 'id': attrs['id'], 'text': ''}

    def handle_data(self, text):
        if self.current is not None:
            self.current['text'] += text

    def handle_endtag(self, tag):
        if self.current is not None and tag == f"h{self.current['level']}":
            self.current['text'] = self.current['text'].strip()
            self.headings.append(self.current)
            self.current = None


def sha(data):
    return hashlib.sha256(data).hexdigest()


def convert(text, source, sources):
    output = []
    fence = None
    in_callout = False
    title_removed = False
    count = 0

    def emit(line):
        output.append(('> ' if in_callout else '') + line)

    def link(match):
        label, destination = match.groups()
        parts = urlsplit(destination)
        if parts.scheme or parts.netloc or not parts.path.endswith('.md'):
            return match.group(0)
        resolved = posixpath.normpath(posixpath.join(posixpath.dirname(source), unquote(parts.path)))
        if resolved not in sources:
            raise ValueError(f'{source} 指向不存在的笔记：{destination}')
        target = '关于本站.md' if resolved == 'index.md' else resolved
        if parts.fragment:
            target += '#' + parts.fragment
        return f'[{label}]({target})'

    for line in text.splitlines():
        marker = re.match(r'^\s*(`{3,}|~{3,})', line)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
            emit(line)
            continue
        if fence:
            emit(line)
            continue
        if not title_removed and line.startswith('# '):
            title_removed = True
            continue
        start = re.fullmatch(r'\s*///\s*(info|warning|important)(?:\s*\|\s*(.*))?', line)
        if start:
            if in_callout:
                raise ValueError(f'{source} 出现嵌套提示块')
            kind, title = start.groups()
            output.extend(['', f'> [!{kind}] {title or kind}'])
            in_callout = True
            count += 1
        elif line.strip() == '///' and in_callout:
            in_callout = False
            output.append('')
        else:
            line = re.sub(r'\[([^\]\n]+)\]\(([^\s)]+)\)', link, line)
            if line.lstrip().startswith('|'):
                line = re.sub(r'`([^`\n]+)`', lambda m: '`' + re.sub(r'(?<!\\)\|', r'\\|', m.group(1)) + '`', line)
            if line.startswith('#'):
                line = re.sub(r'(?<!`)\b(\w+<[A-Za-z][^<>]*>)(?!`)', r'`\1`', line)
            emit(line)
    if fence or in_callout:
        raise ValueError(f'{source} 有未闭合的围栏或提示块')
    return '\n'.join(output).strip() + '\n', count


def git_dates(relative):
    result = subprocess.run(['git', 'log', '--follow', '--format=%cI', '--', 'docs/' + relative], cwd=ROOT, text=True, capture_output=True, check=True)
    dates = result.stdout.strip().splitlines()
    return {'created': dates[-1], 'modified': dates[0]} if dates else {}


def frontmatter(metadata):
    return '---\n' + '\n'.join(f'{key}: {json.dumps(value, ensure_ascii=False)}' for key, value in metadata.items()) + '\n---\n\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    args = parser.parse_args()
    if (ROOT / 'content').exists():
        parser.error('content 已存在，拒绝覆盖；此脚本只用于首次迁移')
    with tarfile.open(args.archive) as backup:
        def read(name):
            return backup.extractfile('./' + name).read()

        paths = sorted(m.name[len('./docs/'):] for m in backup.getmembers() if m.isfile() and m.name.startswith('./docs/') and m.name.endswith('.md'))
        sources = set(paths)
        old_config = yaml.safe_load(read('mkdocs.yml').decode().partition('\ntheme:')[0])
        navigation = []
        for entry in old_config['nav']:
            if isinstance(entry, dict):
                for title, files in entry.items():
                    folder = files[0].split('/')[0]
                    navigation.append({'title': title, 'folder': folder, 'files': files})
        for folder in sorted({p.split('/')[0] for p in paths if '/' in p} - {c['folder'] for c in navigation}):
            navigation.append({'title': folder, 'folder': folder, 'files': [p for p in paths if p.startswith(folder + '/')]})
        (ROOT / 'site.navigation.json').write_text(json.dumps(navigation, ensure_ascii=False, indent=2) + '\n')

        records = []
        total_callouts = 0
        for relative in paths:
            raw = read('docs/' + relative)
            old_url = relative[:-len('index.md')] if relative.endswith('index.md') else relative[:-3] + '/'
            html_path = 'site/' + (relative[:-len('index.md')] if relative.endswith('index.md') else relative[:-3] + '/') + 'index.html'
            headings = Headings()
            headings.feed(read(html_path).decode())
            first = next((h for h in headings.headings if h['level'] == 1), None)
            target = '关于本站.md' if relative == 'index.md' else relative
            metadata = {'title': '关于本站' if relative == 'index.md' else (first['text'] if first else Path(relative).stem), '_legacy_source': relative, '_original_note': True}
            if first:
                metadata['legacy_title_id'] = first['id']
            metadata.update(git_dates(relative))
            dated = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})(?:-|\.md$)', Path(relative).name)
            if dated:
                year, month, day = map(int, dated.groups())
                metadata['created'] = datetime(year, month, day).strftime('%Y-%m-%d')
            if '/' in relative:
                metadata['tags'] = [relative.split('/')[0]]
            body, callouts = convert(raw.decode(), relative, sources)
            content = frontmatter(metadata) + body
            destination = ROOT / 'content' / target
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(content)
            records.append({'source': relative, 'target': target, 'source_sha256': sha(raw), 'initial_sha256': sha(content.encode()), 'old_url': old_url, 'headings': headings.headings, 'callouts': callouts})
            total_callouts += callouts
            print(f'已迁移：{relative} → {target}')

        for category in navigation:
            destination = ROOT / 'content' / category['folder'] / 'index.md'
            if destination.exists():
                continue
            links = '\n'.join(f'- [{next(r for r in records if r["source"] == source)["source"][:-3].split("/")[-1]}]({source})' for source in category['files'])
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(frontmatter({'title': category['title'], '_generated_navigation': True}) + f'{category["title"]}分类下的学习记录。\n\n' + links + '\n')

        nav_links = '\n'.join(f'- [{c["title"]}]({c["folder"]}/index.md)：{len(c["files"])} 篇笔记。' for c in navigation)
        (ROOT / 'content/笔记导航.md').write_text(frontmatter({'title': '学习笔记', '_generated_navigation': True}) + f'按主题慢慢积累，也通过链接把知识连起来。现有 {len(records) - 1} 篇分类笔记，原首页内容另存于[关于本站](关于本站.md)。\n\n' + nav_links + '\n')

        # 字体及许可证逐字节迁移，不再次生成字体或改变分包。
        for member in backup.getmembers():
            if member.isfile() and member.name.startswith('./docs/assets/fonts/'):
                dest = ROOT / 'quartz/static/fonts' / Path(member.name).name
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(backup.extractfile(member).read())
        for name in ('font_faces.css', 'code_fonts.css'):
            (ROOT / 'quartz/static/styles' / name).write_bytes(read('docs/assets/css/' + name))
        (ROOT / 'quartz/static/styles/gruvbox_dark.css').write_bytes(read('site/css/palettes/gruvbox_dark.css'))
        (ROOT / 'quartz/static/preview-favicon.svg').write_bytes(read('docs/assets/img/favicon.svg'))

        manifest = {'source_archive': str(args.archive.resolve()), 'source_archive_sha256': sha(args.archive.read_bytes()), 'source_count': len(records), 'callout_count': total_callouts, 'pages': records, 'font_sha256': {p.name: sha(p.read_bytes()) for p in (ROOT / 'quartz/static/fonts').iterdir() if p.is_file()}}
        (ROOT / 'migration').mkdir(exist_ok=True)
        (ROOT / 'migration/manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        print(f'完成：{len(records)} 份原文、{total_callouts} 个提示块、{len(navigation)} 个分类。')


if __name__ == '__main__':
    main()
