# bat

类似cat，但带有 git 集成和语法高亮.

## 优点

### 语法高亮

`bat` 对大部分编程语言和标记语言提供语法高亮：

![Syntax highlighting example](https://imgur.com/rGsdnDe.png)

### Git 集成

`bat` 能从 git 中获取文件的修改并展示在边栏（见下图）：

![Git integration example](https://i.imgur.com/2lSW4RE.png)

### 不可打印(non-printable)字符可视化

添加`-A`/`--show-all`参数可以文件文件中的不可打印字符:

![Non-printable character example](https://i.imgur.com/WndGp9H.png)

### 自动分页

`bat`会在一般情况下将大于屏幕可显示范围的内容输出到分页器(pager, e.g. `less`)。

你可以在调用时添加`--paging=never`参数来使`bat`不使用分页器（就像`cat`一样）。
如果你想要用为`cat`使用`bat`别名，可以在 shell 配置文件（shell configuration）中添加`alias cat='bat --paging=never'`。

#### 智能输出

`bat`能够在设置了分页器选项的同时进行管道:wink:。
当`bat`检测到当前环境为非可交互终端或管道时（例如使用`bat`并将内容用管道输出到文件），`bat`会像`cat`一样，一次输出文件内容为纯文本且无视`--paging`参数。

## 如何使用

在终端中查看一个文件

```bash
> bat README.md
```

一次性展示多个文件

```bash
> bat src/*.rs
```

从`stdin`读入流，自动为内容添加语法高亮（前提是输入内容的语言可以被正确识别，通常根据内容第一行的 shebang 标记，形如`#!bin/sh`）

```bash
> curl -s https://sh.rustup.rs | bat
```

显式指定`stdin`输入的语言

```bash
> yaml2json .travis.yml | json_pp | bat -l json
```

显示不可打印字符

```bash
> bat -A /etc/hosts
```

与`cat`的兼容性

```bash
bat > note.md  # 创建一个空文件

bat header.md content.md footer.md > document.md

bat -n main.rs  # 只显示行号

bat f - g  # 输出 f，接着是标准输入流，最后 g
```

### 第三方工具交互

#### `fzf`

你可以使用`bat`作为`fzf`的预览器。这需要在`bat`后添加`--color=always`选项，以及`--line-range` 选项来限制大文件的加载次数。

```bash
fzf --preview 'bat --color=always --style=numbers --line-range=:500 {}'
```

更多信息请参阅[`fzf`的说明](https://github.com/junegunn/fzf#preview-window)。

#### `find` 或 `fd`

你可以使用`find`的`-exec`选项来用`bat`预览搜索结果：

```bash
find … -exec bat {} +
```

亦或者在用`fd`时添加`-X`/`--exec-batch`选项：

```bash
fd … -X bat
```

#### `ripgrep`

`bat`也能用`batgrep`来显示`ripgrep`的搜索结果。

```bash
batgrep needle src/
```

#### `tail -f`

当与`tail -f`一起使用，`bat`可以持续监视文件内容并为其添加语法高亮。

```bash
tail -f /var/log/pacman.log | bat --paging=never -l log
```

注意：这项功能需要在关闭分页时使用，同时要手动指定输入的内容语法（通过`-l log`）。

#### `git`

`bat`也能直接接受来自`git show`的输出并为其添加语法高亮（当然也需要手动指定语法）：

```bash
git show v0.6.0:src/main.rs | bat -l rs
```

#### `git diff`

`bat`也可以和`git diff`一起使用：

```bash
batdiff() {
    git diff --name-only --relative --diff-filter=d -z | xargs -0 bat --diff
}
```

该功能也作为一个独立工具提供，你可以在[`bat-extras`](https://github.com/eth-p/bat-extras)中找到`batdiff`。

如果你想了解更多 git 和 diff 的信息，参阅[`delta`](https://github.com/dandavison/delta)。

#### `xclip`

当需要拷贝文件内容时，行号以及 git 标记会影响输出，此时可以使用`-p`/`--plain`参数来把纯文本传递给`xclip`。

```bash
bat main.cpp | xclip
```

`bat`会检测输出是否是管道重定向来决定是否使用纯文本输出。

#### `man`

`bat` 可以通过设置 `MANPAGER` 环境变量，用作 `man` 的彩色分页器：

```bash
export MANPAGER="sh -c 'awk '\''{ gsub(/\x1B\[[0-9;]*m/, \"\", \$0); gsub(/.\x08/, \"\", \$0); print }'\'' | bat -p -lman'"
man 2 select
```

（如果你使用 Debian 或 Ubuntu，请将 `batcat` 替换为 `bat`）

如果你希望将其打包为一个新的命令，也可以使用 [`batman`](https://github.com/eth-p/bat-extras/blob/master/doc/batman.md)。

> [!WARNING]
> 在使用 Mandoc 的 `man` 实现时，这[无法](https://github.com/sharkdp/bat/issues/1145)直接工作。
>
> 请使用 `batman`，或将此 Shell 脚本包装为 [Shebang 可执行文件](<https://en.wikipedia.org/wiki/Shebang_(Unix)>)，并将 `MANPAGER` 指向该文件。

注意，[Manpage 语法](https://github.com/sharkdp/bat/blob/master/assets/syntaxes/02_Extra/Manpage.sublime-syntax)是在此仓库中开发的，仍需一些改进。

#### `prettier` / `shfmt` / `rustfmt`

`prettybat`脚本能够格式化代码并用`bat`输出。

## 安装

各平台安装方式请参阅 [Release 发布页](https://github.com/sharkdp/bat/releases) 或各发行版的包管理器。

## 自定义

### 语法高亮主题

使用 `bat --list-themes` 一份语法高亮主题的清单，然后用`--theme=TwoDark`来指定主题为`TwoDark`，也可以通过设置`BAT_THEME`环境变量来选定主题。
把`export BAT_THEME="TwoDark"`添加到 shell 的启动脚本（shell startup file）来取得永久效果。或者使用`bat`的[配置文件](#配置文件)

若想要查看所有主题在一个文件上的显示效果可以用一下命令（需要安装`fzf`）：

```bash
bat --list-themes | fzf --preview="bat --theme={} --color=always /path/to/file"
```

`bat`在默认情况下能够在黑色主题背景下获得较好的效果，如果你的终端使用亮色背景，可以试试`GitHub`或`OneHalfLight`。想要添加自定义主题可以参考[添加主题](#添加主题)。

### 8-bit 主题

`bat` 自带三个 [8-bit 色彩](https://en.wikipedia.org/wiki/ANSI_escape_code#Colors) 主题：

- `ansi` 适应于大部分终端。它使用 3-bit 色彩：黑红绿黄蓝洋红靛青白。
- `base16`专为 [base16](https://github.com/tinted-theming/home) 终端设计。
  它使用 4-bit 色彩（带有亮度的 3-bit 色彩）。
  根据 [base16 styling guidelines](https://github.com/tinted-theming/home/blob/main/styling.md) 制作。
- `base16-25`专为 [base16-shell](https://github.com/tinted-theming/base16-shell) 设计。
  它把部分亮色替换为 8-bit 色彩。请不要直接使用该主题，除非你清楚你的256色终端是否使用 base16-shell。

尽管这些主题具有诸多限制，但具有一些 truecolor 主题不具有的三个优点：

- 享有最佳兼容性。并不是所有终端工具都支持高于 3-bit 的色彩。
- 适应终端主题。
- 视觉上和其他的终端工具更协调。

### 输出样式

你可以用`--style`参数来控制`bat`输出的样式。使用`--style=numbers,changes`可以只开启 Git 修改和行号显示而不添加其他内容。`BAT_STYLE`环境变量具有相同功能。

### 添加新的语言和语法

当现有的`bat`不支持某个语言或语法时你可以自己添加。

`bat`使用`syntect`库来支持语法高亮，该库使用 [Sublime Text `.sublime-syntax` 语法文件](https://www.sublimetext.com/docs/3/syntax.html)和主题。
而后者中的大部分可以在 [Package Control](https://packagecontrol.io/) 找到。

当你找到一份语法文件，按照下列方法：

1. 创建包含语法描述文件的目录：

   ```bash
   mkdir -p "$(bat --config-dir)/syntaxes"
   cd "$(bat --config-dir)/syntaxes"

   # Put new '.sublime-syntax' language definition files
   # in this folder (or its subdirectories), for example:
   git clone https://github.com/tellnobody1/sublime-purescript-syntax
   ```

2. 调用下面指令把文件转换为二进制缓存：

   ```bash
   bat cache --build
   ```

3. 最后用`bat --list-languages`来检查新的语法是否被成功导入。如果想要回滚到最初状态，执行：

   ```bash
   bat cache --clear
   ```

4. 如果你觉得`bat`有必要自带该语法支持，请在阅读[指导](https://github.com/sharkdp/bat/blob/master/doc/assets.md)后向仓库提交 [Syntax Request](https://github.com/sharkdp/bat/issues/new?labels=syntax-request&template=syntax_request.md)。

### 添加主题

类似添加语法支持，第一步也是创建一个带有语法高亮的目录

```bash
mkdir -p "$(bat --config-dir)/themes"
cd "$(bat --config-dir)/themes"

# 下载一个主题
git clone https://github.com/greggb/sublime-snazzy

# 更新二进制缓存
bat cache --build
```

然后用`bat --list-themes`检查添加是否成功。

### 添加或修改文件关联

你可以用`--map-syntax`参数添加或修改文件名模板。
它需要一个类似`pattern:syntax`的参数来指定，其中`pattern`是 glob 文件匹配模板，
`syntax`则是支持的语法的完整名（使用`bat --list-languages`来查看获取一份清单）。

注意：方便起见，你可能需要把参数添加到配置文件，而不是每次都在命令行中传递该参数。

以下展示了把“INI”关联到具有`.conf`扩展名的文件

```bash
--map-syntax='*.conf:INI'
```

把`.ignore`文件与“Git Ignore”关联

```bash
--map-syntax='.ignore:Git Ignore'
```

把`/etc/apache2`内的`.conf`文件关联到“Apache Conf”语法（`bat`已默认绑定）

```bash
--map-syntax='/etc/apache2/**/*.conf:Apache Conf'
```

### 使用自定义分页器

`bat`默认使用`PAGER`环境变量定义的分页器，如果没有定义则使用`less`。`bat`提供了`BAT_PAGER`环境变量来专为`bat`选择分页器（优先级高于`PAGER`）。

注意：当`PAGER`设置为`more`或`most`时，`bat`会使用`less`来代替以确保能提供色彩支持。

```bash
export BAT_PAGER="less -RF"
```

除了使用环境变量来改变`bat`使用的的分页器，也可以在配置文件中提供`--pager`参数。

注意：`bat`会把部分命令行参数直接传递给分页器：`-R`/`--RAW-CONTROL-CHARS`,`-F`/`--quit-if-one-screen`以及`-X`/`--no-init`（该参数仅适用于高于530版本的`less`）。
其中`-R` 参数需要在解释 ANSI 标准颜色时起作用。`-F`则指示`less`在输出内容的垂直尺寸小于终端尺寸时立即退出。
当文件内容可以在一个屏幕里完全显示时，就不需要按`q`键退出阅读模式，很方便就是了。
`-X`则能修复`-F`在`less`的老版本中的一些bug（代价是不支持鼠标滚轮，但可以用`-R`来取消`quit-if-one-screen`功能。）。

### 缩进

`bat` 使用四个空格宽的制表符，而不受分页器影响，同时也可以用`--tabs`参数来自定义。

注意：通过其他方法针对分页器的制表符设置不会生效（例如通过`bat`的`--pager`参数传递或`less`使用的`LESS`环境变量）。因为在输出提交给分页器之前，内容中的制表符就已经被`bat`替换为了特定长度的空格以避免由于边栏导致的缩进问题。你可以用给`bat`传递`--tabs=0`参数来取消该设定并让分页器自己处理制表符。

### 暗色模式

如果你用的 macOS 处于暗色模式，你可以为`bat`启用基于系统主题的主题。如下所示操作会让`bat`在系统处于亮色模式时加载`GitHub`主题和暗色模式时加载`default`主题。

```bash
alias cat="bat --theme=\$(defaults read -globalDomain AppleInterfaceStyle &> /dev/null && echo default || echo GitHub)"
```

## 配置文件

```bash
bat --config-file
```

你也可以用`BAT_CONFIG_PATH`来为`bat`指定自定义位置的配置文件：

```bash
export BAT_CONFIG_PATH="/path/to/bat.conf"
```

使用`--generate-config-file`参数调用`bat`会在指定位置生成一份默认的`bat`配置文件：

```bash
bat --generate-config-file
```

### 格式

配置文件其实是一份按行分割的命令行参数列表。你可以用`bat --help`来查看所有可用的参数和适用的值。配置文件中`#`打头的行会被视为注释而不生效。

以下是一份示例：

```bash
# 设置主题为 TwoDark
--theme="TwoDark"

# 显示行号和 Git 修改信息， 但没有边框
--style="numbers,changes,header"

# 在终端中以斜体输出文本（不是所有终端都支持）
--italic-text=always

# 使用 C++ 语法来给 Arduino 的 .ino 文件提供高亮
--map-syntax "*.ino:C++"
```
