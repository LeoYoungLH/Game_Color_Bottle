# Game Color Bottle

微信瓶子游戏的原创实现项目，当前提供基础可玩版本，并继续按已拆分任务扩展。


## 当前可玩版本

已实现 [Issue #2：基础倒水与收取](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2) 至 [Issue #5：隐藏层与显露](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/5)，包含 S01–S07 七个验证关卡。完整启动、检查和范围说明见 [RUNNING.md](./RUNNING.md)。

```powershell
npm.cmd ci
npm.cmd run dev
```

需要 Node.js 24.12 或更新版本。游戏入口默认是 http://127.0.0.1:5173/ 。运行 `npm.cmd test` 检查游戏会话行为，运行 `npm.cmd run build` 做类型检查和生产构建。

## 项目文档

- [项目术语](./CONTEXT.md)
- [研究与开发规划](./docs/wechat-bottle-game-plan.md)

当前已交付基础倒水、固定目标收取与三关验证流程；完整微信工程和后续机制按任务逐步实现。

## 开发原则

- 用可验证的行为规格描述玩法，并记录尚未确定的规则。
- 独立实现游戏逻辑，重新设计瓶子、界面、关卡及视听内容。
- 记录第三方素材与依赖的来源和许可。
- 将本机诊断、参考资料和分析产物与可发布内容分别管理。

## 任务管理

项目仓库：https://github.com/LeoYoungLH/Game_Color_Bottle

建议使用本仓库的 GitHub Issues 管理需求和任务；工程技能的具体配置待确认后写入 `docs/agents/`。
