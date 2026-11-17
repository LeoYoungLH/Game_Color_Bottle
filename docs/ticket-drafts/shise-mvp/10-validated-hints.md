## Parent

[#1 [Spec] 拾色工坊 MVP：12 个代表性关卡与完整收集闭环](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/1)

## What to build

玩家点击提示时得到可执行且有依据的下一步，或得到当前无法可靠建议的说明。对已实现的验证关卡，通过真实会话规则回放合法解法并区分找到解、无解与预算耗尽。

依据当前《拾色工坊 MVP》规格；通过游戏会话公开入口验证玩家可见行为，并补充本票所需的少量浏览器检查。规格验收引用：T19、T29。这些编号是验收场景，不是 GitHub Issue 编号。

## Acceptance criteria

- [ ] 搜索/回放涵盖目标库存、已收取瓶位、隐藏信息、封签门槛、定色出水限制以及当前已开放的辅助槽与空瓶；不借用简单分色结果直接宣称可解。
- [ ] 给定明确输入与预算返回已找到合法轨迹、搜索完毕确认无解、或未知/预算耗尽；未穷尽不能宣称无解。
- [ ] 提示通过当前可见界面提供一条当前合法操作及理由，不直接展开所有隐藏颜色；仅验证合法性时明确说明不保证通关。
- [ ] 可无广告回放现有 S01–S11 的固定轨迹，记录关卡版本、种子和结果；有错误的候选不进入关卡清单。完整 12 关由 [#14](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/14) 验收。
- [ ] 隐藏信息的安全显露路径另行审核，全知解法不能替代信息公平性说明。
- [ ] 通过会话公开入口回放轨迹和读取提示结果，不测试私有搜索步骤；预算不足时界面保持可操作，不虚构提示。
- [ ] 提供 [#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) 可调用的候选局面检查能力，但本票不随机生成无限关卡、不做完整信念状态求解。

## Blocked by

- [#5 完成隐藏层显露与可理解的探索关卡](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/5)
- [#6 完成累计收取揭封的关卡流程](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/6)
- [#7 完成定色瓶只接水与逐瓶解除固定](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/7)
- [#9 完成第四收集槽解锁与奖励目标隔离](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/9)

<!-- game-color-bottle:shise-mvp:D10:2026-11-16 -->
