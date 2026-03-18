# AI Academic Tutor 平台技术规格文档 v2
**版本**：v2.0  
**状态**：基于现有项目架构的优化稿  
**适用对象**：产品负责人、前端工程师、后端工程师、AI 工程师、数据库工程师、UI/UX 设计师  
**当前基础技术栈**：React 19 + TypeScript + Vite + Tailwind CSS + Supabase + Edge Functions + DeepSeek / 智谱 AI + Recharts + EdgeOne Pages

---

## 0. 文档目标

本文档不是从零重建架构，而是在你当前已有项目基础上进行**结构性升级**。  
升级目标不是单纯增加功能，而是让平台真正支撑以下研究与产品目标：

1. 支撑 **学生—AI—导师** 三元互动，而不是普通 student–AI 二元聊天。
2. 让 AI 从“回答工具”升级为 **可编排的学术支持系统**。
3. 让导师从“事后查看聊天记录”升级为 **可见、可介入、可追踪、可治理** 的在环角色。
4. 让系统从“聊天产品”升级为 **科研进展支持与监督基础设施**。
5. 让未来关于 **epistemic agency、critical thinking、epistemic authority、AI 对导师权威的挑战** 等研究问题可以被真实采集、分析和验证。

---

# 1. 当前架构的优点与主要不足

## 1.1 当前架构的优点

你现有项目已经具备一个可运行平台的基本骨架：

- 前端与后端解耦明确
- 使用 Supabase 统一 Auth、PostgreSQL、Edge Functions，工程复杂度相对可控
- 支持多角色（student / supervisor / pending_supervisor / admin）
- 已经存在班级、对话、消息、AI 偏好等核心模块
- 通过 Edge Functions 代理 AI 请求，避免前端暴露 API Key
- 技术选型偏现代，适合快速迭代

这些都是可保留的。

## 1.2 当前架构的关键不足

但如果要支撑你的研究目标，当前架构仍然偏向“AI 学术聊天应用”，还没有真正变成“科研监督与三元协同系统”。主要不足如下：

### (1) 数据模型过于聊天导向，缺少“研究过程”实体
当前核心表主要是：
- profiles
- conversations
- messages
- ai_settings
- classes
- class_members

这套结构足以做聊天系统，但不足以表达：

- 学生当前研究主题是什么
- 处于哪个研究阶段
- 最近进展是什么
- 卡点是什么
- 导师上次反馈是什么
- AI 是否识别出风险
- AI 与导师是否存在观点冲突
- 某次干预之后学生状态是否改善

也就是说，**你缺少 research process layer**。

### (2) AI 只有“模型调用”层，没有“Agent 编排”层
你目前的 AI 集成主要是：
- 模型切换
- 流式对话
- 系统提示词

这还只是 LLM API 接入，不是多 Agent 系统。  
如果你的研究要讨论：
- 苏格拉底式引导
- 证据支持
- 风险识别
- 对导师观点的证据化质疑
- 导师在环协同

就必须把 AI 拆成可治理的功能代理层。

### (3) 教师端仍然偏“查看”而非“介入”
如果教师端只是能看到学生对话记录，那么这只是监控界面。  
你的目标要求教师端具备：

- 风险发现
- 重点会话提取
- 学生进展摘要
- 导师直接介入
- 导师反馈与 AI 后续行为联动
- AI 对导师干预的解释性吸收

当前架构尚未显式支持这一层。

### (4) 缺少证据层与可追溯层
你希望 AI 可以在必要时质疑导师或学生，但必须有依据。  
这意味着系统不能只有普通 messages，还要有：

- evidence records
- retrieval logs
- citation blocks
- confidence / evidence level
- model reasoning metadata（不保存敏感链路推理，但保存依据摘要与来源）

否则“AI 可质疑导师”在系统层无法成立。

### (5) 缺少研究分析与审计层
你的目标不仅是做产品，还要做研究。  
因此系统必须补充：

- interaction event logs
- intervention logs
- authority shift markers
- consent and data access controls
- structured analytics tables

否则后续无法分析：
- 学生更信任 AI 还是导师
- 导师权威何时被挑战
- AI 干预后 epistemic agency 是否变化
- 哪些机制促进批判性思维

---

# 2. 优化后的总体架构

## 2.1 推荐总体架构图

```text
┌────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                        │
├────────────────────────────────────────────────────────────────┤
│ Landing │ Auth │ Student │ Supervisor │ Admin │ Shared UI Kit  │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                    Supabase Application Layer                  │
├────────────────────────────────────────────────────────────────┤
│ Auth │ PostgreSQL │ Storage │ Realtime │ Edge Functions │ RLS │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                  AI Orchestration / Agent Layer                │
├────────────────────────────────────────────────────────────────┤
│ Dialogue Agent │ Socratic Agent │ Retrieval Agent             │
│ Progress Agent │ Authority Agent │ Supervisor Mediation Agent │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                   External Knowledge / AI Layer               │
├────────────────────────────────────────────────────────────────┤
│ DeepSeek │ GLM-4 │ Academic Search APIs │ RAG Index / KB       │
└────────────────────────────────────────────────────────────────┘
```

## 2.2 架构设计原则

### 原则 1：聊天只是界面，不是系统本体
聊天界面只是承载交互的 UI，真正重要的是：
- 研究进程状态
- 证据调用
- 风险识别
- 导师介入
- 权威冲突处理

### 原则 2：模型调用必须通过 Agent 层治理
不要让前端直接“选一个模型然后聊天”。  
前端只表达用户意图，后端 Agent 层决定：
- 是否需要苏格拉底式追问
- 是否需要检索文献
- 是否需要生成研究进展摘要
- 是否需要给导师打标签提醒
- 是否允许对导师观点提出证据化异议

### 原则 3：研究过程必须结构化落库
不仅保存 message text，还要保存：
- research stage
- unresolved issue
- intervention type
- evidence use
- authority event
- risk score

### 原则 4：所有敏感行为都要审计
尤其是：
- 导师查看学生对话
- 管理员授权访问
- AI 发起证据性异议
- 数据导出
- consent 审批

---

# 3. 角色体系与权限优化

## 3.1 角色定义

保留现有角色，并建议补充更细粒度权限：

- `student`
- `supervisor`
- `pending_supervisor`
- `admin`

建议新增逻辑权限层，而不是新增过多数据库角色：

- `can_view_student_conversations`
- `can_intervene_in_conversation`
- `can_manage_class`
- `can_review_consent`
- `can_configure_ai_models`
- `can_export_research_data`

## 3.2 角色行为矩阵

| 功能 | 学生 | 导师 | 管理员 |
|---|---|---:|---:|
| 与 AI 聊天 | 是 | 是 | 可测试 |
| 上传文档 | 是 | 是 | 否 |
| 查看个人研究进展 | 是 | 否 | 可审计 |
| 查看学生研究概览 | 否 | 是 | 是 |
| 介入学生会话 | 否 | 是 | 否 |
| 查看班级学生列表 | 限自己班级 | 是 | 是 |
| 审批教师注册 | 否 | 否 | 是 |
| 审批数据授权 | 否 | 否 | 是 |
| 配置模型与 API | 否 | 否 | 是 |
| 导出研究分析数据 | 受限 | 受限 | 是 |

## 3.3 建议的权限策略

使用 Supabase RLS：

- 学生只能读取：
  - 自己的 conversations / messages / research_progress / uploaded_docs
- 导师只能读取：
  - 自己所管理班级学生的数据
  - 且仅在 consent 被授予或机构默认协议允许的情况下
- 管理员：
  - 可管理配置和审计
  - 不默认阅读全部聊天正文，避免越权；若需查看，必须走审计日志

---

# 4. 前端优化设计

## 4.1 前端整体信息架构

```text
/src
  /app
    /landing
    /auth
    /student
    /supervisor
    /admin
  /components
    /layout
    /chat
    /dashboard
    /cards
    /forms
    /charts
    /quotes
    /agent
  /features
    /conversation
    /progress
    /evidence
    /authority
    /classes
    /documents
    /analytics
  /services
    /supabase
    /api
    /ai
  /hooks
  /types
  /utils
```

## 4.2 建议新增的核心前端模块

### 学生端
- Research Workspace
- AI Chat Studio
- Progress Timeline
- Evidence Panel
- Reflection Journal
- Supervisor Feedback Inbox

### 导师端
- Supervisor Overview Dashboard
- Student Risk Board
- Research Progress Review
- Intervention Console
- Conversation Insight View
- Authority Tension Alerts

### 管理员端
- User Governance
- Consent & Data Access Panel
- Model / API Configuration
- Audit Center
- Institutional Settings

---

# 5. 首页（Landing Page）设计优化

## 5.1 首页目标

首页不是普通 AI 工具页。  
首页必须明确表达：

1. 这是一个 **学生—AI—导师三元协同** 的科研支持平台。
2. 这不是论文代写工具，而是 **持续可见的科研监督基础设施**。
3. AI 的角色不是替代导师，而是：
   - 促进学生思考
   - 支持导师发现问题
   - 在证据支持下辅助学术讨论
4. 平台的研究价值包括：
   - epistemic agency
   - critical thinking
   - authority calibration
   - supervisor-visible intervention

## 5.2 首页结构建议

1. 顶部导航
2. Hero 首屏
3. 问题定义区
4. 三元互动机制区
5. 导师可视化与介入区
6. AI 证据支持与学术搜索区
7. 研究问题与理论意义区
8. 多角色协同区
9. 使用场景区
10. CTA 区
11. 页脚

## 5.3 首页 Hero 区建议

### 左侧内容
- 主标题
- 副标题
- 两个 CTA
- 一段核心价值说明

### 右侧内容
不是普通插画，建议展示：
- 学生–AI–导师三栏联动界面
- 一条研究进展时间线
- 一个导师风险面板
- AI 输出中的 evidence block

### 推荐主标题
**Make Research Progress Visible, Dialogic, and Actionable**

或中文：
**让科研进展可见、可对话、可干预**

### 推荐副标题
**一个面向学生、AI 与导师三元协同的科研支持平台，通过苏格拉底式引导、证据增强检索、研究进展分析与导师介入机制，支持持续性的学术监督与思维发展。**

## 5.4 首页“权威引文区”设计

你提到要融合论文原文且要引用。  
建议不要放长段落，而是在首页中设计 **Scholar Quote Blocks**，每条控制在 15–30 个词以内，并在页脚或旁边给出处。

### 展示方式
- 卡片式短引文
- 横向滚动条
- 折叠引用面板
- 鼠标 hover 显示出处

### 推荐放置位置
- 首页中段“理论意义区”
- 登录页右侧滚动区
- Hero 下方信任条

### 设计原则
- 只放短引文，不堆长文
- 必须带作者与年份
- 不要做成纯装饰，要服务于产品定位

---

# 6. 登录页设计优化

## 6.1 登录页布局

推荐双栏布局：

### 左栏：登录表单区
- Logo
- 平台名称
- 登录 / 注册切换
- 邮箱 / 密码
- OAuth（如后续支持）
- 忘记密码
- pending_supervisor 申请入口
- 角色说明入口
- Consent / 隐私政策 / 研究伦理链接

### 右栏：动态价值呈现区
不要放普通科技插画。建议放：

1. 滚动学术引文
2. 三元互动简图
3. 导师面板缩略图
4. 学生–AI 对话示意
5. “Why this platform matters” 轮播卡片

## 6.2 登录页右侧推荐内容结构

### 模块 A：滚动引文
展示与以下主题相关的权威短引文：
- epistemic agency
- critical trust
- AI as epistemic authority
- dialogic supervision
- invisible tutor / hidden authority
- human-in-the-loop learning

### 模块 B：平台价值卡片
- For Students: support without outsourcing thought
- For Supervisors: visibility without constant micromanagement
- For Institutions: governance, consent, and accountability

### 模块 C：动态产品预览
- 学生提问 → AI 追问 → 导师介入 → 证据支持

---

# 7. 学生端详细设计

## 7.1 学生首页 Dashboard

建议包含：

### 顶部概览
- 当前研究主题
- 当前研究阶段
- 本周进展
- 最近一次导师反馈
- AI 检测的主要卡点
- 今日建议行动

### 中部模块
- Progress Timeline
- Conversation Heatmap
- Unresolved Issues
- Evidence Usage Summary
- Reflection Notes

### 底部模块
- Recent Conversations
- Pending Supervisor Responses
- Next Recommended Actions

## 7.2 学生 AI 聊天界面（重点）

### 页面布局
建议三栏式：

#### 左栏：对话目录 / 会话管理
- 会话列表
- 按主题分类
- 按研究阶段分类
- 标记重要会话
- 搜索会话
- 新建会话

#### 中栏：聊天主区域
- 用户消息
- AI 消息
- 导师消息
- system annotations
- 流式输出
- 证据块
- 可折叠 reasoning summary（非内部链路推理，显示摘要层）

#### 右栏：辅助工作区
- 当前研究阶段
- 本次会话关键词
- 检索到的论文
- 引文片段
- 任务与待办
- 风险提示
- 导师反馈入口

## 7.3 聊天界面必须支持的功能

### 基础功能
- 多模型切换
- 流式响应
- Markdown / 引文渲染
- 文件上传
- 消息编辑
- 重新生成
- 复制 / 导出摘要

### 学术增强功能
- 论文搜索触发
- 引文插入
- 文献证据卡片
- 研究问题拆解
- 方法比较器
- 理论框架映射
- 论文结构建议
- 反思提示

### 三元互动功能
- 请求导师介入
- 查看导师批注
- 导师消息高亮
- AI 对导师意见的回应
- “证据支持的不同观点” 模块

### 研究日志功能
- 将对话片段保存为 research note
- 将会话结论转成任务
- 将关键障碍加入 unresolved issue

## 7.4 AI 输出消息结构建议

每条 AI 消息可以分成以下区块：

1. **Main Response**  
2. **Clarifying Questions**  
3. **Evidence / Sources**  
4. **Alternative Interpretation**  
5. **Suggested Next Action**  
6. **Supervisor Attention Needed?**  

不是每条消息都必须全部展示，但结构上应支持。

---

# 8. 教师端详细设计

## 8.1 教师 Dashboard 结构

### 顶部统计
- 班级总人数
- 活跃学生数
- 高风险学生数
- 本周需介入会话数
- 待回复学生数

### 核心面板
- Student Risk Board
- Progress Distribution
- Recent Intervention Queue
- Authority Tension Alerts
- AI Escalation Events

## 8.2 学生监控维度

教师端不应只显示“聊天数量”，要显示：

- 当前研究阶段
- 最近进展更新
- 未解决问题数
- 连续停滞天数
- 导师未回应时长
- AI 介入频率
- 证据使用情况
- AI / 导师意见分歧事件

## 8.3 教师介入界面

当导师点进某个学生时，应看到：

1. 学生研究概况
2. 最近关键对话摘要
3. AI 识别的障碍
4. AI 给出的建议
5. 检索证据摘要
6. 导师直接回复入口
7. 导师可将问题标记为：
   - 已解决
   - 需继续观察
   - 需线下讨论
   - AI 不应继续处理

## 8.4 教师与 AI 协同模式

建议支持三种模式：

- **Observe Mode**：导师只看不发言
- **Intervene Mode**：导师直接加入会话
- **Steer AI Mode**：导师对 AI 下达约束，例如：
  - 继续追问，不要给直接答案
  - 优先比较方法而不是建议结论
  - 不要再推荐某理论路径
  - 提醒学生补读核心文献

---

# 9. 管理员端详细设计

## 9.1 管理员模块

- 用户管理
- 教师审核
- 班级治理
- 数据授权审批
- 模型配置
- API 配置
- 审计日志
- 机构设置

## 9.2 管理员必须看到的不是聊天正文，而是治理信息

管理员默认应看到：
- 用户数
- 审核请求
- consent requests
- AI 模型调用量
- 错误率
- Edge Function 状态
- 检索接口状态
- 数据导出记录
- 可疑访问行为

聊天正文应仅在审计原因充分时可访问，并记录日志。

---

# 10. 多 Agent 架构设计

## 10.1 建议的 Agent 列表

### 1. Dialogue Orchestrator Agent
负责：
- 路由用户请求
- 判断调用哪个子 Agent
- 管理消息上下文
- 协调导师介入逻辑

### 2. Socratic Guidance Agent
负责：
- 问题澄清
- 追问假设
- 提示比较
- 促进反思
- 避免直接替学生下结论

### 3. Retrieval & Evidence Agent
负责：
- 调用学术搜索 API
- 检索相关论文
- 生成证据摘要
- 输出来源、证据等级、适用范围

### 4. Progress & Risk Agent
负责：
- 识别长期停滞
- 判断问题是否失焦
- 检测反复困惑
- 标记需要导师介入的情况

### 5. Authority Calibration Agent
负责：
- 判断学生当前更依赖 AI 还是更依赖导师
- 记录 authority-related events
- 识别 AI 与导师观点的紧张状态

### 6. Supervisor Mediation Agent
负责：
- 为导师生成摘要
- 建议导师何时介入
- 将导师意见转译为 AI 可执行约束

## 10.2 Agent 调用流程

```text
User Message
   ↓
Dialogue Orchestrator
   ├─ 需要追问 → Socratic Agent
   ├─ 需要证据 → Retrieval Agent
   ├─ 需要风险检测 → Progress Agent
   ├─ 涉及权威冲突 → Authority Agent
   └─ 需要导师摘要 → Supervisor Mediation Agent
```

---

# 11. 后端与 Edge Functions 优化

## 11.1 Edge Functions 建议拆分

不要把所有 AI 调用塞进一个函数。建议至少拆成：

- `chat-orchestrator`
- `retrieve-academic-sources`
- `generate-progress-summary`
- `detect-risk-events`
- `authority-analysis`
- `supervisor-briefing`
- `upload-document-parse`
- `consent-review-hook`

## 11.2 后端处理原则

- 所有 AI key 只存服务端
- 所有 retrieval 请求都通过服务端代理
- 所有重要事件写入 event_log
- 导师介入和 AI 异议必须审计
- 可配置模型 fallback

## 11.3 实时能力

利用 Supabase Realtime 支持：

- 导师新消息实时推送
- AI 流式回复
- 会话状态更新
- 风险标记刷新
- 班级通知

---

# 12. 数据库设计（v2 推荐）

## 12.1 保留现有表

- `profiles`
- `conversations`
- `messages`
- `ai_settings`
- `classes`
- `class_members`

## 12.2 新增核心表

### 1. `research_projects`
表示学生的研究项目主实体。

字段建议：
- id
- student_id
- title
- description
- domain
- stage
- status
- supervisor_id
- created_at
- updated_at

### 2. `research_progress_logs`
记录学生研究推进。

字段建议：
- id
- project_id
- student_id
- progress_type
- summary
- stage_before
- stage_after
- source_conversation_id
- created_at

### 3. `unresolved_issues`
记录未解决障碍。

字段建议：
- id
- project_id
- student_id
- category
- description
- severity
- status
- detected_by (`student` / `ai` / `supervisor`)
- linked_message_id
- created_at
- resolved_at

### 4. `supervisor_interventions`
记录导师介入。

字段建议：
- id
- conversation_id
- project_id
- supervisor_id
- student_id
- intervention_type
- message_id
- summary
- action_required
- created_at

### 5. `evidence_records`
记录 AI 检索与证据块。

字段建议：
- id
- conversation_id
- message_id
- source_title
- source_authors
- source_year
- source_url
- evidence_excerpt
- evidence_level
- relevance_score
- created_at

### 6. `authority_events`
记录 authority-related 事件。

字段建议：
- id
- project_id
- conversation_id
- message_id
- event_type
- actor_focus (`ai` / `supervisor` / `student`)
- description
- evidence_basis
- severity
- created_at

### 7. `risk_alerts`
记录风险提醒。

字段建议：
- id
- project_id
- student_id
- conversation_id
- risk_type
- risk_score
- alert_summary
- assigned_supervisor_id
- status
- created_at

### 8. `uploaded_documents`
文档元数据。

字段建议：
- id
- owner_id
- project_id
- file_name
- file_type
- storage_path
- parse_status
- extracted_text_preview
- created_at

### 9. `consent_requests`
你已有概念，建议落表。

字段建议：
- id
- student_id
- supervisor_id
- scope
- status
- approved_by
- created_at
- reviewed_at

### 10. `event_logs`
统一审计。

字段建议：
- id
- actor_id
- actor_role
- event_name
- target_type
- target_id
- metadata_json
- created_at

## 12.3 表关系概览

```text
profiles
  ├─ research_projects
  │    ├─ research_progress_logs
  │    ├─ unresolved_issues
  │    ├─ risk_alerts
  │    └─ authority_events
  ├─ conversations
  │    └─ messages
  │         ├─ evidence_records
  │         └─ supervisor_interventions
  └─ uploaded_documents
```

---

# 13. AI 聊天界面的“丰富多功能”具体方案

## 13.1 消息类型

建议将 messages 表中的 `message_type` 扩展为：

- `user`
- `ai`
- `supervisor`
- `system`
- `evidence`
- `summary`
- `warning`
- `task`
- `reflection_prompt`

## 13.2 聊天输入区功能

输入区不应只是文本框。建议支持：

- 文本输入
- 文件上传
- 研究阶段标签选择
- “需要导师介入”按钮
- “请检索相关论文”快捷按钮
- “请比较两种方法”快捷按钮
- “请用苏格拉底方式引导我”快捷按钮
- “请仅基于证据回应”模式开关

## 13.3 右侧上下文面板

右侧建议支持 Tab：

- Context
- Sources
- Progress
- Issues
- Supervisor Notes
- Tasks

## 13.4 对导师意见的 AI 响应机制

当导师发言后，AI 可以有三种合法反应：

1. **Support**  
   说明导师建议与当前证据一致

2. **Extend**  
   补充导师建议未涉及的文献或方法维度

3. **Evidence-Constrained Challenge**  
   在明确给出依据时提出不同解释

绝不允许：
- 无依据否定导师
- 语气上挑战导师权威身份
- 把推断包装成事实

---

# 14. “AI 可质疑导师”治理机制

## 14.1 允许条件

仅当满足以下条件时，AI 可提出证据性异议：

- 有明确检索来源
- 来源可信度达到阈值
- 异议对象是论点或方法，不是导师身份
- 输出包含证据等级与适用范围
- 输出语气为“可能存在另一种解释”而不是“导师错了”

## 14.2 UI 呈现方式

当 AI 对导师建议给出不同看法时，显示为：

**Alternative evidence-informed perspective**  
并附：
- 来源
- 摘要
- 证据等级
- 适用边界
- 建议是否需导师复核

## 14.3 数据落库

这类事件必须写入：
- `authority_events`
- `evidence_records`
- `event_logs`

---

# 15. Academic Search / RAG 集成建议

## 15.1 你的现阶段不应写成“训练大量论文”
工程上更合理的是：

- 学术搜索 API 检索
- 结构化论文元数据缓存
- 本地向量索引 / 文本索引
- 可追溯证据块生成
- 面向会话上下文的 retrieval augmentation

## 15.2 检索层结构

建议分成两层：

### Layer 1: Online Retrieval
调用：
- Crossref
- Semantic Scholar
- OpenAlex
- arXiv（如适用）
- PubMed（特定学科）
- 其他付费数据库接口（如后续接入）

### Layer 2: Local Evidence Cache
把：
- title
- abstract
- authors
- year
- DOI
- source url
- snippet
缓存到本地表或索引层

## 15.3 检索输出结构

每条证据卡应显示：

- Title
- Authors
- Year
- Why relevant
- Excerpt
- Evidence level
- Citation action

---

# 16. 部署与工程策略

## 16.1 现有部署保留

- 前端：EdgeOne Pages
- 后端：Supabase
- AI：Edge Functions

保留即可。

## 16.2 环境分离

至少分：
- dev
- staging
- production

## 16.3 配置管理

环境变量建议拆分：
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SERVICE_ROLE_KEY
- DEEPSEEK_API_KEY
- ZHIPU_API_KEY
- ACADEMIC_SEARCH_API_KEYS
- FEATURE_FLAGS
- RAG_INDEX_CONFIG

---

# 17. 推荐的开发优先级（MVP → v2）

## Phase 1：现有系统增强版 MVP
目标：从“聊天应用”升级为“导师可见的三元互动平台”

必须完成：
- research_projects
- research_progress_logs
- unresolved_issues
- supervisor_interventions
- 风险提醒面板
- 导师介入功能
- 聊天右侧 evidence / progress 面板

## Phase 2：证据与治理层
- evidence_records
- retrieval agent
- authority_events
- consent_requests
- 审计日志
- alternative evidence-informed perspective UI

## Phase 3：高级分析与研究功能
- authority calibration analytics
- progress prediction
- epistemic agency indicators
- critical thinking rubric integration
- 可导出研究分析数据

---

# 18. 你这个项目在技术文档层最重要的重定位

你现在不应该再把它写成：

- AI 学术聊天平台
- 论文支持工具
- 多模型对话系统

而应该写成：

**一个面向学生—AI—导师三元互动的科研进展支持与监督平台，集成苏格拉底式引导、证据增强检索、研究进展追踪、风险识别与导师介入机制，以支持 epistemic agency、批判性思维与权威校准相关研究。**

这句话应成为你后续所有文档、首页、答辩与论文写作中的总定位。

---

# 19. 下一步最建议你立刻补的东西

如果你准备继续开发，最优先的不是再增加模型，而是补这四样：

1. `research_projects` 与 `research_progress_logs`
2. `supervisor_interventions`
3. `evidence_records`
4. 教师端 risk board + intervention queue

只要这四样补齐，系统就开始从聊天产品转向监督平台。

---

# 20. 附：推荐的主页与登录页文案方向（简版）

## 首页主标题
**让科研进展可见、可对话、可干预**

## 首页副标题
**一个面向学生、AI 与导师三元协同的科研支持平台，通过苏格拉底式引导、证据增强检索、研究进展分析与导师介入机制，支持持续性的学术监督与思维发展。**

## 登录页主文案
**进入一个面向科研过程而非仅面向答案的学术工作空间。**

## 登录页副文案
**在学生、AI 与导师的持续互动中，跟踪研究进展，识别关键问题，并在恰当时机实现有依据的学术介入。**

---

# 21. 总结

你当前的项目架构已经具备一个可运行系统的骨架，但距离你的真实研究目标还差一个关键层级：  
**从“AI 聊天应用”升级为“可治理、可追踪、可研究的三元科研监督系统”。**

本次优化的重点不是重写技术栈，而是补齐以下五层：

- 研究过程层
- Agent 编排层
- 导师介入层
- 证据与权威治理层
- 研究分析与审计层

只要这五层补齐，你的平台才真正开始具备独特性。
