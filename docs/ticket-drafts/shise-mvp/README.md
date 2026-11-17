# 拾色工坊 MVP：已发布任务与依赖

更新日期：2026-11-16。状态：用户已确认，13 项任务及父规格均已发布并核验。

规格：[#1 [Spec] 拾色工坊 MVP：12 个代表性关卡与完整收集闭环](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/1)。所有任务使用 `ready-for-agent` 标签，依赖方式为：20 条 GitHub 原生阻塞关系，并在每条任务正文中保留实际 Issue 链接。

D01–D13 保留为设计阶段的稳定编号；下表的 # 编号和链接才是 GitHub Issue 身份。当前目录保留已发布正文，不是另一套本地任务管理系统。

## GitHub 任务清单

| 设计编号 | GitHub Issue | 直接前置 | 本地正文 |
| --- | --- | --- | --- |
| D01 | [#2 完成基础倒水与收取的一关可玩流程](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2) | 无，可先开始 | [正文](./01-playable-first-level.md) |
| D02 | [#3 完成目标换色、连续收取与下一关](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3) | [#2](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2) | [正文](./02-orders-and-next-level.md) |
| D03 | [#4 交付最多三行的原创界面与基础反馈](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/4) | [#2](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2) | [正文](./03-responsive-original-interface.md) |
| D04 | [#5 完成隐藏层显露与可理解的探索关卡](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/5) | [#3](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3) | [正文](./04-hidden-layers.md) |
| D05 | [#6 完成累计收取揭封的关卡流程](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/6) | [#3](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3) | [正文](./05-collection-seals.md) |
| D06 | [#7 完成定色瓶只接水与逐瓶解除固定](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/7) | [#3](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3) | [正文](./06-receive-only-bottles.md) |
| D07 | [#8 完成两个广告空瓶的独立模拟解锁](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/8) | [#3](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3) | [正文](./07-reward-empty-bottles.md) |
| D08 | [#9 完成第四收集槽解锁与奖励目标隔离](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/9) | [#8](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/8) | [正文](./08-reward-fourth-slot.md) |
| D09 | [#10 完成广告获得一次机会的撤回](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10) | [#5](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/5)、[#6](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/6)、[#7](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/7)、[#9](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/9) | [正文](./09-ad-credit-undo.md) |
| D10 | [#11 让玩家获得有依据的提示与关卡回放结果](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/11) | [#5](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/5)、[#6](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/6)、[#7](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/7)、[#9](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/9) | [正文](./10-validated-hints.md) |
| D11 | [#12 完成广告打乱、满瓶保护与失败不扣次](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10)、[#11](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/11) | [正文](./11-ad-credit-shuffle.md) |
| D12 | [#13 完成暂停、重开、继续游戏与权益持久化](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/13) | [#4](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/4)、[#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) | [正文](./12-save-resume-retry.md) |
| D13 | [#14 交付十二关验证清单与完整可玩版本](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/14) | [#13](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/13) | [正文](./13-twelve-level-mvp.md) |

## 每项交付与依赖理由

### D01 · #2 完成基础倒水与收取的一关可玩流程

玩家可以启动网页版本，选择源瓶与目标，整理颜色并完成一个基础关卡。以现有沙盘为行为参考建立最小正式游戏会话入口，同时交付基础验证关卡 S01–S03；工程配置、输入、规则、界面与行为验证随这条可玩流程一起完成。

无前置开发任务。测试边界采用已确认的统一游戏会话入口；不创建单独的基础设施或纯规则层票。

### D02 · #3 完成目标换色、连续收取与下一关

玩家做好待收满瓶后，交付台能更新目标并连续收取；最终只结算一次，并能进入下一验证关。交付 S04–S05，补齐从开局到下一关的目标库存流程。

依赖 D01 的可玩会话、瓶位身份和基本收取行为。

### D03 · #4 交付最多三行的原创界面与基础反馈

玩家在手机或桌面上能清楚选择瓶子、识别颜色和交付状态，关卡数量变化时保持最多三行。将原型的暖色工坊、方瓶和交付卡落实到可玩流程，并提供基础声音/震动设置。

只依赖 D01 的可玩输入和状态；不依赖目标队列、广告接入或特殊限制完成。

### D04 · #5 完成隐藏层显露与可理解的探索关卡

玩家能在两关中逐步显露隐藏颜色、完成收取，并区分已知与未知信息。交付 S06–S07，保证隐藏层参与正常倒水和目标结算。

依赖 D02 的完整动作/收取链，以便显露结果能够在真实通关流程中验收。

### D05 · #6 完成累计收取揭封的关卡流程

玩家看到封签门槛，完成指定数量的实际收取后揭封并继续通关。交付 S08–S09，以不同阈值验证计数与开放条件。

依赖 D02 的实际收取计数和连续结算，而不依赖隐藏层或定色瓶。

### D06 · #7 完成定色瓶只接水与逐瓶解除固定

玩家识别只能接水的瓶子，将其装成单色满瓶后单独解除固定，并按目标要求交付。交付 S10–S11，从单瓶教学到同行多瓶。

依赖 D02 的满瓶等待、目标调度和收取链，不依赖 D04 或 D05。

### D07 · #8 完成两个广告空瓶的独立模拟解锁

玩家在缺少接水空间时选择一个广告空瓶，获得成功结果后原地开放，取消或失败则返回原局面。用这条流程建立其他奖励复用的请求身份与结果处理边界。

依赖 D02 的关卡切换/代次和真实可玩的局面，以便验证跨关结果不会误发奖。

### D08 · #9 完成第四收集槽解锁与奖励目标隔离

玩家可以用独立的模拟奖励开启第四个收集槽，让一个尚未分配的目标进入该槽，并继续完成收集。该奖励不影响下方广告空瓶。

D07 已传递依赖 D02，并提供奖励请求和身份处理；无需重复列出 D02。

### D09 · #10 完成广告获得一次机会的撤回

玩家在右下角观看模拟广告取得一次撤回机会，看到角标 1，再点击恢复上一次倒水及完整连锁结果。此票建立道具机会账本与规则历史的分离，供打乱复用。

必须在 D04/D05/D06 的状态和 D08 的辅助槽权益存在后，才能验收完整回退；D08 已包含 D07 的模拟奖励依赖。

### D10 · #11 让玩家获得有依据的提示与关卡回放结果

玩家点击提示时得到可执行且有依据的下一步，或得到当前无法可靠建议的说明。对已实现的验证关卡，通过真实会话规则回放合法解法并区分找到解、无解与预算耗尽。

需要 D04/D05/D06 和 D08 提供全部前向规则及辅助槽状态；不需要撤回，因为求解不依赖付费回退操作。

### D11 · #12 完成广告打乱、满瓶保护与失败不扣次

玩家在左下角完整观看模拟广告获得一次打乱机会，角标显示 1；再次点击后仅提交通过检查的有效重排。与撤回机会、空瓶和第四槽独立。

D09 提供机会账本及可撤回历史，D10 提供候选检查；缺少任一项都不能兑现有效打乱后才扣次。

### D12 · #13 完成暂停、重开、继续游戏与权益持久化

玩家离开、刷新浏览器、重试当前关或进入下一关后，能恢复一致的对局和应保留的权益；存档损坏或存储不可用时能安全继续或重新开始。

D11 已传递包含全部规则和奖励账本依赖；另依赖 D03 的设置与交互，才能兑现保存恢复设置和实际页面流程。

### D13 · #14 交付十二关验证清单与完整可玩版本

用户能够选择并连续游玩完整的 S01–S12 验证清单，体验全部机制与组合，并看到本版完成。整合前序已交付关卡，补齐 S12 和最终交付说明，形成可评审的 MVP。

D12 已传递包含全部功能依赖；本票新增组合关与完整内容体验，不另建一个与功能脱离的纯测试阶段。

## 执行顺序

先执行 [#2](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2)。之后只选择直接前置已经完成的任务。ready-for-agent 表示规格已明确，不表示可以忽略阻塞依赖。

目标仍为首个可玩的浏览器验证版本，真实微信广告、平台发布和完整 60 关不在此批任务范围。

## 验收与关卡覆盖

统一游戏会话公开行为是主要验收边界，浏览器补关键流程与布局。现有测试边界已由用户在采用规格及拆分时确认。

| 验收场景 | 主要实现任务 |
| --- | --- |
| T01 | [#2](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2) |
| T02 | [#2](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2)、[#7](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/7) |
| T03 | [#5](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/5) |
| T04 | [#2](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2)、[#3](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3) |
| T05 | [#3](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3) |
| T06 | [#6](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/6) |
| T07 | [#7](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/7) |
| T08 | [#2](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2)、[#8](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/8) |
| T09 | [#8](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/8) |
| T10 | [#8](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/8) |
| T11 | [#9](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/9) |
| T12 | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10) |
| T13 | [#13](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/13) |
| T14 | [#13](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/13) |
| T15 | [#4](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/4) |
| T16 | [#3](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3)、[#4](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/4)、[#6](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/6) |
| T17 | [#2](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/2)、[#3](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3) |
| T18 | [#3](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/3)、[#13](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/13) |
| T19 | [#11](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/11) |
| T20 | [#4](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/4) |
| T21 | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10)、[#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |
| T22 | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10)、[#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |
| T23 | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10)、[#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |
| T24 | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10)、[#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |
| T25 | [#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |
| T26 | [#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |
| T27 | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10)、[#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |
| T28 | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10) |
| T29 | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10)、[#11](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/11)、[#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |
| T30 | [#10](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/10)、[#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |
| T31 | [#13](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/13) |
| T32 | [#12](https://github.com/LeoYoungLH/Game_Color_Bottle/issues/12) |

D13 在集成版本中回归全部场景并完成 12 条无广告通关轨迹。各功能票先交付自己的完整行为和示例关卡，不把验证全部推迟到最后。

## 发布说明

- 发布正文、标签、真实前置链接均已回读比对。
- 原生阻塞关系已核对。
- 父规格的正文、标签与开放状态在创建后未被子任务发布流程修改。
- 若以后调整规格或依赖，使用真实 Issue 身份更新并记录变化，避免重复创建同一任务。
