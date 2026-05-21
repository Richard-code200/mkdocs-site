# Ghostty 在 Fedora 43→44 升级后 Segmentation Fault 问题

**日期**: 2026-05-20 初查 / 2026-05-21 修复完善  
**环境**: Fedora 44, Wayland (niri), ghostty 1.3.1-2.fc44, clash-verge 2.5.1

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

| 文件                                  | 用途                               | 生效范围                |
| ------------------------------------- | ---------------------------------- | ----------------------- |
| `~/.zshrc`                            | 终端手动启动                       | zsh 会话                |
| `~/.config/niri/config.kdl`           | niri spawn（重启 niri 后生效）     | niri 直接启动的应用     |
| `~/.config/environment.d/90-dms.conf` | systemd 用户服务（重启会话后生效） | vicinae 等 systemd 服务 |

## 后续问题：GLYCIN_DATA_DIR 导致 clash-verge 崩溃

**日期**: 2026-05-21

### 现象

设置 `GLYCIN_DATA_DIR` 后，clash-verge 启动崩溃：

```
Gtk:ERROR:../gtk/gtkiconhelper.c:495:ensure_surface_for_gicon: assertion failed (error == NULL):
Failed to load .../image-missing.svg: No image loaders are configured.
Used config: Config {
    image_loader: {},
    image_editor: {},
}
```

### 根因分析

1. **glycin 的图像加载器配置发现机制**：glycin 通过扫描 `XDG_DATA_DIRS` 下的 `<dir>/glycin-loaders/<compat-version>+/conf.d/*.conf` 来发现可用的图像加载器

2. **`GLYCIN_DATA_DIR` 的副作用**：当 `GLYCIN_DATA_DIR` 被设置为自定义路径时，glycin **仅在**该路径下查找加载器配置，不再搜索系统路径 `/usr/share/glycin-loaders/2+/conf.d/`

3. **原先工作目录为空**：`~/.cache/glycin-data/` 下没有任何 loader 配置，导致 glycin 的 `Config { image_loader: {}, image_editor: {} }` 为空

4. **所有图像格式均受影响**：由于 Fedora 44 的 `libgdk_pixbuf-2.0.so.0` **直接链接** `libglycin-2.so.0`，glycin 成为所有图像加载的唯一后端。glycin 配置为空意味着 PNG、SVG、JPEG 等所有格式均无法加载

5. **clash-verge 触发路径**：

   ```
   clash-verge: 创建系统托盘图标
     → gtk_icon_theme_lookup_icon
       → gdk_pixbuf_new_from_file (SVG)
         → gly_loader_new → Config 为空 → 报错退出
   ```

### 验证方法

通过 Python GDK-pixbuf 绑定测试图像加载：

```python
import gi
gi.require_version('GdkPixbuf', '2.0')
from gi.repository import GdkPixbuf, GLib

# GLYCIN_DATA_DIR 未设置时：正常加载
pb = GdkPixbuf.Pixbuf.new_from_file('/path/to/icon.svg')  # OK

# GLYCIN_DATA_DIR 指向空目录时：所有格式均失败
# Error: No image loaders are configured
```

### 解决方案演进

#### 尝试一：在 GLYCIN_DATA_DIR 下补齐 glycin 配置

在 `~/.cache/glycin-data/` 下创建 glycin 加载器配置目录结构，从系统复制配置文件：

```sh
mkdir -p ~/.cache/glycin-data/glycin-loaders/2+/conf.d/
cp /usr/share/glycin-loaders/2+/conf.d/*.conf \
   ~/.cache/glycin-data/glycin-loaders/2+/conf.d/
```

/// warning | 关键发现：路径不带 `share/` 前缀
在 `GLYCIN_DATA_DIR` 下，glycin 查找的是 `<GLYCIN_DATA_DIR>/glycin-loaders/2+/conf.d/`，而非 `<GLYCIN_DATA_DIR>/share/glycin-loaders/2+/conf.d/`。这与 `XDG_DATA_DIRS` 下的标准路径 `<datadir>/share/glycin-loaders/...` 不同。
///

**结果**：clash-verge 恢复工作，glycin 正确发现加载器。但 ghostty 重新崩溃！

#### 尝试二：去掉 Fontconfig=true 彻底绕过崩溃

ghostty 重新崩溃的原因：glycin 能正常初始化后，在创建 bwrap 沙箱加载 SVG 时调用 `FcConfigGetCacheDirs()`，再次触发 fontconfig 2.17.0 的 double-free 崩溃。

glycin SVG loader 配置中的 `Fontconfig=true` 指示 glycin 在沙箱中挂载字体缓存目录，这正是触发 `FcConfigGetCacheDirs()` 的代码路径。

**最终方案**：拷贝系统配置到 `GLYCIN_DATA_DIR` 后，**移除 `Fontconfig=true`**：

```ini
# ~/.cache/glycin-data/glycin-loaders/2+/conf.d/glycin-svg.conf

[loader:image/svg+xml]
Exec=/usr/libexec/glycin-loaders/2+/glycin-svg
ExposeBaseDir=true
# Fontconfig=true  ← 移除此行，绕过 fontconfig 2.17.0 SIGSEGV

[loader:image/svg+xml-compressed]
Exec=/usr/libexec/glycin-loaders/2+/glycin-svg
ExposeBaseDir=true
```

**结果**：ghostty 和 clash-verge 均正常启动，SVG 图标可正常渲染。

/// info | Fontconfig 移除的影响
移除 `Fontconfig=true` 后，glycin 不会在 bwrap 沙箱中挂载字体缓存目录。对于纯图形 SVG 图标（如系统图标主题中的图标），不影响渲染。但如果 SVG 中包含 `<text>` 元素需要字体渲染，则可能使用默认字体或渲染异常。日常使用中影响极小。
///

## 最终配置

### 环境变量

保持 `GLYCIN_DATA_DIR` 在三个层级中均设置，不做修改：

| 文件                                  | 配置                                                     |
| ------------------------------------- | -------------------------------------------------------- |
| `~/.zshrc`                            | `export GLYCIN_DATA_DIR="$HOME/.cache/glycin-data"`      |
| `~/.config/niri/config.kdl`           | `GLYCIN_DATA_DIR "/home/errorichard/.cache/glycin-data"` |
| `~/.config/environment.d/90-dms.conf` | `GLYCIN_DATA_DIR=/home/errorichard/.cache/glycin-data`   |

### 自定义 glycin 加载器配置目录

```
~/.cache/glycin-data/
└── glycin-loaders/
    └── 2+/
        └── conf.d/
            ├── glycin-heif.conf
            ├── glycin-image-rs.conf
            ├── glycin-jxl.conf
            └── glycin-svg.conf        ← Fontconfig=true 已移除
```

### 系统配置同步

还需将修改后的 SVG loader 配置同步到系统路径（需 sudo）：

```sh
sudo cp ~/.cache/glycin-data/glycin-loaders/2+/conf.d/glycin-svg.conf \
        /usr/share/glycin-loaders/2+/conf.d/glycin-svg.conf
```

## 永久修复方向

1. **fontconfig 上游修复**: 向 [fontconfig issue tracker](https://gitlab.freedesktop.org/fontconfig/fontconfig/-/issues) 报告 `FcConfigGetCacheDirs` 的段错误问题
2. **glycin 上游**: 向 [glycin issue tracker](https://gitlab.gnome.org/GNOME/glycin/-/issues) 反馈字体配置获取的崩溃问题
3. **Fedora 打包**: 等待 fontconfig 或 glycin 的修复版本进入 Fedora 仓库后升级
4. **降级方案**: 如长期未修复，可考虑降级 glycin-libs 到 2.0.8

## 排查过程中用到的命令

```sh
# 查看 core dump 信息
coredumpctl list ghostty

# 查看崩溃栈回溯（完整 gdb 调试）
coredumpctl debug ghostty

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

# 验证 gdk-pixbuf 能否加载图像（glycin 配置诊断）
python3 -c "
import gi
gi.require_version('GdkPixbuf', '2.0')
from gi.repository import GdkPixbuf, GLib
try:
    pb = GdkPixbuf.Pixbuf.new_from_file('/path/to/icon.svg')
    print('OK:', pb.get_width(), 'x', pb.get_height())
except GLib.Error as e:
    print('FAIL:', e.message)
"

# 查看 gdk-pixbuf 已注册的图像格式（含 glycin 提供者）
python3 -c "
import gi
gi.require_version('GdkPixbuf', '2.0')
from gi.repository import GdkPixbuf
for f in GdkPixbuf.Pixbuf.get_formats():
    print(f.get_name(), f.get_mime_types())
"

# 检查 gdk-pixbuf 是否直接链接 libglycin
ldd /lib64/libgdk_pixbuf-2.0.so.0 | grep glycin

# 列出 glycin 导出的符号
nm -D /lib64/libglycin-2.so.0 | grep 'gly_loader'

# 查找 GLYCIN_DATA_DIR 的设置来源
grep -r 'GLYCIN_DATA_DIR' ~/.config ~/.zshrc /etc/environment.d/ 2>/dev/null

# 查看 glycin 加载器配置
cat /usr/share/glycin-loaders/2+/conf.d/glycin-svg.conf

# 查看完整的模块依赖链
objdump -T /lib64/libgdk_pixbuf-2.0.so.0 | grep 'gly_' | awk '{print $NF}' | sort -u
```
