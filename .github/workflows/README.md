# CI Workflows

## sync-package.yml — 自动同步上游 npm 包

### 做什么

每日定时从 npm registry 拉取 [`@tencent-weixin/openclaw-weixin`](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) 的最新版本源码，同步到本仓库。

### 工作流程

```
npm view 获取最新版本
        │
        ▼
与 VERSION 文件比较 ──(相同)──▶ 跳过，结束
        │
      (不同)
        ▼
下载 tarball 并解压
        │
        ▼
清除旧文件，同步新源码
        │
        ▼
创建 PR (sync/v{version})
        │
        ▼
检查是否可合并 ──(有冲突)──▶ 保留 PR，等待手动处理
        │
      (无冲突)
        ▼
Approve → Squash Merge → 删除分支
        │
        ▼
创建 Git Tag + GitHub Release
```

### 触发方式

| 方式 | 说明 |
|------|------|
| 定时 | 每天 UTC 00:00（北京时间 08:00） |
| 手动 | Actions 页面 → Run workflow |

### 关键文件

| 文件 | 用途 |
|------|------|
| `VERSION` | 记录当前已同步的版本号，用于跳过重复同步 |
| `sync/v*` 分支 | 临时分支，合并后自动删除 |

### 为什么需要这个 CI

本仓库用于镜像 `@tencent-weixin/openclaw-weixin` 的源码。该 npm 包不提供公开的源码仓库，通过此 CI 可以：

- **追踪变更** — 每次上游发版自动生成 PR 和 Release，通过 git diff 清晰看到版本间差异
- **版本归档** — 每个版本对应一个 git tag，可随时切换到任意历史版本
- **变更通知** — Watch 仓库即可收到上游更新的 Release 通知

### 所需仓库设置

- **Settings → Actions → General → Workflow permissions**:
  - 选择 "Read and write permissions"
  - 勾选 "Allow GitHub Actions to create and approve pull requests"
