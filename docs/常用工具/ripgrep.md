# ripgrep (rg)

ripgrep 是一个面向行的递归搜索工具，在当前目录下按正则表达式模式搜索。默认情况下，ripgrep 会遵守 `.gitignore` 规则，自动跳过隐藏文件/目录和二进制文件（使用 `rg -uuu` 可禁用所有自动过滤）。ripgrep 在 Windows、macOS 和 Linux 上均有一流支持。

## 搜索结果截图

[![Screenshot of a sample search with ripgrep](https://burntsushi.net/stuff/ripgrep1.png)](https://burntsushi.net/stuff/ripgrep1.png)

## 性能对比

以下在 [Linux 内核源码树](https://github.com/BurntSushi/linux)（先执行 `make defconfig && make -j8`）中搜索 `[A-Z]+_SUSPEND`（全部为单词匹配）。测试环境：Intel i9-12900K 5.2 GHz。

| Tool                                                                                 | Command                                                      | Line count | Time               |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------- | ------------------ |
| ripgrep (Unicode)                                                                    | `rg -n -w '[A-Z]+_SUSPEND'`                                  | 536        | **0.082s** (1.00x) |
| [hypergrep](https://github.com/p-ranav/hypergrep)                                    | `hgrep -n -w '[A-Z]+_SUSPEND'`                               | 536        | 0.167s (2.04x)     |
| [git grep](https://www.kernel.org/pub/software/scm/git/docs/git-grep.html)           | `git grep -P -n -w '[A-Z]+_SUSPEND'`                         | 536        | 0.273s (3.34x)     |
| [The Silver Searcher](https://github.com/ggreer/the_silver_searcher)                 | `ag -w '[A-Z]+_SUSPEND'`                                     | 534        | 0.443s (5.43x)     |
| [ugrep](https://github.com/Genivia/ugrep)                                            | `ugrep -r --ignore-files --no-hidden -I -w '[A-Z]+_SUSPEND'` | 536        | 0.639s (7.82x)     |
| [git grep](https://www.kernel.org/pub/software/scm/git/docs/git-grep.html)           | `LC_ALL=C git grep -E -n -w '[A-Z]+_SUSPEND'`                | 536        | 0.727s (8.91x)     |
| [git grep (Unicode)](https://www.kernel.org/pub/software/scm/git/docs/git-grep.html) | `LC_ALL=en_US.UTF-8 git grep -E -n -w '[A-Z]+_SUSPEND'`      | 536        | 2.670s (32.70x)    |
| [ack](https://github.com/beyondgrep/ack3)                                            | `ack -w '[A-Z]+_SUSPEND'`                                    | 2677       | 2.935s (35.94x)    |

无视 `.gitignore`、使用白名单搜索：

| Tool                                           | Command                                                             | Line count | Time               |
| ---------------------------------------------- | ------------------------------------------------------------------- | ---------- | ------------------ |
| ripgrep                                        | `rg -uuu -tc -n -w '[A-Z]+_SUSPEND'`                                | 447        | **0.063s** (1.00x) |
| [ugrep](https://github.com/Genivia/ugrep)      | `ugrep -r -n --include='*.c' --include='*.h' -w '[A-Z]+_SUSPEND'`   | 447        | 0.607s (9.62x)     |
| [GNU grep](https://www.gnu.org/software/grep/) | `grep -E -r -n --include='*.c' --include='*.h' -w '[A-Z]+_SUSPEND'` | 447        | 0.674s (10.69x)    |

单大文件搜索（内存缓存 ~13GB 文件）：

| Tool                                                     | Command                                           | Line count | Time               |
| -------------------------------------------------------- | ------------------------------------------------- | ---------- | ------------------ |
| ripgrep (Unicode)                                        | `rg -w 'Sherlock [A-Z]\w+'`                       | 7882       | **1.042s** (1.00x) |
| [ugrep](https://github.com/Genivia/ugrep)                | `ugrep -w 'Sherlock [A-Z]\w+'`                    | 7882       | 1.339s (1.28x)     |
| [GNU grep (Unicode)](https://www.gnu.org/software/grep/) | `LC_ALL=en_US.UTF-8 egrep -w 'Sherlock [A-Z]\w+'` | 7882       | 6.577s (6.31x)     |

高匹配次数搜索（约 8300 万行匹配）：

| Tool                                           | Command             | Line count | Time               |
| ---------------------------------------------- | ------------------- | ---------- | ------------------ |
| ripgrep                                        | `rg the`            | 83499915   | **6.948s** (1.00x) |
| [ugrep](https://github.com/Genivia/ugrep)      | `ugrep the`         | 83499915   | 11.721s (1.69x)    |
| [GNU grep](https://www.gnu.org/software/grep/) | `LC_ALL=C grep the` | 83499915   | 15.217s (2.19x)    |

## 为什么要用 ripgrep？

- 可替代许多其他搜索工具的常见用法，功能全面且通常更快
- 默认进行**递归搜索**和**自动过滤**：不会搜索 `.gitignore`/`.ignore`/`.rgignore` 忽略的文件、隐藏文件、二进制文件。通过 `rg -uuu` 可禁用自动过滤
- 可按文件类型过滤：`rg -tpy foo` 限制为 Python 文件，`rg -Tjs foo` 排除 JavaScript 文件。支持自定义文件类型匹配规则
- 支持 `grep` 的常见特性：上下文展示、多模式搜索、彩色高亮、完整 Unicode 支持。与 GNU grep 不同，ripgrep 开启 Unicode 时依然快速
- 可选 PCRE2 正则引擎：通过 `-P/--pcre2` 启用，支持环视和反向引用。也可用 `--auto-hybrid-regex` 仅在需要时自动切换
- 基本替换支持：根据匹配内容重写输出
- 支持搜索多种文本编码：UTF-16、latin-1、GBK、EUC-JP、Shift_JIS 等。通过 `-E/--encoding` 指定
- 支持搜索压缩文件：通过 `-z/--search-zip` 支持 brotli、bzip2、gzip、lz4、lzma、xz、zstandard 格式
- 支持任意输入预处理过滤器：如 PDF 文本提取、自动编码检测等
- 支持通过[配置文件](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)进行配置

简而言之：如果你追求速度、默认过滤、更少的 bug 和 Unicode 支持，就用 ripgrep。

## 为什么 ripgrep 这么快？

- 基于 [Rust regex 引擎](https://github.com/rust-lang/regex)，使用有限自动机、SIMD 和激进的字面量优化
- Rust 的 regex 库将 UTF-8 解码直接内建到确定有限自动机引擎中，在完整 Unicode 支持下保持高性能
- 自动在内存映射和增量搜索间选择最佳策略
- 使用 `RegexSet` 同时匹配多个 glob 模式来处理 `.gitignore`
- 使用无锁并行递归目录迭代器

## 在线试用

如果希望安装前先体验，可访问[在线 playground](https://codapi.org/ripgrep/)或[交互式教程](https://codapi.org/try/ripgrep/)。

## 安装

各平台安装方式请参阅 [Release 发布页](https://github.com/BurntSushi/ripgrep/releases) 或各发行版包管理器。Rust 用户可通过 `cargo install ripgrep` 安装。
