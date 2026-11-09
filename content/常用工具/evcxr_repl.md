---
title: "Evcxr REPL：在终端交互式学习 Rust"
created: "2026-11-10"
modified: "2026-11-10"
tags: ["常用工具", "Rust"]
---

Evcxr REPL 让你在终端输入 Rust 代码，立即编译、执行并查看结果，还能在后续输入中继续使用变量、函数和类型。REPL 是 **Read–Eval–Print Loop**，即“读取 → 求值 → 输出 → 循环”。

它适合验证一个语法点、试用标准库方法或第三方 crate，不必每次都新建 Cargo 项目。本文只介绍终端 REPL，不涉及同一项目中的 Jupyter 内核。

> [!important] 它仍然会编译代码，也不完全等同于普通 Rust 项目
> Evcxr 在每次求值时组织并编译代码，再保存可持久化的状态。它不是逐行解释器，首次执行或加载依赖可能较慢。跨次输入的借用有额外限制；涉及生命周期、模块组织和完整程序行为时，仍应回到 Cargo 项目验证。

本文以 `evcxr_repl 0.22.0` 为参考。**安装包名是 `evcxr_repl`，启动命令却是 `evcxr`**。

## 安装与启动

### 先检查，再决定是否安装

在普通终端中运行：

```bash
rustc --version
cargo --version
evcxr --version
rustup component list --installed
```

如果已经能运行 evcxr，并且组件列表中包含 `rust-src`，就不用重复安装。尚未安装、但已有 rustup 管理的 Rust 工具链时，官方安装方式是：

```bash
rustup component add rust-src
cargo install --locked evcxr_repl
```

`rust-src` 提供本地 Rust 标准库源码，供 Evcxr 的代码分析与补全等功能使用。安装它和编译 CLI 都可能需要联网；这两条是供你按需执行的安装命令，不代表阅读本文必须更改现有环境。

也可以从 [官方 Releases](https://github.com/evcxr/evcxr/releases) 下载预编译程序，但仍应准备 `rust-src`。Linux 预编译程序可能受系统 libc 版本限制。新版本 Evcxr 的依赖也可能需要较新的 Rust，遇到版本要求时先核对错误与发布说明，不要直接切换全局工具链。

启动：

```bash
evcxr
```

看到类似提示：

```text
Welcome to evcxr. For help, type :help
>>
```

下面凡是带 `>>` 的示例都是**交互记录**：只输入提示符后面的内容，不要输入 `>>`，也不要把输出行再次粘贴进去。

### 分清三类输入

| 在哪里输入 | 例子 | 用途 |
| --- | --- | --- |
| 普通 shell | `evcxr --help` | 查看启动参数 |
| Evcxr 提示符后 | `1 + 2` | 执行 Rust 代码 |
| Evcxr 提示符后 | `:help` | 执行 Evcxr 自身的命令，不是 Rust 语法 |

退出时在 REPL 中输入 `:quit`；在空提示符处也可以用 `Ctrl+D` 发送 EOF。

## 常用命令速查

这些命令在 `>>` 后输入，**不需要结尾分号**。实际支持情况以本机 `:help` 为准：

| 命令 | 用途 |
| --- | --- |
| `:help` | 列出当前版本支持的命令 |
| `:version` | 查看 Evcxr 版本 |
| `:vars` | 列出当前绑定的变量及其类型，不显示变量值 |
| `:type total` / `:t total` | 查看名为 `total` 的变量类型，不是任意表达式求类型 |
| `:types` | 开关求值结果的类型显示，再执行一次切回 |
| `:dep regex = "1"` | 按 Cargo 依赖语法添加 crate |
| `:show_deps` | 查看当前添加的依赖 |
| `:explain` | 查看上一次编译错误的进一步说明 |
| `:timing` | 开关每次求值的耗时显示，包含编译等开销 |
| `:offline 1` / `:offline 0` | 开启 / 关闭 Cargo 离线模式；离线时依赖必须已缓存 |
| `:clear` | 清空当前代码状态，包括变量、函数、类型和依赖声明；保留编译缓存与配置 |
| `:quit` | 退出会话 |

注意：`:clear` 不是“清屏”，也不能撤销已经执行的文件写入、网络请求等外部副作用。退出后变量值不会在下次启动时自动恢复，历史记录也不是变量快照。

## 五分钟上手

### 计算、分号与打印

```text
>> 1 + 2
3
>> 1 + 2;
>> println!("你好，Rust！");
你好，Rust！
```

- 没有分号的末尾表达式可以直接展示结果。
- 加分号后成为语句，不会自动展示那个表达式的值。
- `println!` 是显式打印，与自动展示结果是两回事。
- 默认使用类似 `Debug` 的格式展示结果，因此字符串通常带引号，结构体需要相应的 `Debug` 实现。

### 变量在后续输入中继续存在

```text
>> let mut total = 10;
>> total += 5;
>> total
15
>> :type total
total: i32
```

再输入 `:vars`，可以看到 `total` 及其类型。查看数值则直接输入 `total`。

可以用新的 `let` 重新绑定同名变量，包括改变类型：

```text
>> let total = "现在是字符串";
>> :type total
total: &str
```

这叫重新绑定 / 遮蔽，不是把原来的整数变量通过赋值改成字符串。相关基础见 [基本语法与数据类型](Rust/基本语法与数据类型.md)。

### 定义与重定义函数

```text
>> pub fn square(x: i32) -> i32 { x * x }
>> square(6)
36
>> pub fn square(x: i32) -> i32 { x * x + 1 }
>> square(6)
37
```

REPL 允许更新函数定义，后续调用会使用新定义；不要把它理解成在普通 `.rs` 文件里可以同时放两个同名函数。这里沿用官方示例的 `pub fn` 写法。

### 多行代码

在正常交互模式下，大括号等结构尚未闭合时，按 Enter 会继续接收输入，直到代码完整。例如将下面整个函数输入或粘贴进 REPL：

```rust
pub fn sum_even(values: &[i32]) -> i32 {
    values.iter().copied().filter(|n| n % 2 == 0).sum()
}
```

然后求值：

```text
>> sum_even(&[1, 2, 3, 4])
6
```

需要让多个语句作为同一次输入执行时，可以包在一个块中：

```rust
{
    let values = vec![1, 2, 3, 4];
    values.iter().sum::<i32>()
}
```

结果为 `10`，但块里的 `values` 不会保留成后续可用的顶层变量。

### 自定义类型与迭代器

先定义类型和变量：

```rust
#[derive(Debug)]
pub struct Point {
    x: i32,
    y: i32,
}
```

```text
>> let p = Point { x: 2, y: 3 };
>> p
Point { x: 2, y: 3 }
```

试用迭代器链：

```text
>> let nums = vec![1, 2, 3, 4];
>> nums.iter().filter(|&&n| n % 2 == 0).map(|n| n * n).collect::<Vec<_>>()
[4, 16]
```

适合边看 [迭代器与闭包](Rust/迭代器与闭包.md) 边修改表达式，例如把筛选条件改成奇数，观察结果变化。

## 所有权与借用：最需要注意的地方

### 移动后不能继续使用原绑定

在新的会话或执行 `:clear` 后，按顺序输入：

```text
>> let s = String::from("hello");
>> let moved = s;
>> moved
"hello"
>> s
```

最后一步应报错，因为所有权已经移动，`s` 不再可用。本版本的 REPL 会将失效绑定移出上下文，因此可能显示“找不到 `s`”，而不是普通项目中常见的“使用了已移动的值”。这里演示的是故意失败的反例，不是让你修复 Evcxr。

要保留两个独立的 `String`，需要明确使用 `clone()`，而不是为了让所有示例通过就随处复制。原理见 [所有权](Rust/所有权.md)。

### 持久变量不能借用另一个持久变量

以下方式受到 Evcxr 的额外限制：

```text
>> let all_values = vec![10, 20, 30, 40, 50];
>> let some_values = &all_values[2..3];
```

第二次输入尝试保存一个借用 `all_values` 的变量，无法按普通 Rust 局部作用域的方式持久化。这**不代表下面这样的借用在正常 Rust 函数中非法**。

学习借用时，优先把相关操作放在同一次输入的局部块中：

```rust
{
    let all_values = vec![10, 20, 30, 40, 50];
    let some_values = &all_values[2..3];
    println!("{some_values:?}");
}
```

结果打印 `[30]`。也可以让保存的结果自己拥有数据：

```text
>> let owned_values = all_values[2..3].to_vec();
>> owned_values
[30]
```

前者练习借用；后者复制了数据，两者不是同一回事。不要为了绕过 REPL 限制就使用泄漏内存的办法。复杂的借用与生命周期练习应放到 Cargo 项目，配合 [引用与借用](Rust/引用与借用.md) 和 [生命周期](Rust/生命周期.md) 学习。

## 加载第三方 crate

### 从 crates.io 添加

在 REPL 中输入 Cargo 风格的依赖声明：

```text
:dep regex = "1"
```

首次使用会解析、下载并编译依赖，可能需要较长时间；`"1"` 是版本要求，不是固定到某个补丁版本。`:show_deps` 展示依赖声明，不等于列出全部已解析的精确版本；要复现实验，应记录实际版本，并在正式 Cargo 项目里通过 `Cargo.lock` 固定解析结果。

添加或更新依赖可能触发重新编译，让已有自定义类型的变量失效。建议将这一节作为独立实验，先执行 `:clear`，再添加依赖。

然后输入：

```rust
let re = regex::Regex::new(r"^item-[0-9]{2}$")?;
```

```text
>> re.is_match("item-12")
true
>> re.is_match("item-123")
false
>> re.is_match("item-１２")
false
```

这是 [grex 教程](常用工具/grex.md) 中编号规则的 Rust 验证版：`[0-9]` 只接受 ASCII 数字，`^`、`$` 在这些不含换行的样本中约束完整编号。

这里的原始字符串 `r"..."` 可以少写一层 Rust 字符串转义。加载依赖不是在修改你当前项目的 `Cargo.toml`；这是当前 Evcxr 求值环境的依赖。

### 加载本地 library crate

先在 shell 中进入本地 crate 的目录，再启动 evcxr：

```bash
# 将路径替换成实际包含 Cargo.toml 的 library crate 目录
cd /实际路径/my-library
evcxr
```

在 REPL 中：

```text
:dep .
```

也可以按官方格式指定路径与依赖名称：

```text
:dep my_library = { path = "." }
```

之后通过 crate 名调用其公开 API，例如 `my_library::some_function()`。这不是加载任意 `.rs` 文件；只有二进制目标、没有库目标的项目不能直接作为普通 library 依赖使用。Package、Crate 和 Workspace 的区别见 [Cargo 工作区与依赖管理](Rust/Cargo工作区与依赖管理.md)。

## `?` 与错误反馈

Evcxr 支持直接在顶层求值中使用 `?`，便于试验返回 `Result` 的 API：

```text
>> "42".parse::<i32>()?
42
>> "abc".parse::<i32>()?
```

第二条会显示整数解析错误，然后可以继续输入代码。`:explain` 用于编译错误的说明，不要把它当作所有运行时错误的通用解释器。

这是 Evcxr 提供的便利；将代码复制进普通 Rust 函数时，仍然要让函数返回兼容的类型，不能因此认为任意 `fn main()` 都能直接使用 `?`。相关内容见 [错误处理](Rust/错误处理.md)。

## 输入体验与状态管理

- **Tab**：补全；默认模式下，再按一次可以列出候选项。
- **方向键 ↑ / ↓**：浏览历史输入。不要在交互代码中输入真实令牌或密码，历史记录可能写入磁盘。
- **Ctrl+C**：可以取消当前输入或中断运行；运行中断可能导致执行子进程重启、变量丢失，不是可靠的“保留状态暂停”。
- **Ctrl+D**：在空提示符处退出；也可以明确输入 `:quit`。

如果更习惯 Vi 风格，在 shell 中启动：

```bash
evcxr --edit-mode vi
```

如果希望 Tab 在候选项之间循环，可仅对本次启动设置环境变量：

```bash
EVCXR_COMPLETION_TYPE=circular evcxr
```

需要从干净状态重新试验时用 `:clear`；如果想恢复连同启动配置在内的初始体验，退出后重新启动更直观。

官方支持在配置目录放置 `init.evcxr`（启动命令）和 `prelude.rs`（启动代码）。Linux 通常位于 `~/.config/evcxr/`，也可能被环境变量覆盖。**初学时先不配置自动依赖或公共代码**，避免“全新会话”里隐藏着额外状态。本文不会创建或修改这些文件。

## 常见问题

| 现象 | 优先检查 |
| --- | --- |
| `evcxr: command not found` | `cargo install` 是否成功，Cargo 可执行文件目录是否在 `PATH` 中；不要把包名 `evcxr_repl` 当启动命令 |
| 提示缺少标准库源码 | 当前使用的 Rust 工具链是否安装了 `rust-src`，而不是只给另一套工具链装过 |
| 首次计算或 `:dep` 很慢 | 初始化、下载和编译都需要时间；用 `:timing` 看求值耗时，但不要当纯函数性能基准 |
| 离线添加依赖失败 | `:offline 1` 不会自动准备依赖；需要完整的本地索引和依赖缓存 |
| 结构体不能直接显示 | 默认输出需要 `Debug`；自己定义的类型可考虑 `#[derive(Debug)]` 或显式打印字段 |
| 顶层借用报错，但教材例子合法 | 是否触发了 Evcxr 的跨输入持久借用限制；改在单个块或普通项目验证 |
| `:clear` 后函数或 crate 不见了 | 它清除的不只是变量；需要重新定义或重新 `:dep` |
| 代码崩溃或进程退出后状态丢失 | 执行子进程可能重启；会话状态不是持久存储 |

## 配合现有笔记练习

推荐采用“**读一个概念 → 预测结果 → REPL 验证 → 写一句解释 → 重要片段移入项目**”的节奏：

1. **变量与类型**：分别绑定整数、字符串和向量，用 `:vars`、`:type` 检查推导结果。
2. **表达式与语句**：比较 `2 * 3` 与 `2 * 3;`；写一个返回值来自末尾表达式的函数。
3. **所有权**：比较 `let b = a;` 对整数和 `String` 的影响；报错时先解释原因再修改。
4. **借用**：在一个局部块内创建 `String`，借用成 `&str` 并打印；不要跨输入保存该引用。
5. **迭代器**：用 `filter`、`map`、`collect` 求 `[1, 2, 3, 4]` 中奇数的平方，预期 `[1, 9]`。
6. **错误处理**：比较成功与失败的 `parse::<i32>()`，再尝试用 `match` 自己处理错误。
7. **结合 grex**：把生成的编号正则放入 `regex::Regex`，增加长度、前后缀和 Unicode 反例。

示例不依赖练习素材，可以在任意目录启动；只有本地 crate 示例需要指定工作目录。要保留长期代码、测试或依赖清单时，放回对应的 Rust 学习项目，不要将 REPL 历史当作项目源码。

## 查阅资料

- [Evcxr 官方项目](https://github.com/evcxr/evcxr)：REPL 与 Jupyter 的项目入口。
- [Evcxr REPL README](https://github.com/evcxr/evcxr/blob/main/evcxr_repl/README.md)：安装、启动与补全模式。
- [Evcxr 通用使用文档](https://github.com/evcxr/evcxr/blob/main/COMMON.md)：依赖、持久变量、引用限制与配置。
- [命令实现](https://github.com/evcxr/evcxr/blob/main/evcxr/src/command_context.rs)：核实命令名称及实际行为；使用时优先查看本机 `:help`。
- [发布说明](https://github.com/evcxr/evcxr/blob/main/RELEASE_NOTES.md)：Rust 版本要求与功能变化。
