# AGENTS.md

## 这个仓库是做什么的

agent-compass 是一个 **Agent Skills 技能集合仓库**：技能按分类组织，通过 GitHub + skills CLI
（`npx skills`）分发安装。它的产物是"可安装的技能"，不是应用代码。

- 用分类容器组织技能，用 `.claude-plugin/marketplace.json` 分组安装
- 技能遵循 Agent Skills 规范 + writing-great-skills 原则
- 跨领域能力优先泛化成一个技能，不为每个领域堆技能

## 组织结构

```
skills/                        # 技能容器（CLI 递归深度 3）
├── content-manager/           # AI 纳入的上下文（AGENTS.md 生成与约束）
├── desktop-automation/        # 桌面应用自动化（midscene）
├── agent-browser/             # Web 应用开发/测试/维护/冒烟
└── logic-test/                # 跨领域技能放容器根级
.claude-plugin/marketplace.json  # 安装分组（source 必须 "./"，裸 "." 无效）
skills-lock.json                 # 技能注册表（skillPath + computedHash）
README.md                        # 人类索引（技能清单在这里，本文件不重复）
```

## 新增技能

1. 先判断值不值得独立成技能：泛化优先 —— 用分支（branch）让一个技能覆盖多领域，
   而不是每个领域各写一个
2. 放到正确分类：`skills/<category>/<name>/SKILL.md`；跨领域放 `skills/<name>/`
3. SKILL.md 遵守：
   - 本仓库技能全部 `disable-model-invocation: true`（user-invoked，零 context load）
   - 步骤有可检查的完成准则；guardrail 正向表述
   - 共享机制放分类级 `scripts/`，共享契约放分类级 `references/`，技能内用相对路径指过去，零复制
   - 意图（怎么做、做到什么算好）用 Markdown；记录（做了什么、结果）用 JSON；
     确定性计算进脚本，判断留给 agent
4. 同步三处：`skills-lock.json` 注册 + `.claude-plugin/marketplace.json` 分组 + README 索引

## 修改技能

- 内容改动后必须更新 `skills-lock.json` 的 `computedHash`：
  sha256(按相对路径排序的 relativePath+content 拼接)；目录移动只改 `skillPath`，hash 不变
- 一个含义只保留一处（单一事实源）：共享逻辑改分类级脚本/契约，不改各技能副本

## 验证

- 用临时目录跑 `npx skills add <repo> --list` 确认发现与分组，**不要全局安装**
- 本地验证在项目目录内（project 级），不污染全局技能目录
