---
title: "Git基础概念"
_legacy_source: "git使用指南/Git基础概念.md"
_original_note: true
legacy_title_id: "git基础概念"
created: "2026-04-18T00:26:44+08:00"
modified: "2026-04-18T00:26:44+08:00"
tags: ["git使用指南"]
---

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
