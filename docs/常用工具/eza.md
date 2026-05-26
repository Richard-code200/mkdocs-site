# eza

`ls` 的现代替代品，更丰富的功能和更好的默认值。

![eza demo gif](https://raw.githubusercontent.com/eza-community/eza/main/docs/images/screenshots.png)

**eza** 使用颜色区分文件类型和元数据，可识别符号链接、扩展属性和 Git 状态。它**小巧**、**快速**，且只是**单个二进制文件**。

## 相比 exa 新增的功能

- 修复了 exa 2021 年引入的 ["The Grid Bug"](https://github.com/eza-community/eza/issues/66#issuecomment-1656758327)
- 超链接支持
- 挂载点详情
- SELinux 上下文输出
- Git 仓库状态输出
- 人类可读的相对日期
- 多项安全修复
- 支持 `bright` 终端颜色
- 大量 bug 修复
- 通过 `theme.yml` 配置文件自定义颜色和图标

## 试一试

```bash
nix run github:eza-community/eza            # 需要 Nix (flake 支持)
nix run github:eza-community/eza -- -ol     # 传参
```

## 安装

各平台安装方式请参阅 [INSTALL.md](https://github.com/eza-community/eza/blob/main/INSTALL.md) 或各发行版包管理器。

## 命令行选项

eza 的选项与 `ls` 类似但不完全相同。快速概览：

### 显示选项

- **-1**, **--oneline**：每行显示一个条目
- **-G**, **--grid**：以网格形式显示（默认）
- **-l**, **--long**：显示扩展详情和属性
- **-R**, **--recurse**：递归进入目录
- **-T**, **--tree**：以树形递归进入目录
- **-x**, **--across**：横向排序网格
- **-F**, **--classify=(when)**：按文件名显示类型指示符（always, auto, never）
- **--colo[u]r=(when)**：何时使用终端颜色（always, auto, never）
- **--colo[u]r-scale=(field)**：对文件 age 或 size 区分着色
- **--color-scale-mode=(mode)**：使用 gradient 或 fixed 模式着色
- **--icons=(when)**：何时显示图标（always, auto, never）
- **--hyperlink=(when)**：何时将条目显示为超链接（always, auto, never）
- **--absolute=(mode)**：显示绝对路径（on, follow, off）
- **-w**, **--width=(columns)**：设置屏幕宽度（列数）

### 过滤选项

- **-a**, **--all**：显示隐藏文件和 '.' 文件
- **-d**, **--treat-dirs-as-files**：像普通文件一样列出目录
- **-L**, **--level=(depth)**：限制递归深度
- **-r**, **--reverse**：反转排序方向
- **-s**, **--sort=(field)**：按字段排序
- **--group-directories-first**：目录排在前面
- **--group-directories-last**：目录排在后面
- **-D**, **--only-dirs**：仅列出目录
- **-f**, **--only-files**：仅列出文件
- **--no-symlinks**：不显示符号链接
- **--show-symlinks**：显式显示链接（配合 `--only-dirs` / `--only-files` 时）
- **--git-ignore**：忽略 `.gitignore` 中的文件
- **-I**, **--ignore-glob=(globs)**：忽略匹配的 glob 模式（管道分隔）

传入 `--all` 两次可同时显示 `.` 和 `..` 目录。

### -l 长列表选项

以下选项在配合 `--long` (`-l`) 时生效：

- **-b**, **--binary**：使用二进制前缀显示文件大小
- **-B**, **--bytes**：以字节显示文件大小，不带前缀
- **-g**, **--group**：列出文件的组
- **--smart-group**：仅当组名与所有者名不同时显示组
- **-h**, **--header**：为每列添加表头
- **-H**, **--links**：列出文件的硬链接数
- **-i**, **--inode**：列出文件的 inode 编号
- **-m**, **--modified**：使用修改时间戳字段
- **-M**, **--mounts**：显示挂载详情（仅 Linux 和 macOS）
- **-S**, **--blocksize**：显示分配的文件系统块大小
- **-t**, **--time=(field)**：使用哪个时间戳字段
- **-u**, **--accessed**：使用访问时间戳
- **-U**, **--created**：使用创建时间戳
- **-X**, **--dereference**：对符号链接解引用
- **-Z**, **--context**：列出文件的安全上下文
- **-@**, **--extended**：列出文件的扩展属性及大小
- **--changed**：使用变更时间戳字段
- **--git**：列出文件的 Git 状态
- **--git-repos**：列出目录的 Git 仓库状态
- **--git-repos-no-status**：仅列出目录是否为 Git 仓库（不包含状态，更快）
- **--no-git**：禁止显示 Git 状态
- **--time-style**：时间戳格式。可选：`default`、`iso`、`long-iso`、`full-iso`、`relative`，或自定义格式 `+<FORMAT>`（如 `+%Y-%m-%d %H:%M`）
- **--total-size**：显示递归目录大小
- **--no-permissions**：隐藏权限字段
- **-o**, **--octal-permissions**：以八进制格式显示权限
- **--no-filesize**：隐藏文件大小字段
- **--no-user**：隐藏用户字段
- **--no-time**：隐藏时间字段
- **--stdin**：从 stdin 读取文件名

参数说明：

- 有效的 sort 字段：**accessed**、**changed**、**created**、**extension**、**Extension**（大写先排大写）、**inode**、**modified**、**name**、**Name**、**size**、**type**、**none**。modified 的别名：**date**、**time**、**newest**
- 有效的时间字段：**modified**、**changed**、**accessed**、**created**
- 有效的时间样式：**default**、**iso**、**long-iso**、**full-iso**、**relative**

详见 `man eza` 手册页。

## 自定义主题

eza 支持 `theme.yml` 文件，可在此文件中指定所有 `LS_COLORS` 和 `EXA_COLORS` 环境变量的主题选项，还可以为不同文件类型和扩展名指定不同的图标。已有的环境变量设置仍然有效且优先级更高。

预置主题可在官方 [eza-themes](https://github.com/eza-community/eza-themes) 仓库中找到。

主题文件需要放置在 `EZA_CONFIG_DIR` 环境变量指定的目录中，或默认在 `$XDG_CONFIG_HOME/eza` 下查找。详细说明请参阅 [man page](https://github.com/eza-community/eza/tree/main/man/eza_colors-explanation.5.md)。
