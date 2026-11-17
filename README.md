# Game Color Bottle

微信瓶子游戏的原创实现项目，当前提供基础可玩版本，并继续按已拆分任务扩展。


## 当前可玩版本

已实现 [Issue #2：基础倒水与收取](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2) 至 [Issue #7：定色瓶](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/7)，包含 S01–S11 十一个验证关卡。完整启动、检查和范围说明见 [RUNNING.md](./RUNNING.md)。

```powershell
npm.cmd ci
npm.cmd run dev
```

需要 Node.js 24.12 或更新版本。游戏入口默认是 http://127.0.0.1:5173/ 。运行 `npm.cmd test` 检查游戏会话行为，运行 `npm.cmd run build` 做类型检查和生产构建。

## 第一版设计

- [设计方案与前 60 关节奏](./docs/design-v1.md)
- [可点击规则沙盘](./design/prototype-v1.html)：下载或在本地用浏览器打开即可，无需安装依赖。该文件是评审原型，不是正式游戏工程。
- [界面预览](./design/interface-v1.png)

## 开发规格

- [首个可玩版本规格](./docs/specs/shise-mvp-spec.md)：75 条用户故事、12 个验证关卡和 32 项验收场景；已发布 [GitHub #1](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/1)。
- [GitHub Issue 发布记录](./docs/specs/shise-mvp-publication.md)：规格与 13 项任务已发布并核验。

## 开发任务

- [13 项 MVP 任务与依赖](./docs/ticket-drafts/shise-mvp/README.md)：每项已有独立 GitHub Issue、验收条件和实际阻塞关系。

## 项目文档

- [项目术语](./CONTEXT.md)
- [研究与开发规划](./docs/wechat-bottle-game-plan.md)
- [“倒水杯”目标识别与 REA 评估](./docs/daoshuibei-rea-assessment.md)
- [核心规则与通关流程](./docs/daoshuibei-core-rules.md)
- [第一段录屏的界面分析](./docs/daoshuibei-video-analysis.md)
- [第三段录屏的只接水限制](./docs/daoshuibei-row-lock-analysis.md)

参考游戏为用户指定的“倒水杯”；已分析三段录屏，核心循环包含倒水、隐藏层、目标收集、累计揭封、只接水限制、每关两个广告空瓶和广告获得的打乱/撤回次数。已交付“拾色工坊”V1 设计与可点击规则沙盘；最终引擎、美术与发布范围仍待评审，当前没有可发布的微信工程。

## 开发原则

- 用可验证的行为规格描述玩法，并记录尚未确定的规则。
- 独立实现游戏逻辑，重新设计瓶子、界面、关卡及视听内容。
- 记录第三方素材与依赖的来源和许可。
- 将本机诊断、参考资料和分析产物与可发布内容分别管理。

## 任务管理

项目仓库：https://github.com/LeoYoungLH/Game_Color_Bottle

使用本仓库的 GitHub Issues 管理需求和任务。工程技能入口见 [AGENTS.md](./AGENTS.md)，任务管理、默认分流标签和领域文档规则见 `docs/agents/`。
