# grep：日志与代码搜索及 rg 替代工具

`grep` 用于在文件内容或命令输出中搜索匹配的行，适合日常开发中的日志定位与代码查找。

按名称、类型或路径找文件见 [find 与 fd 笔记](find_fd.md)。本笔记的 rg 作为 grep 的替代工具子章节，速查与示例分别组织。

## grep 速查

### 基本语法

```bash
grep [选项] '搜索模式' 文件或目录
```

短选项通常可以组合：`-rnF` 等价于 `-r -n -F`。搜索模式建议用单引号包起来，避免被 shell 提前解释。

### 选项的语义化记忆

| 短选项 | 对应长选项 | 含义与记忆方法 |
| --- | --- | --- |
| `-n` | `--line-number` | **number**：显示匹配行的行号 |
| `-r` | `--recursive` | **recursive**：递归搜索目录及子目录 |
| `-F` | `--fixed-strings` | **Fixed**：固定字符串，不解释正则符号 |
| `-i` | `--ignore-case` | **ignore**：忽略大小写 |
| `-w` | `--word-regexp` | **word**：匹配完整单词 |
| `-c` | `--count` | **count**：统计每个文件中匹配的行数，不是出现次数 |
| `-v` | `--invert-match` | in**vert**：反选，输出不匹配的行 |
| `-l` | `--files-with-matches` | 联想 **list files**：只列出含匹配内容的文件名 |
| `-L` | `--files-without-match` | 与 `-l` 相反：列出没有匹配内容的文件名 |
| `-E` | `--extended-regexp` | **Extended**：使用扩展正则表达式，例如用 `|` 表示“或” |
| `-A 3` | `--after-context=3` | **After**：显示匹配行及其后 3 行 |
| `-B 3` | `--before-context=3` | **Before**：显示匹配行及其前 3 行 |
| `-C 3` | `--context=3` | **Context**：显示匹配行及其前后各 3 行 |

/// info | 记忆联想不等于官方名称
`-l` 是小写字母 L，可以联想为 “list files”，但官方长选项是 `--files-with-matches`，不是 `--list`。选项区分大小写，例如 `-l` 和 `-L` 的含义不同。
///

### 文件过滤与输出判断

- `--include='*.ts'`：只搜索文件名符合模式的文件。
- `--exclude='*.md'`：排除文件名符合模式的文件，不是排除包含某段内容的行。
- `--exclude-dir=vendor`：排除指定目录；排除匹配行应使用 `-v`。
- `.` 表示当前目录；`src` 与 `./src` 等价，表示当前目录下的源码目录。
- 显示上下文时，行号后的 `:` 表示匹配行，`-` 表示上下文行；`--` 分隔不连续的上下文片段。
- 常见退出状态：`0` 表示找到匹配，`1` 表示没有匹配，通常 `2` 表示错误。

## grep 示例

下面的代码与日志示例从基础素材目录运行：

```bash
cd /home/errorichard/workspace/linux-tools-practice/datasets/basic
```

### 组合选项

组合选项时，可以读成一句话：

```bash
grep -rnF 'TODO' ./src
# recursive + number + fixed
# 递归搜索、显示行号、按普通文本匹配
```

### 代码搜索

```bash
# 显示包含 TODO 的行以及文件路径、行号
grep -rnF 'TODO' ./src

# 只显示哪些文件的内容包含 TODO
grep -rlF 'TODO' ./src

# 匹配完整单词 getUser，避免匹配 getUserName
grep -rnwF 'getUser' ./src

# 只搜索 TypeScript 文件
grep -rnF --include='*.ts' 'TODO' ./src

# 搜索项目时排除依赖目录和 Git 目录
grep -rnF --exclude-dir=node_modules --exclude-dir=.git 'getUser' .

# 排除 vendor 子目录
grep -rnF --exclude-dir=vendor 'TODO' ./src
```

`grep` 是文本搜索，不理解代码语法。匹配结果可能来自定义、调用、注释或字符串。它也不会自动遵守 `.gitignore`；需要时显式排除目录，或使用下文介绍的 `rg`。

### 日志搜索

```bash
# 忽略大小写，搜索错误并显示行号
grep -ni 'error' logs/app.log

# 查看错误前后各 5 行
grep -niC 5 'error' logs/app.log

# 搜索多个关键词
grep -niE 'error|exception|failed' logs/app.log

# 按请求 ID 追踪一次请求
grep -nF 'request-id=req-102' logs/app.log

# 排除 DEBUG 日志
grep -v 'DEBUG' logs/app.log

# 统计错误行数，忽略大小写
grep -ciF 'error' logs/app.log

# 筛选异常后排除某个请求，保留原始行号
grep -niE 'error|warn' logs/app.log | grep -vF 'request-id=req-102'

# 实时筛选新增日志，按行刷新输出
tail -f logs/app.log | grep --line-buffered -i 'error'
```

默认匹配区分大小写；希望同时匹配 `ERROR`、`error` 等形式时加上 `-i`。

### 容易混淆的地方

#### 文件名搜索与文件内容搜索

```bash
# 筛选 ls 输出的名称，不读取文件内容
ls | grep 'TODO'

# 查找内容包含 TODO 的文件，只输出文件名
grep -rlF 'TODO' ./src
```

记住：**管道中的 grep 搜索上一个命令的输出；带文件参数的 grep 搜索文件内容。**

#### 不显示行号，不等于只显示文件名

```bash
# 文件路径、行号、匹配内容
grep -rnF 'TODO' ./src

# 去掉 -n 后仍会输出匹配内容，只是不显示行号
grep -rF 'TODO' ./src

# 加上 -l 才会只显示文件名
grep -rlF 'TODO' ./src
```

#### 搜索范围：`.` 与 `./src`

- `.`：当前目录及其子目录，可能连 README、笔记等也搜到。
- `./src`：仅搜索源码目录及其子目录，结果更聚焦。

#### 普通文本与正则表达式

```bash
# 精确搜索字面上的 api.example.com
grep -nF 'api.example.com' logs/app.log

# 用扩展正则匹配 ERROR 或 WARN
grep -nE 'ERROR|WARN' logs/app.log
```

没有 `-F` 时，`.` 在正则表达式中可以匹配任意单个字符，因此搜索 `api.example.com` 也可能匹配 `apiXexampleYcom`。**搜索普通文本优先用 `-F`，需要正则时再用 `-E`。**

## rg（ripgrep）

`ripgrep` 的命令名是 `rg`，是面向行的递归文本搜索工具，适合开发中的代码和日志搜索，支持 Windows、macOS 与 Linux。它不是完全兼容 `grep` 选项的替代品，不能直接照搬所有参数。

### 速查

#### 与 grep 常见的不同点

| 场景或选项 | grep | rg |
| --- | --- | --- |
| 递归搜索目录 | 需要 `-r` | 默认递归，不需要 `-r` |
| `-r` 的含义 | `--recursive`：递归 | `--replace`：替换显示的匹配内容，需要替换文本参数，不修改文件 |
| 匹配 `error` 或 `warn` | 使用 `-E` 启用扩展正则，再以竖线连接关键词 | 默认支持竖线表示“或”，不需要 `-E` |
| `-E` 的含义 | `--extended-regexp`：扩展正则 | `--encoding`：指定编码，不是启用扩展正则 |
| 限制文件名 | `--include='*.ts'` | `--glob='*.ts'`，简写 `-g '*.ts'` |
| 排除目录 | `--exclude-dir=vendor` | `--glob='!**/vendor/**'` |
| 排除匹配行 | `-v` | 同样使用 `-v`，不要与文件过滤混淆 |
| `.gitignore` | 不自动遵守 | 在 Git 仓库内默认遵守，也支持 `.ignore` 和 `.rgignore` |
| 隐藏文件与二进制文件 | 递归时不自动排除隐藏文件；二进制匹配通常只报告文件匹配 | 目录搜索默认跳过隐藏文件，并尝试跳过二进制文件 |
| 终端显示 | 通常每行显示路径；行号需要 `-n` | 默认按文件分组显示，终端中默认显示行号；管道中建议显式加 `-n` |
| `-L` 的含义 | 列出没有匹配的文件 | 跟随符号链接；列出无匹配文件要用 `--files-without-match` |
| 无匹配时的计数 | `-c` 输出 `0` | `-c` 默认不输出零计数，需要 `--include-zero` |

/// warning | 不要把 grep 的递归选项照搬给 rg
`rg -rlF 'TODO' src` 会将 `-r` 后面的 `lF` 解析为替换文本，而不是三个独立选项，于是在输出里把 `TODO` 显示成 `lF`。这不会修改原文件。正确的“递归搜索并只列文件名”写法是 `rg -lF 'TODO' src`。
///

#### 常用选项与 glob

| 选项 | 含义 |
| --- | --- |
| `-n`、`-i`、`-F`、`-w`、`-v`、`-l` | 与 grep 中的常用含义一致：行号、忽略大小写、普通文本、完整单词、反选、仅文件名 |
| `-c` | 普通逐行搜索时统计匹配行数，不是关键词出现次数 |
| `-A 1`、`-B 1`、`-C 1` | 后一行、前一行、前后各一行的上下文 |
| `-g '*.ts'` | 限制搜索符合文件名模式的文件 |
| `-g '!**/vendor/**'` | 排除任意层级 vendor 目录内的文件 |
| `-0` / `--null` | 输出文件路径时用 NUL 分隔，适合与 `xargs -0` 配合 |
| `--no-heading -H` | 不按文件分组，并强制每行显示文件路径 |
| `--hidden` | 包含隐藏文件和目录，仍遵守忽略规则 |
| `--no-ignore` | 不遵守自动读取的忽略文件规则，仍默认跳过隐藏文件 |
| `-uuu` | 放宽忽略、隐藏及二进制过滤；仍不默认跟随符号链接，不等同于强制按文本输出二进制内容 |

glob 要用引号，避免 shell 提前展开。`!` 表示排除；`*` 不跨路径分隔符，`**` 可匹配多层目录。`!*/vendor/*` 只能覆盖特定层级，通用排除优先使用 `!**/vendor/**`。多个 glob 冲突时，后面的规则优先。

### 示例

以下示例使用 `/home/errorichard/workspace/linux-tools-practice/datasets/basic` 中的模拟文件，先进入该目录运行。输出顺序可能不同。

#### 代码搜索与文件过滤

```bash
# 只搜索 .ts 文件，排除 vendor，只列出包含 TODO 的文件名
rg -lF --glob='*.ts' --glob='!**/vendor/**' 'TODO' src
```

预期两个文件：`src/user.ts`、`src/services/auth.ts`。

```bash
# 匹配完整单词 getUser，显示行号和前后各一行上下文
rg -nwC 1 --glob='*.ts' --glob='!**/vendor/**' 'getUser' src
```

预期三个匹配行。上下文中出现 `getUserName` 不算误匹配：带 `:` 的行才是匹配行，带 `-` 的行是上下文。相邻或重叠的上下文可能合并。

#### 日志搜索与多阶段筛选

```bash
# 追踪一次请求
rg -nF 'request-id=req-102' logs/app.log

# 统计错误行数，忽略大小写，预期输出 3
rg -ciF 'error' logs/app.log

# 精确搜索域名，不匹配 apiXexampleYcom
rg -nF 'api.example.com' logs/app.log

# 匹配 error 或 warn，再排除指定请求
rg -ni 'error|warn' logs/app.log | rg -vF 'request-id=req-102'
```

最后一条输出原日志第 10、11、12 行。第一个 `rg -n` 附加原始行号；第二个 `rg` 仅过滤这些输出，不加 `-n`，避免再附加一套管道输入的行号。

```bash
# 实时筛选新增日志中的错误
tail -f logs/app.log | rg --line-buffered -i 'error'
```

#### 同一个文件同时满足两个条件

需求：只搜索 `.ts` 文件并排除 `vendor`，找出同时包含 `TODO` 和完整单词 `getUser` 的文件。两个关键词可以在不同行，只输出文件名。

```bash
rg -lF --glob='*.ts' --glob='!**/vendor/**' 'TODO' src |
  xargs -r rg -wlF 'getUser'
```

执行过程：先列出包含 `TODO` 的候选文件；`xargs` 把文件名作为参数交给第二个 `rg`；再筛选包含完整单词 `getUser` 的文件。预期两个文件：`src/user.ts`、`src/services/auth.ts`。

当前示例文件名没有空格或换行。日常开发中优先使用 NUL 分隔的稳健版本：

```bash
rg -lF -0 --glob='*.ts' --glob='!**/vendor/**' 'TODO' src |
  xargs -0 -r rg -wlF 'getUser'
```

- `rg -0` 与 `xargs -0` 配合，避免含空格、引号或换行的文件名被错误拆分。
- `xargs -r` 在没有候选文件时不执行第二个命令；这里采用 GNU/Linux 用法，其他系统需查看本机 `xargs` 帮助。
- `TODO|getUser` 表示“或”，不能保证同一个文件两个条件都满足；`TODO.*getUser` 默认只匹配同一行，也不符合这个需求。
- **管道传递文本，xargs 把输入转换成命令参数。**直接写 `rg -l 'TODO' src | rg 'getUser'`，筛选的是文件名文本，而不是重新读取文件内容。

#### 配合 fd：先选择文件，再搜索内容

fd 按名称、类型、扩展名及路径选择文件，`-X` 将路径直接作为参数批量交给 rg。以下命令从基础素材目录运行：

```bash
# 筛选 .ts 文件并排除 vendor，然后搜索完整单词 getUser
fd -t f -e ts -E vendor '' src -X rg -nwF 'getUser'

# 只列出内容包含 TODO 的候选文件名
fd -t f -e ts -E vendor '' src -X rg -lF 'TODO'

# 按路径选择 services，确保每行都显示路径、行号与内容
fd -t f -e ts -E vendor -p 'services' src -X rg -HnF --no-heading 'TODO'

# 按文件名选择 user，搜索完整单词，不匹配 getUserName
fd -t f -e ts 'user' src -X rg -HnwF --no-heading 'getUser'

# 即使只有一个日志文件也显示路径与计数
fd -t f -e log '' logs -X rg -HciF 'error'
```

`-F` 按普通文本匹配，`-w` 限定完整单词；`-l` 才是只输出文件名，去掉 `-n` 只是不显示行号。`-H` 强制显示路径，但终端默认仍按文件分组；加 `--no-heading` 才会在每条结果中显示路径。

完整的 fd 速查、文件大小边界和混合素材示例见 [find 与 fd 笔记](find_fd.md)。

## 复习与练习

练习场地位于 `/home/errorichard/workspace/linux-tools-practice`，题目放在 `exercises`，素材放在 `datasets`。基础练习先进入素材目录：

```bash
cd /home/errorichard/workspace/linux-tools-practice/datasets/basic
```

尝试不看速查表完成下面几题，再把命令和输出发给助手检查：

1. 搜索 `src` 及其子目录中的 `TODO`，显示文件路径和行号。
2. 只列出 `src` 中内容包含 `TODO` 的文件名。
3. 只搜索 `.ts` 文件中的 `TODO`，并显示行号。
4. 在 `logs/app.log` 中搜索 `error`，忽略大小写。
5. 找到 `Database timeout`，同时显示前后各两行。

完整的 11 道 grep 练习见场地中的 `exercises/grep.md`，rg 综合题见 `exercises/rg.md`，其他工具入口见场地根目录 `README.md`。混合素材进阶题需切换到 `datasets/mixed`。

本次练习已完成文件过滤、反选、上下文、计数与完整单词匹配，并用 `rg` 完成了“同一文件同时满足两个条件”的筛选。复习时重点回忆：`-l` 只列文件名、`-i` 才忽略大小写、文件过滤不能替代 `-v`，以及 `rg -r` 不是递归。

## 查阅资料

- `grep --help`：本机选项说明。
- [GNU grep 官方手册](https://www.gnu.org/software/grep/manual/grep.html)：模式语法、上下文和输出控制等完整说明。
- `rg --help`：本机详细选项说明；`rg -h` 是简短版。
- [ripgrep 官方指南](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)：默认过滤、glob 与高级使用说明。
