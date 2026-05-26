# fd

`fd` 是一个在你文件系统中查找条目的程序。它是一个简单、快速、友好的 [`find`](https://www.gnu.org/software/findutils/) 替代品。虽然它的目标不是支持 `find` 的所有强大功能，但它为大多数的使用情况提供了合理的（有意见的）默认值。

快速浏览：

- [如何使用](#how-to-use)

- [安装方法](#安装)

- [排除故障](#troubleshooting)

## 特点

- 直观的语法：用 `fd PATTERN` 代替 `find -iname '*PATTERN*'`

- 使用正则表达式（默认）和 GLOB 模式

- 由于并行遍历目录，[速度非常快](#benchmark)

- 使用颜色来突出不同的文件类型（像 `ls` 一样）

- 支持[并发执行命令](#command-execution)

- 智能大小写：默认情况下，搜索是不区分大小写的。如果模式包含一个大写字母，它将切换到大小写敏感 [\*](http://vimdoc.sourceforge.net/htmldoc/options.html#'smartcase')

- 默认忽略隐藏目录和文件

- 默认忽略你 `.gitignore` 文件中的模式

- 该命令比 `find` 短了 50% [\*](https://github.com/ggreer/the_silver_searcher) :-)

## Demo

![](https://github.com/sharkdp/fd/raw/master/doc/screencast.svg)

## 如何使用 <a name="how-to-use"></a>

首先，为了了解所有可用的命令行选项概况，你可以运行 [`fd -h`](#command-line-options) 获得简明的帮助信息，或者运行 `fd --help` 获得更详细的版本。

### 简单搜索

_fd_ 被设计用来在你的文件系统中寻找条目。你可以进行的最基本的搜索，_fd_ 只带一个参数：搜索模式。例如，假设你想找到你的一个旧脚本（它名字包含 `netflix`）：

```bash
> fd netfl
Software/python/imdb-ratings/netflix-details.py
```

如果像这样只调用一个参数，_fd_ 会递归搜索当前目录中任何包含 `netfl` 模式的条目。

### 正则表达式搜索

搜索模式被当作一个正则表达式来处理。这里，我们搜索以 `x` 开头、以 `rc` 结尾的条目：

```bash
> cd /etc
> fd '^x.*rc$'
X11/xinit/xinitrc
X11/xinit/xserverrc
```

`fd` 使用的正则表达式语法在[这里](https://docs.rs/regex/1.0.0/regex/#syntax)。

### 指定根目录

如果我们想搜索一个特定的目录，可以把它作为 _fd_ 的第二个参数：

```bash
> fd passwd /etc
/etc/default/passwd
/etc/pam.d/passwd
/etc/passwd
```

### 列出所有文件，递归

_fd_ 可以在没有参数的情况下被调用。这对于快速了解当前目录中的所有条目非常有用，它是递归的（类似于 `ls -R`）：

```bash
> cd fd/tests
> fd
testenv
testenv/mod.rs
tests.rs
```

如果你想使用这个功能来列出一个给定目录中的所有文件，你必须使用一个全包模式，如 `.`或 `^`：

```bash
> fd . fd/tests/
testenv
testenv/mod.rs
tests.rs
```

### 搜索一个特定的文件扩展名

通常，我们对某一特定类型的所有文件感兴趣。这可以用 `-e`（或 `--extension`）选项来完成。在这里，我们搜索 _fd_ 资源库中的所有 Markdown 文件：

```bash
> cd fd
> fd -e md
CONTRIBUTING.md
README.md
```

`-e` 选项可以与搜索模式结合使用：

```bash
> fd -e rs mod
src/fshelper/mod.rs
src/lscolors/mod.rs
tests/testenv/mod.rs
```

### 搜索一个特定的文件名

要找到与所提供的搜索模式完全一致的文件，请使用 `-g`（或 `--glob`）选项：

```bash
> fd -g libc.so /usr
/usr/lib32/libc.so
/usr/lib/libc.so
```

### 隐藏和忽略的文件

默认情况下，_fd_ 不搜索隐藏目录，也不在搜索结果中显示隐藏文件。要禁用这种行为，我们可以使用 `-H`（或 `--hidden`）选项：

```bash
> fd pre-commit
> fd -H pre-commit
.git/hooks/pre-commit.sample
```

如果我们在一个属于 Git 仓库（或包括 Git 仓库）的目录中工作，fd 不会搜索符合 .gitignore 模式之一的文件夹（也不会显示文件）。要禁用这种行为，我们可以使用 `-I`（或 `--no-ignore`）选项：

```bash
> fd num_cpu
> fd -I num_cpu
target/debug/deps/libnum_cpus-f5ce7ef99006aa05.rlib
```

要真正搜索_所有_文件和目录，只需将隐藏和忽略功能结合起来就可以显示所有的东西（`-HI`）。

### 匹配完整路径

默认情况下，_fd_ 只匹配每个文件的文件名。然而，使用 `--full-path` 或 `-p` 选项，你可以对全路径进行匹配：

```bash
> fd -p -g '**/.git/config'
> fd -p '.*/lesson-\d+/[a-z]+.(jpg|png)'
```

### 命令执行 <a name="command-execution"></a>

比起只是显示搜索结果，你往往还想对它们做另一些事情。`fd` 提供了两种方法来为你的每一个搜索结果执行外部命令

- `-x`/`--exec` 选项为每个搜索结果运行一个外部命令（并行）。

- `-X`/`--exec-batch` 选项启动一次外部命令，将所有搜索结果作为参数。

#### 例子

递归找到所有的压缩文件并解压：

```bash
fd -e zip -x unzip
```

如果有两个这样的文件，`file1.zip` 和 `backup/file2.zip`，这将执行 `unzip file1.zip` 和 `unzip backup/file2.zip`。这两个解压过程并行运行（如果文件找到的速度足够快）。

找到所有的*.h和*.cpp文件，用clang-format -i将它们自动格式化：

```bash
fd -e h -e cpp -x clang-format -i
```

注意 `clang-format` 的 `-i` 选项可以作为一个单独的参数传递。这就是为什么我们把 `-x` 选项放在最后。

找到所有`test_*.py`文件，用你喜欢的编辑器打开它们：

```bash
fd -g 'test_*.py' -X vim
```

注意，在这里我们使用大写的 `-X` 来打开一个vim实例。如果有两个这样的文件，`test_basic.py` 和 `lib/test_advanced.py`，这将运行 `vim test_basic.py lib/test_advanced.py`。

要查看文件权限、所有者、文件大小等细节，你可以告诉`fd`通过对每个结果运行`ls`来显示它们：

```bash
fd … -X ls -lhd --color=always
```

这个模式非常有用，`fd` 提供了一个快捷方式。你可以使用 `-l`/`--list-details` 选项，以这种方式执行ls：`fd … -l`。

当把 `fd` 和 [ripgrep](https://github.com/BurntSushi/ripgrep/)（`rg`）结合起来时，`-X` 选项也很有用，可以在某一类文件中搜索，比如所有的 C++ 源代码文件：

```bash
fd -e cpp -e cxx -e h -e hpp -X rg 'std::cout'
```

将所有 \*.jpg 文件转换为 \*.png 文件：

```bash
fd -e jpg -x convert {} {.}.png
```

在这里，`{}` 是搜索结果的一个占位符。`{.}` 也是如此，但它没有文件扩展名。关于占位符语法的更多细节，见下文。

使用 `-x` 从并行线程运行的命令，终端输出不会交错或乱码，所以 `fd -x` 可以用来粗略地将一个在许多文件上运行的任务并行化。这方面的一个例子是计算一个目录中每个单独文件的校验和。

```bash
fd -tf -x md5sum > file_checksums.txt
```

#### 占位符语法

`-x` 和 `-X` 选项将一个命令模板作为一系列参数（而不是一个单一的字符串）。如果你想在命令模板之后给fd添加额外的选项，你可以用 `\;` 来终止它。

生成命令的语法与 [GNU Parallel](https://www.gnu.org/software/parallel/) 类似：

- `{}`： 一个占位符，将被替换为搜索结果的路径（documents/images/party.jpg）。

- `{.}`：和 `{}` 一样，但没有文件扩展名（documents/images/party）。

- `{/}`：一个占位符，将被搜索结果的基本名称（party.jpg）取代。

- `{//}`：已发现路径的父级（documents/images）。

- `{/.}`：去掉扩展名的基本名（party）。

如果你不包括占位符，_fd_ 会自动在末尾添加一个 `{}`。

#### 并行执行与串行执行

对于 `-x`/`--exec`，你可以通过使用 `-j`/`--threads` 选项控制并行作业的数量。使用 `--threads=1` 进行串行执行。

### 排除特定的文件或目录

有时我们想忽略来自特定子目录的搜索结果。例如，我们可能想搜索所有隐藏的文件和目录（`-H`），但排除所有来自 `.git` 目录的匹配。我们可以使用 `-E`（或 `--exclude`）选项来实现这一点。它需要一个任意的 glob 模式作为参数：

```bash
> fd -H -E .git …
```

我们也可以用它来跳过挂载的目录：

```bash
> fd -E /mnt/external-drive …
```

.. 或者跳过某些文件类型：

```bash
> fd -E '*.bak' …
```

为了使排除模式永久化，你可以创建一个 `.fdignore` 文件。它们的工作方式与 `.gitignore` 文件类似，但都是针对 `fd` 的。比如说：

```bash
> cat ~/.fdignore
/mnt/external-drive
*.bak
```

注意：`fd` 也支持其他程序使用的 `.ignore` 文件，如 `rg` 或 `ag` 。

如果你想让 `fd` 在全局范围内忽略这些模式，你可以把它们放在 `fd` 的全局忽略文件中。在 macOS 或 Linux 中，这个文件通常位于 `~/.config/fd/ignore`，在Windows中则位于 `%APPDATA%\fd/ignore`。

### 删除文件

你可以使用 `fd` 来删除所有与你的搜索模式相匹配的文件和目录。如果你只想删除文件，你可以使用 `--exec-batch`/`-X` 选项来调用 `rm`。例如，要递归地删除所有 `.DS_Store` 文件，请运行：

```bash
> fd -H '^\.DS_Store$' -tf -X rm
```

如果你不确定是否需要删除，请先调用不带 `-X rm` 的 `fd`。或者，使用 `rm` 的 “interactive” 选项：

```bash
> fd -H '^\.DS_Store$' -tf -X rm -i
```

如果你还想删除某类目录，可以使用相同的技巧。你必须使用 `rm` 的 `--recursive`/`-r` 标志来删除目录。

注意：在某些情况下，使用 `fd … -X rm -r` 会导致竞争条件：如果你有一个像 `.../foo/bar/foo/...` 的路径，并且想删除所有名为 `foo` 的目录，那么你可能会首先删除外部的 `foo` 目录，从而在 `rm` 调用中导致（无害的）_"'foo/bar/foo': No such file or directory"_ 错误产生。

### 命令行选项 <a name="command-line-options"></a>

这是 `fd -h` 的输出。要查看全部的命令行选项，请使用 `fd --help`，它包括一个更详细的帮助文本。

```bas
Usage: fd [OPTIONS] [pattern] [path]...

Arguments:
  [pattern]  搜索模式 (正则表达式，除非使用了 '--glob'; 可选的)
  [path]...  文件系统搜索的根目录 (可选的)

Options:
  -H, --hidden                     搜索隐藏的文件和目录
  -I, --no-ignore                  不遵从 .(git|fd)ignore 文件
  -s, --case-sensitive             区分大小写的搜索 (默认: 智能大小写)
  -i, --ignore-case                不区分大小写的搜索 (默认: 智能大小写)
  -g, --glob                       基于Glob的搜索 (默认: 正则表达式)
  -a, --absolute-path              显示绝对路径而不是相对路径
  -l, --list-details               使用带有文件元数据的长列表格式
  -L, --follow                     遵循符号链接
  -p, --full-path                  搜索完整路径 (默认: 仅文件名)
  -d, --max-depth <depth>          设置最大搜索深度 (默认: 无)
  -E, --exclude <pattern>          排除符合给定 glob 模式的条目
  -t, --type <filetype>            按类型过滤: file (f), directory (d), symlink (l),
                                   executable (x), empty (e), socket (s), pipe (p)
  -e, --extension <ext>            按文件扩展名过滤
  -S, --size <size>                根据文件的大小限制结果
      --changed-within <date|dur>  按文件修改时间过滤 (较新)
      --changed-before <date|dur>  按文件修改时间过滤 (较旧)
  -o, --owner <user:group>         按拥有文件的用户 (和/或者) 组
  -x, --exec <cmd>...              对每个搜索结果执行命令
  -X, --exec-batch <cmd>...        一次执行包含所有搜索结果的命令
  -c, --color <when>               什么时候使用颜色 [默认: auto] [可以使用的值: auto,
                                   always, never]
  -h, --help                       打印帮助信息 (使用 `--help` 获取更多细节)
  -V, --version                    打印版本信息
```

## 基准测试 <a name="benchmark"></a>

让我们在我的主文件夹中搜索以 `[0-9].jpg` 结尾的文件。它包含大约190,000个子目录和一百万个文件。对于平均数和统计分析，我使用了[hyperfine](https://github.com/sharkdp/hyperfine)。以下基准测试是使用 "warm"/pre-filled 磁盘缓存执行的（"cold" 磁盘缓存的结果显示相同的趋势）。

让我们从 `find` 开始：

```bash
Benchmark #1: find ~ -iregex '.*[0-9]\.jpg$'

  Time (mean ± σ):      7.236 s ±  0.090 s

  Range (min … max):    7.133 s …  7.385 s
```

如果不使用正则表达式搜索，`find` 的速度会快很多：

```bash
Benchmark #2: find ~ -iname '*[0-9].jpg'

  Time (mean ± σ):      3.914 s ±  0.027 s

  Range (min … max):    3.876 s …  3.964 s
```

现在让我们对 `fd` 做同样的尝试。注意，`fd` _总是_ 执行一个正则表达式搜索。为了进行公平的比较，需要有选项 `--hidden` 和 `--no-ignore`，否则 `fd` 就不遍历隐藏的文件夹和忽略的路径（见下文）：

```bash
Benchmark #3: fd -HI '.*[0-9]\.jpg$' ~

  Time (mean ± σ):     811.6 ms ±  26.9 ms

  Range (min … max):   786.0 ms … 870.7 ms
```

对于这个特定的例子，`fd` 比 `find -iregex` 快了大约9倍，比 `find -iname` 快了大约5倍。顺便说一下，两个工具都找到了完全相同的20880个文件 😄。

最后，让我们在没有 `--hidden` 和 `--no-ignore` 的情况下运行 `fd`（当然，这会导致不同的搜索结果）。如果 `fd` 不必遍历隐藏的和 git 忽略的文件夹，它几乎快了一个数量级：

```bash
Benchmark #4: fd '[0-9]\.jpg$' ~

  Time (mean ± σ):     123.7 ms ±   6.0 ms

  Range (min … max):   118.8 ms … 140.0 ms
```

**注意**：这是一个特定机器上的一个特定基准。虽然我已经进行了相当多的不同测试（并发现了一致的结果），但对你来说，情况可能会有所不同！我鼓励大家自己尝试。我鼓励大家自己去尝试。所有必要的脚本请见[这个仓库](https://github.com/sharkdp/fd-benchmarks)。

关于 _fd_ 的速度，主要归功于 `regex` 和 `ignore` 模块，它们也被用在 [ripgrep](https://github.com/BurntSushi/ripgrep) 中（快来看看吧！）。

## 排除故障 <a name="troubleshooting"></a>

### 彩色化输出

`fd` 可以按扩展名给文件着色，就像 `ls` 一样。为了使其发挥作用，环境变量 [`LS_COLORS`](https://linux.die.net/man/5/dir_colors) 必须被设置。通常，这个变量的值是由 `dircolors` 命令设置的，它提供了一个方便的配置格式来定义不同文件格式的颜色。在大多数发行版上，`LS_COLORS` 应该已经被设置了。如果你是在 Windows 系统上，或者你在寻找其他更完整（或更多彩）的变体，请看[这里](https://github.com/sharkdp/vivid)、[这里](https://github.com/seebi/dircolors-solarized)或[这里](https://github.com/trapd00r/LS_COLORS)。

`fd` 也遵守 `NO_COLOR` 环境变量的规定。

### fd没有找到我的文件

记住，`fd` 默认会忽略隐藏的目录和文件。它还会忽略 `.gitignore` 文件的模式。如果你想确保绝对找到所有可能的文件，一定要使用选项 `-H` 和 `-I` 来禁用这两个功能：

```bash
> fd -HI …
```

### `fd` 似乎不能正确地解释我的正则表达式模式

许多特殊正则表达式字符（如`[]`、`^`、`$`、..）也是shell中的特殊字符。如果有疑问，请务必在正则表达式模式周围加上单引号：

```bash
> fd '^[A-Z][0-9]+$'
```

如果模式以破折号开始，则必须添加 `--` 以表示命令行选项的结束。否则，该模式将被解释为命令行选项。或者，使用带有单个连字符的字符类：

```bash
> fd -- '-pattern'
> fd '[-]pattern'
```

### 执行`alias`或shell函数提示 “Command not found”

Shell `alias` 和 shell 函数不能通过 `fd -x` 或 `fd -X` 命令执行。在 `zsh` 中，你可以通过 `alias -g myalias="... "` 使别名成为全局的。在 `bash` 中，你可以使用 `export -f my_function` 使子进程可用。你仍然需要调用 `fd -x bash -c 'my_function "$1"' bash`。对于其他用例或shell，可以使用一个（临时）shell脚本。

## 与其他项目的整合

### 与 `fzf` 一起使用

您可以使用 _fd_ 为命令行模糊查找器 [fzf](https://github.com/junegunn/fzf) 生成输入：

```bash
export FZF_DEFAULT_COMMAND='fd --type file'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
```

然后，你可以在终端上键入 `vim <Ctrl-T>` 以打开 fzf 并搜索 fd 结果。

或者，你可能希望遵循符号链接并包含隐藏文件（但不包括.git文件夹）：

```bash
export FZF_DEFAULT_COMMAND='fd --type file --follow --hidden --exclude .git'
```

你甚至可以通过以下设置在 fzf 中使用 fd 的彩色输出：

```bash
export FZF_DEFAULT_COMMAND="fd --type file --color=always"
export FZF_DEFAULT_OPTS="--ansi"
```

更多细节，见 fzf README 中的[提示部分](https://github.com/junegunn/fzf#tips)。

### 与 `rofi` 一起使用

[_rofi_](https://github.com/davatorium/rofi) 是一个图形化的启动菜单应用程序，它能够通过从 _stdin_ 读取信息来创建菜单。用管道将`fd` 输出导入 `rofi` 的 `-dmenu` 模式，可以创建模糊搜索的文件和目录列表。

#### 例子

在 `$HOME` 目录下创建一个不区分大小写的可搜索PDF 文件的多选列表，并用你配置的PDF查看器打开选择。要想列出所有文件类型，请删除-e pdf参数。

```bash
fd --type f -e pdf . $HOME | rofi -keep-right -dmenu -i -p FILES -multi-select | xargs -I {} xdg-open {}
```

### 与 `emac` 一起使用

emacs 包 [find-file-in-project](https://github.com/technomancy/find-file-in-project) 可以使用 _fd_ 来查找文件。

安装 find-file-in-project 后，在你的 `~/.emacs` 或 `~/.emacs.d/init.el` 文件中添加一行`(setq ffip-use-rust-fd t)`。

在 emacs 中，运行 `M-x find-file-in-project-by-selected` 来寻找匹配的文件。或者，运行 `M-x find-file-in-project` 来列出项目中所有可用的文件。

### 将输出结果打印成树状

为了使 `fd` 的输出格式类似于 `tree` 命令，请安装 [`as-tree`](https://github.com/jez/as-tree)，并将 `fd` 的输出通过管道输送到 `as-tree`。

```bash
fd | as-tree
```

这可能比运行 `tree` 本身更有用，因为 `tree` 默认不会忽略任何文件，也不像 `fd` 那样支持丰富的选项来控制打印的内容。

```bash
❯ fd --extension rs | as-tree
.
├── build.rs
└── src
    ├── app.rs
    └── error.rs
```

关于 `as-tree` 的更多信息，请参见 `as-tree` 的 [README](https://github.com/jez/as-tree)。

### 与 `xargs` 或 `parallel` 一起使用

请注意，`fd` 有一个内置的[命令执行](#command-execution)功能，即它的`-x`/`--exec` 和 `-X`/`--exec-batch` 选项。如果你愿意，你仍然可以将它与 `xargs` 结合使用：

```bash
> fd -0 -e rs | xargs -0 wc -l
```

这里，`-0` 选项告诉 _fd_ 用 NULL 字符（而不是换行）来分隔搜索结果。同样地，`xargs` 的 `-0` 选项告诉它以这种方式读取输入。

## 安装

各平台安装方式请参阅 [Release 发布页](https://github.com/sharkdp/fd/releases)，或各发行版包管理器。Rust 用户可通过 `cargo install fd-find` 安装。
