# Git基础概念

## 工作区,暂存区和版本库

```text
工作区（Working Directory）
    ↓ git add
暂存区（Staging Area / Index）
    ↓ git commit
本地仓库（Local Repository）
    ↓ git push
远程仓库（Remote Repository）
```

## 文件状态流转

```text
Untracked（未跟踪）
    ↓ git add
Staged（已暂存）
    ↓ git commit
Unmodified（未修改）
    ↓ 编辑文件
Modified（已修改）
    ↓ git add
Staged（已暂存）
```
