# agent-browser — Web 应用开发 / 测试 / 维护 / 冒烟

Suite of user-invoked skills for the web-app lifecycle, driven by the **agent-browser**
skill + CLI — the operation layer (external, referenced not vendored:
`npm i -g agent-browser && agent-browser install`).

## 何时取用

| 需求 | 技能 |
|---|---|
| 实现 / 开发一个功能 | [web-dev](./web-dev/) |
| 页面是否符合预期 | [web-checker](./web-checker/) |
| 修到与参考一致 | [web-fixer](./web-fixer/) |
| 核心流程端到端验证 | [web-smoke](./web-smoke/) |
| 验证是否过期 / 重跑 / 清理 | [web-maintain](./web-maintain/) |

## 运行模型（摘要）

- **structure-first, vision-on-demand** — 感知默认走 DOM / accessibility tree（snapshot →
  read → eval → console/errors），像素只在"外观任务 / 无 DOM 内容 / 给人看的证据"时用。
- **run** — 一次可追溯验证单元，锚定 worktree + branch + commit；supersede 链、写时即写。
- **存储** — `.agent-browser/`（committed：manifest / index / flows MD）+
  `.agent-browser/runs/`（gitignored 证据）。
- **选择性遗忘** — index 只承载当前状态 + 窗口；git 是档案；tidy 显式遗忘，永不后台。
- 完整契约：[references/session-model.md](references/session-model.md)

## 分层

```
business layers (user-invoked)                    operation layer (external)
┌──────────────────────────────┐                  ┌─────────────────────────────┐
│  web-dev      开发回路        │                  │  agent-browser 技能 + CLI     │
│  web-checker  结构/视觉裁决   │──depends on────▶│    npm i -g agent-browser     │
│  web-fixer    修复回路        │  (one-way)      │    agent-browser install      │
│  web-smoke    定义流验证      │                  │    skills get core（参考）    │
│  web-maintain staleness/遗忘 │                  └─────────────────────────────┘
└──────────┬───────────────────┘
           │ 共享
           ▼
   scripts/agent-browser-run（run 生命周期）
   scripts/agent-browser-stale（staleness 扫描 + 遗忘）
   references/session-model.md（契约）
```

五个技能全部 user-invoked（`disable-model-invocation: true`，零 context load）—— 需要时按
名调用；本 README 是它们的人肉路由索引。判断留给 agent，确定性计算进脚本，命令细节永远
从 `agent-browser skills get core` 取（CLI 即参考，永不 stale）。

## 安装

```bash
npm i -g agent-browser && agent-browser install   # operation layer（一次性）
npx skills add transmit-bug/agent-compass --skill web-smoke --skill web-checker \
  --skill web-fixer --skill web-dev --skill web-maintain
```

扩展：新的 web 工作流 = 本目录下新 `<name>/SKILL.md`（user-invoked），指向共享脚本与契约，
并在本表 + skills-lock.json 登记。
