## Parent

[#1 [Spec] 拾色工坊 MVP：12 个代表性关卡与完整收集闭环](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/1)

## What to build

玩家在右下角观看模拟广告取得一次撤回机会，看到角标 1，再点击恢复上一次倒水及完整连锁结果。此票建立道具机会账本与规则历史的分离，供打乱复用。

依据当前《拾色工坊 MVP》规格；通过游戏会话公开入口验证玩家可见行为，并补充本票所需的少量浏览器检查。规格验收引用：T12、T21、T22、T23、T24、T27、T28、T29、T30。这些编号是验收场景，不是 GitHub Issue 编号。

## Acceptance criteria

- [ ] 右下角撤回初始 0 次；成功广告只给撤回 1 次且不自动操作，角标显示 1；已有机会时直接使用，不重复请求广告。
- [ ] 无历史时不引导无作用广告；取消、失败、不匹配及重复结果不发奖；机会暂存上限为 1。
- [ ] 成功撤回消耗一次机会并隐藏角标，恢复最近一次成功倾倒及收取、目标更新、揭封、定色解除、隐藏信息与胜负状态；非法动作不进入历史。
- [ ] 恢复历史时保留已取得的空瓶和第四槽权益，不复制目标或液体；已消费的道具机会不因历史回退返还。
- [ ] 快速点击只处理一次有效撤回；完成态可按本版规则撤回到上一步，次数不足或无历史时不修改棋盘。
- [ ] 机会账本与棋盘快照分离，并保留后续保存恢复所需的公开状态；本票不做持久化，也不实现打乱。
- [ ] 用同时包含隐藏、封签、定色及辅助槽的受控局面演示完整回退，覆盖每种结果的会话检查和角标交互。

## Blocked by

- [#5 完成隐藏层显露与可理解的探索关卡](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/5)
- [#6 完成累计收取揭封的关卡流程](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/6)
- [#7 完成定色瓶只接水与逐瓶解除固定](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/7)
- [#9 完成第四收集槽解锁与奖励目标隔离](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/9)

<!-- game-color-bottle:shise-mvp:D09:2026-11-16 -->
