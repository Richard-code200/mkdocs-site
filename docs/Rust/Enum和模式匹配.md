# Enum和模式匹配

## 枚举(Enum)

`enum` 是 enumeration(枚举)的缩写.

枚举(Enum)允许你列举一组**可能的变体**(Variant),从而定义一个自定义类型.每个变体代表该类型的一种可能状态.

/// info | 枚举的本质
枚举说白了就是定义了一组可能的值.与 C 语言的枚举不同,Rust 的枚举**每个变体可以携带不同类型和数量的数据**,这让枚举的表现力远超传统枚举.
///

### 定义枚举

```rust
enum IpAddrKind {
    V4,
    V6,
}
```

- 使用 `enum` 关键字定义
- 枚举名采用 **PascalCase** 命名法
- 变体名同样采用 **PascalCase**
- 变体之间用逗号 `,` 分隔(最后一个变体的逗号可省略)

### 创建枚举实例

```rust
fn main() {
    let four = IpAddrKind::V4;
    let six = IpAddrKind::V6;

    route(IpAddrKind::V4);
    route(IpAddrKind::V6);
}

fn route(ip_type: IpAddrKind) {}
```

- 使用 `枚举名::变体名` 语法创建实例
- `four` 和 `six` 的类型相同,都是 `IpAddrKind`
- 函数参数可以用枚举类型来约束,确保只接受合法的变体

### 枚举 vs 结构体

一种直观的做法是用枚举 + 结构体配合使用:

```rust
enum IpAddrKind {
    V4,
    V6,
}

struct IpAddr {
    kind: IpAddrKind,
    address: String,
}

fn main() {
    let home = IpAddr {
        kind: IpAddrKind::V4,
        address: String::from("127.0.0.1"),
    };
    let loopback = IpAddr {
        kind: IpAddrKind::V6,
        address: String::from("::1"),
    };
}
```

但这种写法有些冗余 —— 每个实例都需要同时指定 `kind` 和 `address`,而且无法对不同的 `kind` 关联不同类型的地址数据.

/// important | 枚举可以直接携带数据
Rust 枚举的每个变体**可以内嵌数据**,无需借助结构体.这是 Rust 枚举相比 C/Java 枚举的核心优势.
///

## 枚举变体的数据形式

枚举的每个变体可以携带不同类型和数量的数据,共有三种形式:

### 单元变体(Unit Variant)

不携带任何数据,类似单元结构体:

```rust
enum Message {
    Quit,   // 单元变体
}
```

### 元组变体(Tuple Variant)

携带一组匿名数据,类似元组结构体:

```rust
enum Message {
    Write(String),         // 元组变体:携带一个 String
    ChangeColor(i32, i32, i32), // 元组变体:携带三个 i32
}
```

### 结构体变体(Struct Variant)

携带命名字段,类似普通结构体:

```rust
enum Message {
    Move { x: i32, y: i32 },  // 结构体变体
}
```

/// info | 枚举 vs 多个结构体
如果用结构体来表达 `Message`,需要定义四个独立的结构体:

```rust
struct QuitMessage;                          // 类单元结构体
struct MoveMessage { x: i32, y: i32 }        // 普通结构体
struct WriteMessage(String);                 // 元组结构体
struct ChangeColorMessage(i32, i32, i32);    // 元组结构体
```

这些结构体类型各不相同,无法统一为一个类型来传递或处理.而枚举 `Message` 将这些变体统一在同一个类型下.
///

完整的 `Message` 枚举:

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}
```

### 枚举的内存布局

枚举实例在内存中的大小取决于**最大的变体**:

```
Message 的内存布局(简化):

+---------------------------+
| 标签(tag) | 数据(payload) |
+---------------------------+
```

- **标签**(Tag):标识当前是哪个变体(如 `Quit`、`Move` 等)
- **数据**(Payload):当前变体携带的数据
- 总大小 = 标签大小 + 最大变体的数据大小

/// info | 枚举大小 = 最大变体
Rust 在编译时按**最大变体**分配内存.即使当前实例是最小的变体(如 `Quit`),也占用与最大变体相同的空间.这保证了枚举在栈上大小固定.
///

## 枚举的方法

和结构体一样,可以使用 `impl`(implementation,实现)块为枚举定义方法:

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

impl Message {
    fn call(&self) {
        // 方法体
    }
}

fn main() {
    let m = Message::Write(String::from("hello"));
    m.call();
}
```

- 通过 `实例.方法名()` 调用
- 第一个参数为 `&self`、`&mut self` 或 `self`,含义与结构体方法一致

/// info | 枚举方法与结构体方法
枚举的 `impl` 块语法与结构体完全相同.区别在于方法内部通常需要通过**模式匹配**来判断当前是哪个变体,然后分别处理.
///

## Option<T> 枚举

`Option<T>` 是 Rust 标准库中最重要的枚举之一,它表达了"一个值**可能存在也可能不存在**"的语义:

```rust
enum Option<T> {
    None,       // 没有值
    Some(T),    // 有一个值
}
```

/// important | Rust 没有 null
许多语言使用 `null` 表示"没有值",但 null 的问题是任何变量都可能是 null,容易导致空指针异常(NullPointerException).Rust 通过 `Option<T>` 在**类型层面**明确表达"可能没有值",编译器强制你处理 `None` 的情况,从根本上消除了空指针问题.
///

### 基本用法

`Option<T>` 被包含在 Rust 的 **prelude** 中,无需导入,甚至可以直接使用 `Some` 和 `None`:

```rust
fn main() {
    let some_number = Some(5);         // 类型: Option<i32>
    let some_string = Some("a string"); // 类型: Option<&str>

    let absent_number: Option<i32> = None; // 必须标注类型
}
```

- `Some(value)`:包装一个存在的值,编译器自动推断 `T` 的类型
- `None`:表示没有值.使用时**必须标注类型**,因为编译器无法从 `None` 推断出 `T` 是什么

/// warning | Option<T> 与 T 是不同类型
`Option<i32>` 和 `i32` 是**完全不同的类型**,不能直接混合运算:

```rust
let x: i8 = 5;
let y: Option<i8> = Some(8);
let sum = x + y; // 编译错误:cannot add `Option<i8>` to `i8`
```

必须先通过模式匹配或方法将 `Option<T>` 中的值**解包**(Unwrap),才能使用.
///

### 常用方法

`Option<T>` 提供了一系列实用方法:

```rust
let some: Option<i32> = Some(42);
let none: Option<i32> = None;
```

| 方法                 | 说明                                          |
| -------------------- | --------------------------------------------- |
| `unwrap()`           | 返回 `Some` 中的值,若为 `None` 则 **panic**   |
| `unwrap_or(default)` | 返回 `Some` 中的值,若为 `None` 则返回默认值   |
| `unwrap_or_else(f)`  | 返回 `Some` 中的值,若为 `None` 则调用闭包 `f` |
| `is_some()`          | 如果是 `Some` 返回 `true`                     |
| `is_none()`          | 如果是 `None` 返回 `true`                     |
| `map(f)`             | 对 `Some` 中的值应用闭包 `f`,返回新 `Option`  |
| `and_then(f)`        | 类似 `map`,但闭包返回 `Option`(避免嵌套)      |
| `filter(p)`          | 满足谓词 `p` 保留 `Some`,否则变为 `None`      |

```rust
fn main() {
    let some: Option<i32> = Some(42);
    let none: Option<i32> = None;

    println!("{}", some.unwrap_or(0));         // 42
    println!("{}", none.unwrap_or(0));         // 0

    let doubled = some.map(|x| x * 2);         // Some(84)
    let doubled_none = none.map(|x| x * 2);    // None

    let filtered = some.filter(|&x| x > 10);   // Some(42)
    let filtered_out = some.filter(|&x| x > 100); // None
}
```

/// warning | 慎用 unwrap()
`unwrap()` 在遇到 `None` 时会触发 **panic** 导致程序崩溃.生产代码中应优先使用 `unwrap_or`、`map`、`match` 或 `if let` 来安全地处理 `None` 情况.
///

## 模式匹配(match)

`match` 是 Rust 中最强大的控制流运算符之一,它允许将一个值与一系列**模式**(Pattern)进行比较,并执行匹配分支中的代码.

### 基本语法

```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => {
            println!("Lucky penny!");
            1
        }
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
```

- `match` 后跟一个表达式
- 每个分支由 `模式 => 表达式` 组成
- 分支之间用逗号分隔
- 如果分支体只有一行表达式,不需要花括号;多行则需要

/// important | match 必须穷尽所有可能
`match` 要求**覆盖所有可能的模式**,否则编译报错.这是 Rust 在编译期保证代码完整性的关键特性.如果无法列举所有情况,可以使用 `_` 通配符捕获剩余模式.
///

### 匹配携带数据的变体

`match` 可以从枚举变体中**提取**绑定的数据:

```rust
#[derive(Debug)]
enum UsState {
    Alabama,
    Alaska,
    // ...
}

enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(UsState), // Quarter 变体携带一个 UsState
}

fn describe(coin: Coin) -> String {
    match coin {
        Coin::Penny => String::from("Penny"),
        Coin::Nickel => String::from("Nickel"),
        Coin::Dime => String::from("Dime"),
        Coin::Quarter(state) => {
            // state 被绑定为 Quarter 变体中的 UsState 值
            format!("Quarter from {state:?}")
        }
    }
}

fn main() {
    let coin = Coin::Quarter(UsState::Alaska);
    println!("{}", describe(coin)); // "Quarter from Alaska"
}
```

/// info | 模式中的变量绑定
在 `Coin::Quarter(state)` 模式中,`state` 是一个**新绑定的变量**,它接收了 `Quarter` 变体中携带的 `UsState` 值.这种模式称为**解构**(Destructuring).
///

### 匹配 Option<T>

`match` 是处理 `Option<T>` 最常用的方式:

```rust
fn plus_one(x: Option<i32>) -> Option<i32> {
    match x {
        Some(val) => Some(val + 1),
        None => None,
    }
}

fn main() {
    let five = Some(5);
    let six = plus_one(five);   // Some(6)
    let none = plus_one(None);  // None
}
```

### 通配符 `_` 与占位符

当不需要穷举所有模式时,可以用通配符:

```rust
fn main() {
    let dice = 3;

    match dice {
        3 => println!("three"),
        7 => println!("seven"),
        _ => println!("other"),  // _ 匹配所有未列出的值
    }
}
```

- `_`:匹配**任意值**,但不绑定变量(无法在分支中使用该值)
- `_` 必须放在**最后一个分支**

/// info | _ vs other
如果需要在分支中使用匹配到的值,可以用一个变量名代替 `_`:

```rust
match dice {
    3 => println!("three"),
    other => println!("got {other}"), // other 绑定了匹配的值
}
```

`_` 适合"忽略不关心的值"的场景,`other` 适合"需要使用其余值"的场景.
///

## if let 简洁控制流

当只关心**一个模式**的匹配结果时,`match` 显得有些冗长.`if let` 提供了一种更简洁的写法:

### 基本用法

```rust
fn main() {
    let config_max = Some(3u8);

    // match 写法:必须列出所有分支
    match config_max {
        Some(max) => println!("The maximum is configured to be {max}"),
        _ => (),
    }

    // if let 写法:只关心 Some 的情况
    if let Some(max) = config_max {
        println!("The maximum is configured to be {max}");
    }
}
```

`if let` 本质上是 `match` 的语法糖,只匹配一个模式,忽略其余情况.

/// info | if let 的本质
`if let 模式 = 表达式 { ... }` 等价于:

```rust
match 表达式 {
    模式 => { ... },
    _ => (),
}
```

只匹配一个分支,其余情况什么都不做.
///

### if let ... else

可以加上 `else` 分支处理不匹配的情况:

```rust
fn main() {
    let coin = Coin::Penny;

    if let Coin::Quarter(state) = coin {
        println!("State quarter from {state:?}!");
    } else {
        println!("Not a state quarter");
    }
}
```

### if let ... else if let ... else

`if let` 可以链式组合,依次尝试多个模式:

```rust
enum Foo {
    Bar,
    Baz,
    Qux(u32),
}

fn main() {
    let a = Foo::Qux(10);

    if let Foo::Bar = a {
        println!("match foo::bar");
    } else if let Foo::Baz = a {
        println!("match foo::baz");
    } else {
        println!("match others");
    }
}
```

/// info | if let 链 vs match
`if let` 链适合变体较多但只关心少数几个的场景.如果变体不多且需要穷尽处理,`match` 更清晰.
///

### 搭配 Option<T> 使用

`if let` 最常用的场景是处理 `Option<T>`:

```rust
fn print_if_some(value: Option<i32>) {
    if let Some(v) = value {
        println!("Got: {v}");
    }
    // None 的情况:什么都不做
}
```

/// warning | if let 不要求穷尽
与 `match` 不同,`if let` **不要求穷尽所有模式**.这意味着如果你忘了处理 `None` 的情况,编译器不会报错.需要确保逻辑完整时才使用 `if let`,否则应使用 `match`.
///

## while let

与 `if let` 类似,`while let` 在模式持续匹配时反复循环:

```rust
fn main() {
    let mut stack = Vec::new();

    stack.push(1);
    stack.push(2);
    stack.push(3);

    while let Some(top) = stack.pop() {
        println!("{top}");
    }
    // 输出: 3, 2, 1
    // 当 pop() 返回 None 时循环结束
}
```

/// info | while let 的典型场景
`while let` 特别适合处理**迭代器**和**栈操作**等返回 `Option<T>` 的场景.`Vec::pop()` 在栈空时返回 `None`,循环自动终止.
///

## let else 语法(Rust 1.65+)

`let else` 用于解构一个值,如果模式不匹配则执行**发散代码块**(必须 `return`、`break`、`panic` 等):

```rust
fn print_even(value: Option<i32>) {
    let Some(v) = value else {
        println!("No value!");
        return; // else 分支必须发散(不返回正常值)
    };
    // 这里 v 一定是 i32 类型
    println!("Got: {v}");
}

fn main() {
    print_even(Some(42));  // "Got: 42"
    print_even(None);      // "No value!"
}
```

/// important | let else vs if let vs match

- `if let`:匹配成功时执行代码块,可选 `else` 分支
- `let else`:匹配成功时**继续执行后续代码**,失败时执行发散块(提前退出)
- `match`:穷尽所有分支,最完整也最冗长

`let else` 适合**提前返回**的卫语句(guard clause)模式,避免深层嵌套.
///

## 模式匹配进阶

### 匹配字面量

```rust
fn main() {
    let x = 1;

    match x {
        1 => println!("one"),
        2 => println!("two"),
        3 => println!("three"),
        _ => println!("anything"),
    }
}
```

### 匹配多个模式

使用 `|` 匹配多个模式(OR 模式):

```rust
fn main() {
    let x = 1;

    match x {
        1 | 2 => println!("one or two"),
        3 => println!("three"),
        _ => println!("anything"),
    }
}
```

### 匹配范围

使用 `..=` 匹配一个**闭区间**范围:

```rust
fn main() {
    let x = 5;

    match x {
        1..=5 => println!("one through five"),
        _ => println!("something else"),
    }
}
```

- `..=` 包含两端: `1..=5` 匹配 1, 2, 3, 4, 5
- 只适用于**整数**和 `char` 类型

```rust
fn main() {
    let ch = 'c';

    match ch {
        'a'..='j' => println!("early ASCII letter"),
        'k'..='z' => println!("late ASCII letter"),
        _ => println!("something else"),
    }
}
```

### 解构(Destructuring)

模式匹配可以**解构**结构体、枚举、元组和引用:

#### 解构结构体

```rust
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 0, y: 7 };

    match p {
        Point { x, y } => println!("x: {x}, y: {y}"),
    }

    // 也可以匹配特定值
    match p {
        Point { x, y: 0 } => println!("On the x axis at {x}"),
        Point { x: 0, y } => println!("On the y axis at {y}"),
        Point { x, y } => println!("Neither axis: ({x}, {y})"),
    }
}
```

/// info | 解构时重命名绑定变量
`Point { x, y }` 是 `Point { x: x, y: y }` 的简写.也可以将字段绑定到不同名字的变量:

```rust
match p {
    Point { x: a, y: b } => println!("a: {a}, b: {b}"),
}
```

`x: a` 表示"将字段 `x` 的值绑定到变量 `a`".
///

#### 解构枚举

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

fn process(msg: Message) {
    match msg {
        Message::Quit => println!("Quit"),
        Message::Move { x, y } => println!("Move to ({x}, {y})"),
        Message::Write(text) => println!("Write: {text}"),
        Message::ChangeColor(r, g, b) => println!("Color: ({r}, {g}, {b})"),
    }
}
```

#### 解构元组

```rust
fn main() {
    let tuple = (1, "hello", 3.14);

    match tuple {
        (1, s, f) => println!("s = {s}, f = {f}"),
        _ => println!("not matched"),
    }

    // 嵌套解构
    let nested = (1, (2, 3));
    match nested {
        (a, (b, c)) => println!("a={a}, b={b}, c={c}"),
    }
}
```

/// info | `..` 忽略剩余元素
`..` 可以忽略不关心的部分元素,只匹配感兴趣的位置:

```rust
fn main() {
    let numbers = (2, 4, 8, 16, 32, 128, 256, 512, 1024, 2048);

    match numbers {
        (first, .., last) => {
            // first = 2, last = 2048,中间全部忽略
            println!("first: {first}, last: {last}");
        }
    }
}
```

`..` 同样适用于结构体和枚举的元组变体:

```rust
match msg {
    Command::Move { .. } => println!("Move command"),       // 忽略所有字段
    Command::ChangeColor(..) => println!("ChangeColor"),    // 忽略所有元素
}
```

///

/// warning | 解构引用时的移动问题
对引用使用 `&` / `&mut` 模式解构时,如果内部类型没有实现 `Copy`(如 `String`),会尝试**移动**值,导致编译错误.通常直接省略 `&` / `&mut`,让 Rust 自动处理即可.
///

### 匹配守卫(Match Guard)

在模式后添加 `if 条件` 进一步过滤:

```rust
fn main() {
    let num = Some(4);

    match num {
        Some(x) if x % 2 == 0 => println!("{x} is even"),
        Some(x) => println!("{x} is odd"),
        None => (),
    }
}
```

/// info | 匹配守卫的作用
匹配守卫是在模式匹配之后的**额外条件检查**.它能表达模式本身无法表达的逻辑,例如"值是否为偶数"、"字符串是否包含某个子串"等.
///

### @ 绑定

`@` 运算符允许在匹配模式的**同时**将整个值绑定到一个变量:

```rust
enum Message {
    Hello { id: i32 },
}

fn main() {
    let msg = Message::Hello { id: 5 };

    match msg {
        Message::Hello { id: id_variable @ 3..=7 } => {
            // id_variable 绑定了 id 的值,同时 id 必须在 3..=7 范围内
            println!("Found an id in range: {id_variable}")
        }
        Message::Hello { id: 10..=12 } => {
            println!("Found an id in another range")
        }
        Message::Hello { id } => {
            println!("Found some other id: {id}")
        }
    }
}
```

/// info | @ 绑定的使用场景
当你既需要**检查值的模式**,又需要在分支体中**使用整个值**时,`@` 非常有用.避免了重复解构或在分支体内再次引用原始变量.
///

`@` 也可以与 OR 模式配合使用:

```rust
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 0, y: 10 };

    match p {
        Point { x, y: 0 } => println!("On the x axis at {x}"),
        Point { x: 0..=5, y: y @ (10 | 20 | 30) } => {
            // x 在 0..=5 范围内,y 是 10、20 或 30 之一
            // y 绑定了匹配到的值
            println!("On the y axis at {y}")
        }
        Point { x, y } => println!("On neither axis ({x}, {y})"),
    }
}
```

/// info | 组合多种模式
模式匹配可以自由组合:结构体解构 + 范围匹配 + `@` 绑定 + OR 模式,可以在同一个分支中同时使用,表达复杂的匹配条件.
///

## 综合示例

将枚举和模式匹配结合起来,实现一个简单的命令处理系统:

```rust
enum Command {
    Quit,
    Echo(String),
    Move { x: i32, y: i32 },
    ChangeColor(u8, u8, u8),
}

impl Command {
    fn execute(&self) {
        match self {
            Command::Quit => println!("Quitting..."),
            Command::Echo(msg) => println!("Echo: {msg}"),
            Command::Move { x, y } => println!("Moving to ({x}, {y})"),
            Command::ChangeColor(r, g, b) => {
                println!("Changing color to ({r}, {g}, {b})")
            }
        }
    }

    fn description(&self) -> String {
        match self {
            Command::Quit => String::from("Quit command"),
            Command::Echo(_) => String::from("Echo command"),
            Command::Move { .. } => String::from("Move command"),
            Command::ChangeColor(..) => String::from("ChangeColor command"),
        }
    }
}

fn main() {
    let commands = vec![
        Command::Echo(String::from("hello")),
        Command::Move { x: 10, y: 20 },
        Command::ChangeColor(255, 0, 0),
        Command::Quit,
    ];

    for cmd in &commands {
        println!("--- {}", cmd.description());
        cmd.execute();
    }
}
```

/// important | 枚举 + 模式匹配 = Rust 核心范式
枚举定义"数据有哪些可能的形态",模式匹配负责"针对每种形态分别处理".这种组合让 Rust 代码既**类型安全**又**表达力强**,是 Rust 区别于大多数语言的核心特性之一.
///
