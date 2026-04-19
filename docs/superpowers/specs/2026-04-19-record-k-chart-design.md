# Coin Hub 记录 K 线图与结果回溯设计

## 1. 背景与目标

当前研究台已经具备记录录入、样本结算、候选策略归纳和基础行情展示能力，但主图仍以 TradingView embed 为中心，记录与图表之间缺少真正可控的时间锚点层。用户当前的核心目标已经收敛为一条更直接的研究链路：

- 把记录节点同步到 K 线图时间轴
- 在图上直观看到记录后的走势
- 对记录或观点方案给出 `good / neutral / bad` 结果
- 基于结果继续做回溯、筛选和归纳

本设计定义第一版 `记录 K 线图` 工作台，并为后续复盘沉淀能力提供稳定的数据边界。

## 2. 产品定义

### 2.1 核心职责

第一版只负责四件事：

1. 把记录或观点方案锚定到本地可控 K 线图
2. 对记录后的走势生成三级结果：`good / neutral / bad`
3. 允许给结果打复盘标签
4. 支持按结果与标签做回看和聚合

### 2.2 首屏优先级

`记录 K 线图工作台` 升为页面首屏最优先区域。

- 用户进入页面后先看到研究图，而不是介绍区或双图说明区
- 记录流、详情区、录入动作和候选策略区围绕研究图服务
- 当前偏介绍性的顶部区域收缩为轻量说明
- ETH 对照图从主视觉降级为次级对照能力
- 现有 TradingView 视图保留为次级参考位，可放入折叠区、标签页或次级面板

### 2.3 成功标准

第一版完成后，系统应满足以下结果：

- 每条记录都能在图上定位到明确时间节点
- `trade` 和 `view` 都能生成可查看的结果对象
- 用户可以在图上快速判断记录后的走势质量
- 用户可以按 `good / neutral / bad` 和复盘标签回看结果
- 任何结果都可以反查到原始记录或观点方案

## 3. 方案选择

本次设计比较过三种方向：

1. 本地研究图 + 独立记录轨道
2. 保留 TradingView 主图 + 下方记录轨道
3. 先做记录回放图，不强求 K 线主视图

最终采用方向 1：`本地研究图 + 独立记录轨道`。

选择原因：

- 时间锚点最清楚
- 结果条、标签、详情联动最自然
- 后续回溯和归纳可以直接复用同一套 outcome 数据

## 4. 信息架构

### 4.1 首屏工作台结构

首屏主区域推荐结构如下：

1. `研究图控制条`
   - `BTC / ETH` 切换
   - `15m / 1h / 4h / 1d` 周期切换
   - `all / good / neutral / bad` 结果筛选
   - 标签筛选入口

2. `本地研究图`
   - 上层是简化 K 线视图
   - 下层是独立记录轨道
   - 记录轨道与 K 线共用同一时间轴
   - 选中对象时显示观察窗口高亮

3. `记录流与选中详情`
   - 最近记录列表
   - 选中记录或 plan outcome 详情
   - 自动结果说明
   - 复盘标签编辑区

4. `回溯聚合区`
   - 结果分布
   - 标签热度
   - 筛选后的结果列表

5. `候选策略区`
   - 继续保留，但从首屏中心区后移

6. `TradingView 参考视图`
   - 继续保留现有 TradingView 图表能力
   - 不再承担首屏主研究图职责
   - 用于查看更完整的原生行情细节与熟悉的交易视图

### 4.2 视觉规则

- 研究图是页面第一视觉中心
- 记录轨道采用独立轨道，而不是直接把标签压在价格层
- `good / neutral / bad` 采用结果色表达
- 记录条和详情区保持同步高亮

## 5. 对象与判定模型

### 5.1 原始记录层

现有 `trader_record` 继续表示原始事实，负责保存：

- `traderId`
- `symbol`
- `recordType`
- `sourceType`
- `occurredAt`
- `rawContent`
- 可选结构化交易字段

原始记录层不直接承载复盘结论。

### 5.2 结果层

新增 `record outcome` 结果层，专门表示“这条记录后来怎么样”。

建议最小字段：

- `id`
- `subjectType`：`record` 或 `plan`
- `subjectId`
- `symbol`
- `timeframe`
- `windowType`
- `windowStartAt`
- `windowEndAt`
- `resultLabel`：`good | neutral | bad | pending`
- `resultReason`
- `forwardReturnPercent`
- `maxFavorableExcursionPercent`
- `maxAdverseExcursionPercent`
- `ruleVersion`
- `computedAt`

设计原则：

- 原始记录稳定保存
- 结果可重算
- 判定依据对用户可解释

### 5.3 标签层

新增 `review tag` 复盘标签层，标签挂在 `record outcome` 上，不直接挂在原始记录上。

标签体系采用：

- `预置标签库`
- `自定义标签`

这样同一条 `view` 记录下的不同 `plan outcome` 可以拥有不同标签。

## 6. 结果生成规则

### 6.1 按记录类型分开

结果判定按 `recordType` 分开：

1. `trade`
   - 第一版不直接用真实平仓盈亏作为结果标签
   - 第一版看记录后的走势质量
   - 目标是回答“记录点之后，市场是否按这个方向走出来”

2. `view`
   - 结果绑定到 `plan` 级别
   - 同一条观点可产生多条 `plan outcome`

### 6.2 结果等级

第一版统一输出三级评价加一种技术状态：

- `good`
- `neutral`
- `bad`
- `pending`

其中：

- `pending` 表示观察窗口尚未补齐、关键 candle 缺失或无法安全判定
- `good / neutral / bad` 表示结果已完成计算

`pending` 属于技术状态，不属于评价等级。

### 6.3 观察窗口

结果判定采用“按记录类型分开”的窗口策略：

- `trade`：使用走势质量观察窗口
- `view`：使用 `plan` 级观察窗口

第一版窗口规则采用固定 profile，按 `recordType + timeframe` 组合管理。实现阶段需要产出一份默认 profile 表，先以内置代码配置落地，并把命中的判定原因回写到 `resultReason`。

### 6.4 判定依据

第一版 outcome 引擎至少使用以下三类指标：

- `forwardReturnPercent`
- `maxFavorableExcursionPercent`
- `maxAdverseExcursionPercent`

系统基于 profile 组合这些指标，得出 `good / neutral / bad`。详情区必须显示命中原因，保证结果可解释。

## 7. 核心交互流

### 7.1 首屏进入

- 进入页面后默认选中最近一条记录或最近一个 outcome
- 研究图直接高亮对应时间点与观察窗口
- 右侧详情同步展示原始记录、自动结果和复盘标签

### 7.2 新建记录后的反馈

- 新建 `trade` 或 `view` 记录后自动选中该对象
- 图上立即出现对应记录条
- 如果 candle 足够，系统立即生成 outcome
- 如果 candle 不足，先显示 `pending`

### 7.3 点击记录条

点击研究图中的记录条后：

- 高亮对应 K 线区间
- 定位到 outcome 详情
- 展示结果说明
- 允许添加或编辑复盘标签

### 7.4 回溯面板

第一版回溯能力先做到“结构化筛选与聚合”，不做长篇 AI 总结。

支持按以下维度筛选：

- `resultLabel`
- `reviewTag`
- `trader`
- `symbol`
- `timeframe`
- `recordType`

支持看到以下聚合结果：

- 哪些标签最常出现在 `good`
- 哪些标签最常出现在 `bad`
- 哪些交易员或记录类型更容易出现 `good`
- 当前筛选集合下的结果分布

### 7.5 与 candidate strategy 的关系

现有 `strategy_candidate` 链路继续保留，它偏“策略归纳”。新增的 `outcome + review tag` 链路偏“记录复盘”。

第一版两条链路并存：

- `strategy_candidate` 服务策略抽象
- `record outcome` 服务结果回看

后续可以让 `good outcome` 反哺 `strategy_candidate`。

## 8. 技术边界

### 8.1 图表边界

- 当前 `TradingView embed` 不再承担首屏主研究图
- 现有 `TradingView embed` 保留为次级参考视图，不做第一版硬删除
- 新增本地可控研究图组件，直接消费已有 `chart.candles`
- 研究图组件负责时间轴、记录轨道、窗口高亮和点击联动

### 8.2 数据边界

保留现有数据链：

`trader_record -> execution_plan -> trade_sample -> strategy_candidate`

新增结果回看链：

`trader_record / execution_plan -> record_outcome -> review_tag_link`

原始记录与结果分层存储，允许 outcome 覆盖重算，不回写原始事实。

### 8.3 第一版明确不做

- 不做复杂 AI 复盘总结
- 不做自动标签推荐
- 不做多资产同屏主研究图
- 不做画图式人工标注工具
- 不做 outcome 历史规则版本回放

## 9. 异常处理

第一版至少覆盖以下情况：

1. `candle 不足`
   - 结果显示为 `pending`
   - 记录条仍显示在图上

2. `时间点无法精确命中 candle`
   - 自动吸附到最近一根 candle
   - 详情区提示已做对齐

3. `view plan 缺少关键字段`
   - 允许显示记录条
   - 缺少方向信息或无法确定时间锚点时不生成 outcome

4. `标签库为空`
   - 使用默认预置标签集启动

5. `重算失败`
   - 不影响原始记录浏览
   - 仅影响结果区显示

## 10. 测试与验证

### 10.1 单元测试

- outcome 判定函数
- 时间点对齐逻辑
- 结果筛选与聚合逻辑

### 10.2 组件测试

- 首屏研究图渲染
- 点击记录条联动详情
- 结果标签与复盘标签展示

### 10.3 集成测试

- 创建记录后自动出现在图上
- `trade` 与 `view plan` 生成 outcome
- 按结果和标签过滤

### 10.4 E2E

- 从录入记录到图上查看再到打标签的完整链路

## 11. 实现顺序建议

建议按以下顺序进入 implementation plan：

1. 首屏布局重排，研究图升为主视觉
2. 本地研究图组件与记录轨道
3. outcome 数据模型与计算链路
4. 结果详情与复盘标签编辑
5. 回溯筛选与聚合区
6. 与现有 candidate strategy 的共存整理

## 12. 结论

本设计把 Coin Hub 的下一阶段目标收敛为一条清晰主线：

- 先把记录钉到图上
- 再把结果判断做出来
- 再把结果变成可筛选、可归纳、可复用的研究资产

第一版的重心是“看得见、判得清、能回看”，而不是扩张成复杂分析系统。
