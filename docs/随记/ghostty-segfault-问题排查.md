# Ghostty 在 Fedora 43→44 升级后 Segmentation Fault 问题

**日期**: 2026-05-20  
**环境**: Fedora 44, Wayland (niri), ghostty 1.3.1-2.fc44

## 现象

运行 ghostty 后立即崩溃，输出末尾显示：

```
zsh: segmentation fault (core dumped)  ghostty
```

完整日志中包含大量 Adwaita 弃用警告后崩溃：

```
warning(glib): WARNING: Adwaita: The resource style-dark.css is deprecated ...
warning(glib): WARNING: Adwaita: The resource style-hc.css is deprecated ...
warning(glib): WARNING: Adwaita: The resource style-hc-dark.css is deprecated ...
zsh: segmentation fault (core dumped)  ghostty
```

经 `coredumpctl` 确认，每次启动均产生 SIGSEGV core dump。

## 根因分析

### 崩溃调用链

```
ghostty: App.newWindow
  → gtk_window_present
    → gtk_window_realize
      → gtk_window_realize_icon           (加载窗口图标)
        → gtk_icon_paintable_snapshot_with_weight
          → gdk_texture_new_from_stream_at_scale
            → gdk_pixbuf_new_from_stream
              → load_pixbuf_with_glycin   (glycin 图像加载器)
                → gly_loader_load
                  → glycin::api_common::spin_up_loader
                    → glycin::sandbox::Sandbox::bwrap_command  (bwrap 沙箱初始化)
                      → FcConfigGetCacheDirs
                        → FcConfigDestroy
                          → FcStrSetDestroy  →  SIGSEGV
```

### 关键包版本

| 包名        | Fedora 43 | Fedora 44    |
| ----------- | --------- | ------------ |
| ghostty     | 1.3.1     | 1.3.1-2.fc44 |
| glycin-libs | 2.0.8     | 2.1.1        |
| fontconfig  | 2.17.0-3  | 2.17.0-4     |
| bubblewrap  | 0.11.0-2  | 0.11.0-4     |
| gtk4        | -         | 4.22.4       |
| libadwaita  | -         | 1.9.0        |

### 根因

**fontconfig 2.17.0 的 `FcConfigGetCacheDirs()` 函数存在 bug**，在被调用时会触发 SIGSEGV。

Fedora 43→44 升级将 `glycin-libs` 从 2.0.x 升级到 2.1.1，新版本中 glycin 的图像加载沙箱初始化过程会调用 `FcConfigGetCacheDirs()` 获取缓存目录以挂载到 bwrap 沙箱，从而触发了 fontconfig 的这个崩溃。

经验证，在 Python 中直接调用 `libfontconfig.so` 的 `FcConfigGetCacheDirs()` 同样会导致段错误，确认是 fontconfig 库本身的问题。

## 临时解决方案

设置 `GLYCIN_DATA_DIR` 环境变量使 glycin 绕过导致崩溃的代码路径。

### 方法

环境变量需要在 **三个层级** 分别配置才能覆盖所有启动场景，详见下文。

### 方法

#### 层级一：zsh 终端会话 (`~/.zshrc`)

确保在终端中手动执行 `ghostty` 时有效：

```sh
# ~/.zshrc 中添加
export GLYCIN_DATA_DIR="$HOME/.cache/glycin-data"
```

#### 层级二：niri 环境块 (`~/.config/niri/config.kdl`)

niri 的 `environment` 块决定通过 niri spawn 机制启动的所有应用的初始环境：

```kdl
environment {
  // ... 其他变量 ...

  // Ghostty Fedora 44 临时绕过
  GLYCIN_DATA_DIR "/home/errorichard/.cache/glycin-data"
}
```

**注意**：niri 的 `load-config-file` 只重载快捷键和窗口规则，`environment` 块仅在 niri 启动时读取。修改后需重启 niri 会话才能使 niri 自身继承该变量。

#### 层级三：systemd 用户环境 (`~/.config/environment.d/90-dms.conf`)

systemd 用户服务（如 vicinae）从此处继承环境变量：

```
GLYCIN_DATA_DIR=/home/errorichard/.cache/glycin-data
```

当前会话中已运行的 systemd 服务不会自动获取新变量，需手动注入并重启服务：

```sh
systemctl --user set-environment GLYCIN_DATA_DIR=/home/errorichard/.cache/glycin-data
systemctl --user restart vicinae.service
```

### 验证

```sh
GLYCIN_DATA_DIR=/tmp/glycin-data ghostty
```

预期：ghostty 正常启动并显示终端窗口，无 segfault。

## 补充排查：vicinae 启动 ghostty 仍崩溃

### 现象

设置 `~/.zshrc` 后，从 alacritty 终端执行 `ghostty` 可正常启动，但通过 vicinae 启动仍 segfault。

### 原因

vicinae 是 systemd 用户服务，其环境变量继承自 **systemd 用户管理器**，而非 zsh。变量传递链如下：

```
zsh (~/.zshrc)
  └── ghostty           ✓ 有 GLYCIN_DATA_DIR（适用终端启动）

niri (environment 块)
  └── spawn-at-startup "vicinae" "server"
       └── ghostty      ✗ 无 GLYCIN_DATA_DIR（niri 启动时未设置）

systemd 用户会话 (~/.config/environment.d/)
  └── vicinae.service
       └── ghostty      ✗ 无 GLYCIN_DATA_DIR（会话启动时未设置）
```

只有 `~/.zshrc` 被配置时，仅终端路径生效，vicinae 路径因缺少变量仍然崩溃。

### 解决

```sh
# 注入 systemd 用户会话
systemctl --user set-environment GLYCIN_DATA_DIR=/home/errorichard/.cache/glycin-data

# 重启 vicinae 使其继承新环境
systemctl --user restart vicinae.service

# 确认
cat /proc/$(cat /run/user/1000/vicinae/vicinae-data-control-server.pid)/environ \
  | tr '\0' '\n' | grep GLYCIN
# 输出: GLYCIN_DATA_DIR=/home/errorichard/.cache/glycin-data
```

### 最终配置清单

| 文件 | 用途 | 生效范围 |
|------|------|----------|
| `~/.zshrc` | 终端手动启动 | zsh 会话 |
| `~/.config/niri/config.kdl` | niri spawn（重启 niri 后生效） | niri 直接启动的应用 |
| `~/.config/environment.d/90-dms.conf` | systemd 用户服务（重启会话后生效） | vicinae 等 systemd 服务 |

## 永久修复方向

1. **fontconfig 上游修复**: 向 [fontconfig issue tracker](https://gitlab.freedesktop.org/fontconfig/fontconfig/-/issues) 报告 `FcConfigGetCacheDirs` 的段错误问题
2. **glycin 上游**: 向 [glycin issue tracker](https://gitlab.gnome.org/GNOME/glycin/-/issues) 反馈字体配置获取的崩溃问题
3. **Fedora 打包**: 等待 fontconfig 或 glycin 的修复版本进入 Fedora 仓库后升级
4. **降级方案**: 如长期未修复，可考虑降级 glycin-libs 到 2.0.8

## 排查过程中用到的命令

```sh
# 查看 core dump 信息
coredumpctl list ghostty

# 查看崩溃栈回溯
coredumpctl debug ghostty --debugger-arguments="-batch -ex 'bt full' -ex 'quit'"

# 检查关键包版本
rpm -q ghostty gtk4 libadwaita glycin-libs fontconfig bubblewrap

# 确认 fontconfig bug
python3 -c "
import ctypes
lib = ctypes.CDLL('libfontconfig.so.1')
lib.FcInit()
lib.FcConfigGetCacheDirs(lib.FcConfigGetCurrent())
"

# 测试 GLYCIN_DATA_DIR 绕过效果
GLYCIN_DATA_DIR=/tmp/glycin-data ghostty
```
