# Markdown 核心语法速查表

## 📝 1. 基础排版

### 标题

# 一级标题 (对应 HTML h1)

## 二级标题 (对应 HTML h2)

### 三级标题 (对应 HTML h3)

#### 四级标题 (对应 HTML h4)

### 强调

这是 **粗体** 文字，通常用来强调重点
这是 _斜体_ 文字，通常用来标记术语或书名
这是 **_粗斜体_** 文字。
这是 ~~删除线~~ 文字，表示废弃内容

### 分割线

## 下面这条横线可以用来分隔章节

---

## 📋 2. 列表

### 无序列表 (用 - 或 \*)

- Linux 基础命令
- Python 虚拟环境
- Git 版本回退
  - 嵌套列表前面加两个空格或一个 Tab
  - 二级条目

### 有序列表 (记录操作步骤)

1. 更新 Fedora 系统：`sudo dnf update`
2. 安装开发工具：`sudo dnf groupinstall "Development Tools"`
3. 重启服务：`sudo systemctl restart docker`

### 待办清单 (部分编辑器支持交互)

- [x] 学习 Markdown 语法
- [ ] 配置 Vim/Neovim 插件
- [ ] 阅读 Linux Kernel 文档

## 💻 3. 代码块

### 行内代码

在正文中提到命令或变量时使用，例如 `print("Hello Fedora")` 或者 `ls -la`
符号是反引号，位于键盘 `Tab` 键上方

### 多行代码块 (带语法高亮)

使用三个反引号包围代码，并注明语言名称

```python
# Python 示例
def greet(name):
    return f"Hello, {name}! Welcome to Fedora."

if __name__ == "__main__":
    print(greet("Developer"))
```

```bash
# Shell / Bash 示例
sudo dnf install gcc g++ make
echo "export PATH=$PATH:/usr/local/go/bin" >> ~/.bashrc
```

```C
// C 语言示例
#include <stdio.h>

int main() {
    printf("Compiled on Fedora!\n");
    return 0;
}
```

## 🔗 4. 链接与引用

超链接

[Fedora 官方文档](docs.fedoraprojects.org)

[GitHub](github.com)

引用块

这是用来记录别人的话，或者文档中的提示信息

> 注意：在 Fedora 中使用 dnf 命令时通常需要 sudo 权限
> 这是一个多行引用，可以在里面换行
