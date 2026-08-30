# Cargo工作区与依赖管理

Cargo 负责创建、构建和验证 Rust 项目,也负责解析第三方依赖.理解 Package、Crate 和 Workspace 的边界,可以避免多项目仓库中常见的路径与命名问题.

## Package、Crate 与 Workspace

### Package

Package 是由一个 `Cargo.toml` 清单描述的发布和管理单元.`[package]` 中定义名称、版本和 edition:

```toml
[package]
name = "collections_learn"
version = "0.1.0"
edition = "2024"
```

一个 Package 最多包含一个 library crate,可以包含多个 binary crate,但至少要包含一个 crate.常见 crate 根如下:

- `src/lib.rs`:默认的 library crate 根.
- `src/main.rs`:默认的 binary crate 根.
- `src/bin/*.rs`:额外的 binary crate 根.

### Crate

Crate 是 Rust 编译器一次处理的编译单元.它可以生成库或可执行程序.源码中的 `crate` 路径关键字表示当前 crate 的根,并不表示整个 Package 或 Workspace.

Package 名和默认 crate 名通常相同.当 Package 名包含连字符时,代码中的 crate 名会把连字符转换为下划线:

```toml
[package]
name = "data-tools"
```

```rust
use data_tools::run;
```

### Workspace

Workspace 将多个相关 Package 作为一个整体管理.成员共享同一个 `Cargo.lock` 和根目录下的 `target/`,因此依赖版本和构建产物更容易保持一致.

```text
Rust_Lang/
├── Cargo.toml
├── Cargo.lock
├── collections_learn/
│   ├── Cargo.toml
│   └── src/main.rs
└── guessing_game/
    ├── Cargo.toml
    └── src/main.rs
```

/// info | Workspace 成员是 Package
`members` 指向包含 `Cargo.toml` 的 Package 目录,不是 `.rs` 文件或 crate 根文件.一个成员 Package 内部仍然可以包含多个 crate.
///

## Virtual Workspace

只有 `[workspace]`、没有 `[package]` 的根清单称为 virtual workspace.根目录只负责协调成员,自身不是可构建的 Package:

```toml
[workspace]
members = [
    "collections_learn",
    "guessing_game",
]
resolver = "3"
```

因此 virtual workspace 根目录不需要 `src/main.rs` 或 `src/lib.rs`.运行 `cargo check --workspace` 时,Cargo 会检查所有成员.

### members

`members` 中的路径相对于 workspace 根目录,既可以逐项列出,也可以使用简单的 glob:

```toml
[workspace]
members = ["apps/*", "libs/*"]
resolver = "3"
```

显式列表更容易审查成员变化;glob 适合目录结构统一且成员较多的仓库.无论选择哪种方式,每个匹配目录都必须包含有效的 Package 清单.

### resolver

`resolver` 指定 Cargo 的依赖特性解析器.使用 edition 2024 的 workspace 应设置:

```toml
[workspace]
resolver = "3"
```

virtual workspace 没有自己的 `[package]` 和 `edition`,Cargo 无法从根 Package 推断 resolver,所以应在 `[workspace]` 中显式声明.

/// important | edition 与 resolver 属于不同层级
`edition = "2024"` 写在每个成员的 `[package]` 中,控制该 Package 的 Rust edition;`resolver = "3"` 写在 `[workspace]` 中,控制整个 workspace 的依赖特性解析.二者不要互相替代.
///

## Edition 2024

新建成员时,Cargo 清单应明确使用 edition 2024:

```toml
[package]
name = "guessing_game"
version = "0.1.0"
edition = "2024"
```

Edition 控制语法和语言兼容规则,不等于编译器版本.同一个 workspace 可以包含不同 edition 的成员,但新项目统一 edition 通常更容易维护.

## 添加与管理依赖

### 使用 rand 0.9

在需要随机数的成员 Package 中添加 `rand` 0.9:

```toml
[package]
name = "guessing_game"
version = "0.1.0"
edition = "2024"

[dependencies]
rand = "0.9"
```

版本要求 `"0.9"` 表示接受兼容的 `0.9.x` 版本,实际选择的精确版本会记录到 `Cargo.lock`.

`rand` 0.9 的基本用法:

```rust
use rand::Rng;

fn main() {
    let secret_number = rand::rng().random_range(1..=100);
    println!("secret number: {secret_number}");
}
```

也可以在成员目录运行命令添加依赖:

```bash
cargo add rand@0.9
```

在 workspace 根目录操作时,使用 `-p` 明确目标 Package:

```bash
cargo add rand@0.9 -p guessing_game
```

/// warning | 不要混用旧版 rand 示例
`rand` 0.9 推荐使用 `rand::rng()` 和 `random_range`.旧示例中的 `thread_rng()`、`gen()` 或 `gen_range()` 可能已经重命名或弃用,应以当前依赖版本的 API 为准.
///

### 路径依赖

Workspace 成员之间可以使用相对路径依赖:

```toml
[dependencies]
common = { path = "../common" }
```

依赖键默认是代码中使用的 crate 名,`path` 则指向依赖 Package 的目录.如果目录名、Package 名和依赖键不同,可以显式指定 `package`:

```toml
[dependencies]
common_api = { package = "shared-common", path = "../common" }
```

```rust
use common_api::run;
```

## Cargo.lock

`Cargo.toml` 描述允许使用哪些依赖版本,`Cargo.lock` 记录一次解析后实际采用的精确版本及校验信息.

Workspace 通常只在根目录维护一个 `Cargo.lock`.成员目录不需要各自保存锁文件,Cargo 从 workspace 根统一解析依赖.

- 应用程序和可执行项目通常应提交 `Cargo.lock`,保证 CI、部署和其他开发者使用一致版本.
- 可复用库的独立仓库常不提交 `Cargo.lock`,让下游项目自行解析兼容版本.
- 同一 workspace 同时包含库和程序时,通常提交根目录的 `Cargo.lock`.
- 不要手工编辑锁文件;修改 `Cargo.toml` 后让 Cargo 重新生成或更新.

常用更新命令:

```bash
cargo update              # 在清单约束内更新所有依赖
cargo update -p rand      # 只更新 rand 及必要的关联依赖
```

/// info | --locked 的作用
CI 中可使用 `cargo check --locked` 或 `cargo test --locked`.`--locked` 禁止 Cargo 修改 `Cargo.lock`;如果锁文件缺失或与清单不一致,命令会直接失败.
///

## 常用验证命令

在 workspace 根目录执行:

```bash
cargo metadata --no-deps              # 验证清单并查看 workspace 成员
cargo check --workspace               # 检查所有成员
cargo test --workspace                # 测试所有成员
cargo check -p collections_learn      # 按 Package 名检查单个成员
cargo run -p collections_learn        # 运行指定 Package 的默认 binary
cargo tree -p guessing_game           # 查看指定成员的依赖树
cargo fmt --all -- --check            # 检查所有成员格式
cargo clippy --workspace --all-targets # 对所有目标运行 Clippy
```

只运行某个明确的 binary 时可以添加 `--bin`:

```bash
cargo run -p tools --bin importer
```

验证依赖锁定状态:

```bash
cargo check --workspace --locked
cargo test --workspace --locked
```

## 常见配置错误

### 重复成员

不要在 `members` 中重复写同一个目录,也不要让显式路径与 glob 重复匹配同一个 Package:

```toml
[workspace]
members = [
    "apps/demo",
    "apps/demo", # 重复
]
resolver = "3"
```

应删除重复项,确保每个 Package 只属于当前 workspace 一次.修改后使用下面的命令检查 Cargo 实际识别出的成员:

```bash
cargo metadata --no-deps
```

如果嵌套目录中还有另一个 workspace,同一个 Package 也不能同时被两个 workspace 管理.应调整 workspace 边界,或使用 `exclude` 排除不属于当前 workspace 的目录.

### members 写成 Package 名而不是目录

假设目录名为 `apps/guess`,其中的 Package 名为 `guessing_game`:

```text
workspace/
└── apps/
    └── guess/
        └── Cargo.toml
```

根清单必须填写目录路径:

```toml
[workspace]
members = ["apps/guess"]
resolver = "3"
```

下面的命令则使用 `[package].name`,而不是目录名:

```bash
cargo check -p guessing_game
```

/// warning | 路径和名称各有用途
`members` 与路径依赖使用文件系统目录;`cargo check -p`、`cargo run -p` 使用 Package 名;Rust 源码中的 `use` 使用 crate 名.三者经常相同,但 Cargo 不要求它们完全一致.
///

### 目录不存在或缺少 Cargo.toml

下面的成员路径只有在对应目录存在且包含有效 `Cargo.toml` 时才成立:

```toml
[workspace]
members = ["collections_learn"]
resolver = "3"
```

如果移动或重命名目录,必须同步修改 `members` 和相关路径依赖.可以依次检查:

```bash
cargo metadata --no-deps
cargo check --workspace
```

### Package 名重复

同一个 workspace 中的不同成员不应使用相同的 `[package].name`.即使目录名不同,`-p` 也无法明确选择重复名称:

```toml
[package]
name = "tools"
version = "0.1.0"
edition = "2024"
```

为每个 Package 设置唯一且稳定的名称,然后再使用目录层级表达其所属领域.

### virtual workspace 遗漏 resolver

下面的配置虽然列出了成员,但没有明确依赖解析器:

```toml
[workspace]
members = ["collections_learn"]
```

edition 2024 项目应补充:

```toml
[workspace]
members = ["collections_learn"]
resolver = "3"
```

/// important | 排错顺序
先用 `cargo metadata --no-deps` 检查清单、成员路径和 Package 名,再用 `cargo check --workspace` 检查源码与依赖,最后运行 `cargo test --workspace`.分层验证比直接处理一长串后续错误更有效.
///
