"""将本机字体转换为站点 WOFF2；运行前安装 fonttools[woff]。"""

import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs/assets/fonts"
CSS = ROOT / "docs/assets/css/font_faces.css"


def unicode_ranges(points):
    """合并连续码点，减少 unicode-range 声明长度。"""
    ranges = []
    start = end = None
    for point in sorted(points):
        if end is not None and point == end + 1:
            end = point
            continue
        if start is not None:
            ranges.append(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}")
        start = end = point
    if start is not None:
        ranges.append(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}")
    return ", ".join(ranges)


def export(source, filename, family, weight, style, points, faces):
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    with TTFont(source) as font:
        worker = subset.Subsetter(options=options)
        worker.populate(unicodes=points)
        worker.subset(font)
        font.flavor = "woff2"
        font.save(OUTPUT / filename)
    faces.append(
        f'@font-face {{\n  font-family: "{family}";\n'
        f"  font-style: {style};\n  font-weight: {weight};\n"
        f'  font-display: swap;\n  src: url("../fonts/{filename}") format("woff2");\n'
        f"  unicode-range: {unicode_ranges(points)};\n}}\n"
    )
    print(f"已生成 {filename}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--monaspice", type=Path, default=Path.home() / ".local/share/fonts/MonaspaceNerd")
    parser.add_argument("--sarasa", type=Path, default=Path.home() / ".local/share/fonts/SarasaTermSC")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    faces = ["/* 由 scripts/build_fonts.py 生成，请勿手工修改；保留 OpenType 布局特性。 */\n"]

    # 西文字体保留拉丁、希腊、数学及编程符号；中文由 Sarasa 接管。
    for variant, styles in {
        "Ar": ("Regular", "Bold", "Italic", "BoldItalic"),
        "Xe": ("Bold",),
        "Ne": ("Regular", "Bold", "Italic", "BoldItalic"),
        "Rn": ("Italic",),
    }.items():
        for style in styles:
            stem = f"Monaspice{variant}NerdFont-{style}"
            source = args.monaspice / f"{stem}.otf"
            with TTFont(source) as font:
                points = {c for c in font.getBestCmap() if c < 0x3000 or 0xFB00 <= c <= 0xFB06}
            export(source, f"{stem}.woff2", f"Monaspice{variant} Nerd Font",
                   700 if "Bold" in style else 400,
                   "italic" if "Italic" in style else "normal", points, faces)

    # 将已有笔记用字集中为小包，其余字形也保留，新增笔记无需重新生成字体。
    used = set()
    for note in (ROOT / "docs").rglob("*.md"):
        used.update(map(ord, note.read_text(encoding="utf-8")))
    regular = args.sarasa / "SarasaTermSC-Regular.ttf"
    with TTFont(regular) as font:
        available = set(font.getBestCmap())
    common = sorted(available & used)
    remaining = sorted(available - used)
    groups = [common[i:i + 1024] for i in range(0, len(common), 1024)]
    groups += [remaining[i:i + 2048] for i in range(0, len(remaining), 2048)]
    for style, weight in (("Regular", 400), ("Bold", 700)):
        source = args.sarasa / f"SarasaTermSC-{style}.ttf"
        with TTFont(source) as font:
            supported = set(font.getBestCmap())
        for index, group in enumerate(groups):
            points = set(group) & supported
            if points:
                export(source, f"SarasaTermSC-{style}-{index:02}.woff2",
                       "Sarasa Term SC", weight, "normal", points, faces)
    CSS.write_text("\n".join(faces), encoding="utf-8")


if __name__ == "__main__":
    main()
