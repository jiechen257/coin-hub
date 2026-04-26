# Coin Hub 记录工作台与归档分析设计

## 1. 背景与目标

当前 research desk 已支持记录录入、记录列表、结果图、TradingView 参考视图、样本结算、候选策略归纳和归档动作。当前痛点集中在四个交互断点：

- 记录切换主要在底部列表完成，顶部缺少全局选择入口
- 单条记录缺少清晰的生命周期状态，补齐动作与状态表达混在一起
- 首页首屏优先展示结果图，正在运行的记录和新建入口不够直接
- 已归档记录从主工作台移除后缺少独立分析页

本设计把首页重组为记录工作台：首屏展示运行中记录，左侧固定公共操作，右侧用顶部 tab 切换看板内容，并新增归档分析视图。

## 2. 已确认决策

### 2.1 首页布局

采用 `左侧公共栏 + 右侧顶部 tab`。

左侧公共栏固定展示：

- 新建记录
- 顶部记录下拉选择器
- 状态筛选与数量
- 当前选中记录摘要
- 单条记录待补齐提示
- 结果总览与标签过滤

右侧主区使用顶部 tab：

- `运行中`：默认首屏，展示正在运行的记录看板
- `全部记录`：展示非归档记录列表，可按状态、交易员、标的筛选
- `归档分析`：展示已归档记录、TradingView 参考视图和总结分析
- `候选策略`：保留现有候选策略归纳能力

### 2.2 记录状态

采用手动生命周期状态。新增 `record.status`，枚举为：

- `not_started`：尚未开始
- `in_progress`：进行中
- `ended`：已结束
- `archived`：已归档

状态由用户动作显式改变：

- 新建记录默认 `not_started`
- 点击 `开始` 进入 `in_progress`
- 点击 `结束` 进入 `ended`
- 点击 `归档` 进入 `archived`，同时写入 `archivedAt`

`archivedAt` 继续保留，用于归档排序、归档时间展示和历史兼容。

### 2.3 补齐逻辑

补齐是系统推导出的完整度提示，不替代状态。补齐提示分三组：

- 基础信息：交易员、标的、开始时间、结束时间、原始记录
- 方案信息：触发、入场、风控、离场、价格字段
- 复盘信息：样本结算、outcome、review tag、归档总结

单条记录详情区展示待补齐项，并提供直接编辑入口。补齐项可以影响提醒和排序，不自动改变 `record.status`。

## 3. 信息架构

### 3.1 页面壳

`ResearchDesk` 拆成更明确的工作台壳：

- `ResearchDeskWorkspaceShell`
- `ResearchDeskSidebar`
- `ResearchDeskMainTabs`
- `ActiveRecordsPanel`
- `AllRecordsPanel`
- `ArchiveAnalysisPanel`
- `StrategyCandidatesPanel`

壳组件负责状态和数据分发，面板组件只负责自己的视图。

### 3.2 左侧公共栏

公共栏是页面固定操作区，桌面端在左侧，移动端折叠到顶部。

公共栏必须满足：

- 新建记录按钮首屏可见
- 记录下拉选择器首屏可见
- 当前选中记录状态和待补齐项首屏可见
- 筛选器不随右侧 tab 切换而丢失
- 选中记录后右侧详情、图表和状态动作同步更新

记录下拉的显示格式：

`交易员 · 标的 · 状态 · 时间`

下拉默认包含非归档记录。进入 `归档分析` tab 时，下拉切换为已归档记录集合。

### 3.3 运行中 tab

`运行中` 是默认 tab。它回答两个问题：

- 当前有哪些正在运行的记录
- 哪些记录需要立即补齐或结束

内容结构：

- 状态统计卡：进行中、尚未开始、已结束
- 运行中记录看板
- 选中记录详情
- outcome 与结算入口

空状态：

- 没有进行中记录时展示尚未开始记录和新建入口
- 全部为空时展示新建记录主按钮

### 3.4 全部记录 tab

`全部记录` 展示未归档记录。它承接当前底部记录列表能力，并把列表提升到首屏 tab。

内容结构：

- 状态分组或筛选列表
- 记录卡片
- 编辑入口和状态徽章
- 记录详情与 outcome 联动

状态推进动作集中在左侧公共栏摘要和记录详情工具区。列表卡片只负责选择、展示和进入编辑，避免同一动作在多个位置重复出现。

### 3.5 归档分析 tab

`归档分析` 只展示 `status = archived` 或历史 `archivedAt != null` 的记录。

内容结构：

- 已归档记录列表
- 服务端搜索、交易员筛选、标的筛选、标签筛选
- 归档统计卡：归档数、good 占比、主要标签、待总结数量
- TradingView 参考视图
- 单条归档总结区
- outcome/tag 聚合区

第一版复用现有 `PriceChart`。选中归档记录后，TradingView 根据该记录的 `symbol` 和 `timeframe` 切换。时间区间先用于页面文案和记录摘要，TradingView embed 第一版不强制控制可视区。

归档分析必须通过独立查询契约加载数据，不从活跃研究图切片里临时拼接。归档 tab 使用归档专属 payload，一次返回归档记录、归档 outcome、统计聚合和 TradingView 所需行情切片。

### 3.6 候选策略 tab

候选策略功能从底部侧栏进入右侧 tab。现有 `StrategyCandidateList` 继续复用。

它与归档分析保持连接：

- 已结算样本仍参与候选策略归纳
- 归档记录可用于分析和总结
- 第一版不把归档总结自动写回候选策略

## 4. 数据模型

### 4.1 TraderRecord

新增字段：

```prisma
status String @default("not_started")
archiveSummary String?
```

保留字段：

```prisma
archivedAt DateTime?
```

兼容规则：

- 新记录默认 `not_started`
- 旧数据中 `archivedAt != null` 的记录回填为 `archived`
- 旧数据中存在已结算样本，或存在 `good / neutral / bad` outcome 的记录回填为 `ended`
- 旧数据中存在 `pending` outcome 且没有已完成 outcome 的记录回填为 `in_progress`
- 其它旧记录回填为 `not_started`
- 执行归档动作时同时设置 `status = archived` 和 `archivedAt = now`

迁移采用一次性 backfill。序列化层仍保留兜底：若数据库行暂未写入 `status`，则按同一规则推导展示值，避免云端旧库短时间不一致。

### 4.2 前端类型

新增：

```ts
export type ResearchDeskRecordStatus =
  | "not_started"
  | "in_progress"
  | "ended"
  | "archived";
```

`ResearchDeskRecord` 增加：

```ts
status: ResearchDeskRecordStatus;
archivedAt: string | null;
completion: ResearchDeskRecordCompletion;
archiveSummary: string | null;
```

`completion` 是序列化或前端 helper 推导值，包含：

```ts
{
  missingBasics: string[];
  missingPlans: string[];
  missingReview: string[];
  score: number;
}
```

`archiveSummary` 是归档总结的唯一 canonical 字段。`notes` 继续表示原始记录备注，不承接归档总结，避免记录备注和复盘总结混用。

## 5. API 设计

### 5.1 记录列表

扩展 `GET /api/trader-records`：

- 默认返回非归档记录
- 支持 `status=archived`
- 支持 `status=all`
- 支持 `status=not_started | in_progress | ended`
- 支持 `symbol`
- 支持 `traderId`

列表查询必须兼容 mixed legacy rows：

- 默认查询：返回 `archivedAt IS NULL` 且 `status != archived` 的记录；若 `status` 缺失，按 `archivedAt IS NULL` 纳入非归档列表
- `status=archived`：返回 `status = archived OR archivedAt IS NOT NULL`
- `status=all`：不加归档过滤
- `status=not_started | in_progress | ended`：返回显式状态命中的记录，并在 `status` 缺失时按 backfill 推导规则纳入对应集合

这样迁移窗口内不会出现“归档分析能看到、记录列表看不到”的不一致。

### 5.2 状态动作

扩展 `PATCH /api/trader-records/[recordId]`：

```json
{ "action": "set-status", "status": "in_progress" }
```

`set-status` 只接受 `not_started | in_progress | ended`。`archived` 不通过 `set-status` 写入。

归档继续支持：

```json
{ "action": "archive" }
```

归档动作等价于：

- `status = archived`
- `archivedAt = now`

`archive` 是唯一归档入口。它只允许从 `ended` 进入 `archived`；对已归档记录重复调用是 idempotent no-op，返回当前记录且不改写原 `archivedAt`。

状态更新失败时返回明确错误：

- 记录不存在：`404`
- 状态非法：`400`
- 非法状态跃迁：`409`
- 已归档记录执行非归档状态更新：`409`
- 未结束记录执行归档：`409`

### 5.3 归档总结

第一版提供明确的归档总结更新能力：

```json
{ "action": "update-archive-summary", "archiveSummary": "..." }
```

该动作只更新 `archiveSummary`。`notes` 不参与归档总结读写。

`update-archive-summary` 只允许作用于 `status = archived` 或 `archivedAt != null` 的记录。非归档记录调用该动作返回 `409`。

### 5.4 归档分析查询

新增 `GET /api/research-desk/archive`。

请求参数：

- `symbol`：可选，默认沿用当前选择
- `timeframe`：可选，默认沿用当前选择
- `recordId`：可选，指定选中归档记录
- `traderId`：可选，过滤交易员
- `reviewTag`：可选，过滤 review tag
- `q`：可选，服务端搜索关键字

搜索规则：

- `q` 为空时不启用搜索
- `q` 非空时在 `trader.name`、`rawContent`、`notes`、`archiveSummary` 中做不区分大小写的包含匹配
- 搜索结果会影响 `records`、`selectedRecordId` fallback、`summary`、`archiveStats` 和 `chart.outcomes`
- `recordId` 命中但不满足搜索条件时，按 fallback 规则重新选中记录

selection 解析优先级：

1. 若 `recordId` 命中已归档记录且通过筛选条件，选中该记录，并用该记录的 `symbol` 与 `timeframe` 覆盖响应 `selection`
2. 若 `recordId` 缺失、无效或被筛选排除，选中筛选结果中最新归档记录，并用该记录覆盖响应 `selection`
3. 若没有任何归档记录，响应 `selectedRecordId = null`，`selection` 使用请求里的 `symbol/timeframe`，缺失时使用默认选择
4. 记录 `timeframe` 为空时，使用请求 `timeframe`，仍为空时使用默认 `1h`

`recordId` 是选择偏好，不是硬错误。无效或被筛选排除时返回 fallback payload，不返回 `404`。

响应结构：

```ts
type ResearchDeskArchivePayload = {
  selection: ResearchDeskSelection;
  records: ResearchDeskRecord[];
  selectedRecordId: string | null;
  reviewTagOptions: ResearchDeskReviewTagOption[];
  summary: ResearchDeskOutcomeAggregates;
  archiveStats: {
    recordCount: number;
    summarizedCount: number;
    unsummarizedCount: number;
    goodRate: number | null;
    topReviewTags: Array<{ label: string; count: number }>;
  };
  chart: {
    candles: ResearchDeskCandle[];
    outcomes: ResearchDeskOutcome[];
  };
};
```

查询规则：

- `records` 只包含 `status = archived` 或 `archivedAt != null` 的记录，并应用 `traderId/reviewTag/q` 过滤
- `chart.outcomes` 包含筛选后归档记录自身或其 execution plan 关联的 outcome，并进一步限定为最终响应 `selection.symbol/timeframe`
- `summary` 和 `reviewTagOptions` 基于 `chart.outcomes` 计算
- `archiveStats.summarizedCount` 基于 `archiveSummary` 非空计算
- `candles` 复用现有行情加载逻辑，按最终响应 `selection.symbol/timeframe` 加载
- 没有归档记录时返回空数组和空聚合，不返回错误

## 6. 交互流

### 6.1 进入首页

系统默认：

- 打开 `运行中` tab
- 优先选中最近一条 `in_progress` 记录
- 没有进行中记录时选中最近一条 `not_started`
- 仍然没有时选中最近一条 `ended`
- 左侧下拉同步显示选中记录

### 6.2 新建记录

新建记录后：

- 状态为 `not_started`
- 自动选中新记录
- 停留在当前 tab；如果当前 tab 是 `归档分析`，切回 `运行中`
- 左侧补齐提示显示缺失项
- 右侧详情同步显示新记录

### 6.3 切换记录

用户可以从顶部下拉切换记录。切换后：

- `selectedRecordId` 更新
- 如果记录有匹配 outcome，选中匹配 outcome
- 详情区和图表同步
- 当前 tab 不变

### 6.4 状态推进

状态动作只出现在记录详情和公共栏摘要中：

- `尚未开始` 显示 `开始`
- `进行中` 显示 `结束`
- `已结束` 显示 `归档`
- `已归档` 显示归档时间和总结入口

合法状态跃迁：

| 当前状态 | 允许动作 | 下一状态 |
| --- | --- | --- |
| `not_started` | `开始` | `in_progress` |
| `in_progress` | `结束` | `ended` |
| `ended` | `归档` | `archived` |
| `archived` | 重复 `archive` | `archived` |

同状态更新视为 no-op。其它跨级更新返回 `409`。`set-status` 不能写入 `archived`，归档必须走 `archive` action。

状态动作不改写 `startedAt` 和 `endedAt`。这两个字段表示记录锚定的行情观察区间，不表示工作台生命周期时间。第一版只更新 `status`、`updatedAt`，归档动作额外更新 `archivedAt`。

### 6.5 归档分析

进入归档 tab 后：

- 记录下拉切换为归档集合
- 默认选中最近归档记录
- TradingView 参考视图切换到选中记录资产和周期
- 展示该记录 outcome/tag/archiveSummary
- 归档统计和图表 outcome 来自 `GET /api/research-desk/archive`
- 搜索、交易员、标签过滤都通过服务端查询刷新归档 payload

## 7. 错误与边界

- 状态更新失败时保留当前 UI 状态，并展示错误提示
- 非法状态跃迁返回 `409`，前端展示“请按 尚未开始 → 进行中 → 已结束 → 已归档 推进”
- 非归档记录写入 `archiveSummary` 返回 `409`
- 归档后若当前 tab 不是归档 tab，从未归档列表中移除该记录
- 归档后若用户切到归档 tab，该记录出现在归档列表顶部
- 没有归档记录时，归档 tab 展示空状态和“先归档已结束记录”的行动建议
- TradingView 加载失败时显示失败提示，归档分析其它内容继续可用

## 8. UI/UX 规则

采用 `ui-ux-pro-max` 推荐的 fintech dashboard 方向：

- 风格：Minimalism & Swiss Style
- 信息密度：高密度但分组清晰
- 视觉中心：首屏运行中记录，而非说明性 hero
- 图标：使用 lucide-react
- 交互目标：按钮和下拉触发区不小于 44px 高度
- 可访问性：tab、下拉、状态按钮支持键盘导航和清晰 focus
- 图表：TradingView 参考视图提供文本摘要和统计卡作为可访问补充

## 9. 测试计划

### 9.1 单元测试

- 记录状态格式化与状态动作 helper
- 补齐推导 helper
- 记录选择优先级 helper
- 归档记录过滤 helper

### 9.2 组件测试

- 首页默认展示运行中 tab
- 左侧新建记录按钮首屏存在
- 顶部记录下拉可以切换记录
- tab 切到归档分析后，记录下拉切换到归档集合
- 从归档分析切回运行中后，记录下拉恢复非归档集合和原选中记录
- 状态动作可以更新记录状态
- 归档动作把记录移入归档 tab
- 归档 tab 展示 TradingView 参考视图
- 无进行中记录时展示尚未开始记录和新建入口
- 无归档记录时展示归档空状态
- 归档总结读写使用 `archiveSummary`，不污染 `notes`

### 9.3 集成测试

- `GET /api/trader-records?status=archived`
- `GET /api/trader-records` mixed legacy rows：`archivedAt != null` 必须进入归档集合，`archivedAt == null` 必须进入非归档集合
- `GET /api/research-desk/archive`
- `GET /api/research-desk/archive?q=...` 搜索影响记录列表、fallback 选中、聚合和 chart outcomes
- `GET /api/research-desk/archive?recordId=...` 命中归档记录时用该记录覆盖响应 selection
- `GET /api/research-desk/archive?recordId=invalid` 返回 fallback payload
- `PATCH /api/trader-records/[recordId]` set-status
- 非法状态跃迁返回 `409`
- archive 动作同时更新 `status` 和 `archivedAt`
- 重复 archive 不改写原 `archivedAt`
- update-archive-summary 只更新 `archiveSummary`
- 非归档记录 update-archive-summary 返回 `409`
- 旧数据兼容：只有 `archivedAt` 也能序列化成正确状态
- 旧数据 backfill：已结算或已有完成 outcome 的记录回填为 `ended`

### 9.4 浏览器验证

- 桌面宽度：左侧公共栏固定，右侧 tab 内容完整
- 移动宽度：公共栏折叠到顶部，tab 可切换，按钮不溢出
- 归档 tab：TradingView 容器非空，统计和总结区域不遮挡
- 键盘导航：tab、记录下拉、状态动作顺序与视觉顺序一致
- 错误状态：状态更新失败和 TradingView 加载失败都有明确恢复提示

## 10. 第一版范围

包含：

- 首页布局重组
- 顶部记录下拉选择
- 手动记录状态
- 补齐提示
- 归档分析 tab
- 归档记录 API
- 归档分析 API
- `archiveSummary` 归档总结字段
- TradingView 参考视图复用

不包含：

- AI 自动总结
- 批量总结落库
- 独立 `/archive` 路由
- TradingView 可视时间区间强制控制
- 多用户权限

## 11. 交付顺序建议

1. 数据模型、序列化和 API 状态能力
2. 记录状态 helper 与补齐 helper
3. 归档分析查询 contract
4. 首页 workspace shell 与左侧公共栏
5. 运行中、全部记录、候选策略 tab
6. 归档分析 tab
7. 组件测试、API 测试、浏览器验证
