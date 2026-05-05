# 项目开发日志

## 项目定位

项目名：`材料学习转换器`

目标不是做「总结器」，也不是先让用户理解一套复杂课程系统，而是做一个面向论文与深度阅读场景的材料学习转换器：

- 用户输入尽可能少，只需要粘贴文段或上传文件。
- 系统自动解析内容、识别材料类型、检索材料内部结构。
- 用户先看到系统从材料中抽出的论点、证据、概念、问题目标和误解风险。
- 默认产物不是摘要，而是由材料检索结果转换出来的练习路径。
- 课程内部必须包含理解验证，而不是只给讲解。
- 最终形成 `输入材料 -> 检索材料 -> 转成学习路径 -> 学习 -> 测验 -> 复盘 -> 复习计划` 的闭环。

当前首版主要借了两类思路：

- `Learn Your Way`：先重构内容，再生成适合学习的多步骤体验。
- `OATutor`：掌握度追踪、活动编排、学习状态驱动下一步。

但本项目没有直接复用单个开源仓库作为主干，而是自建了一个薄内核。

## 当前代码结构

项目根目录：

- `apps/web`
  Next.js 前端工作台
- `apps/api`
  FastAPI 后端
- `data`
  本地开发用数据目录

当前重要文件：

- [README.md](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/README.md)
  启动方式与项目概述
- [package.json](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/package.json)
  根目录联调脚本
- [apps/web/src/components/workbench.tsx](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/web/src/components/workbench.tsx)
  前端主工作台
- [apps/api/app/main.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/app/main.py)
  后端入口
- [apps/api/app/services/parser.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/app/services/parser.py)
  文档解析
- [apps/api/app/services/analysis.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/app/services/analysis.py)
  学习表示重构
- [apps/api/app/services/blueprint.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/app/services/blueprint.py)
  课程蓝图生成
- [apps/api/app/services/mastery.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/app/services/mastery.py)
  掌握度更新与活动推进

## 这次开发已经完成的内容

### 1. 前端工作台

已经做成一个完整单页工作台，而不是静态 demo。

页面分成 4 个区：

- `Material Input`
- `Material Retrieval`
- `Learning Path`
- `Review / History`

已实现能力：

- 开发模式 `magic link` 登录
- 文段输入
- 文件上传入口
- 材料检索结果展示
- 课程蓝图展示
- 学习区互动
- 复习计划与历史记录展示
- 学习引导文案

### 2. 后端 API

已经实现的接口：

- `POST /api/auth/request-magic-link`
- `POST /api/auth/verify`
- `POST /api/assets`
- `POST /api/assets/:id/analyze`
- `POST /api/assets/:id/course-blueprint`
- `POST /api/course-runs`
- `GET /api/course-runs`
- `GET /api/course-runs/:id`
- `POST /api/course-runs/:id/events`
- `GET /api/review-plans`
- `POST /api/review-plans/:id/complete`

### 3. 解析链路

已支持：

- `PDF`
- `DOCX`
- `TXT`
- `MD`

当前解析策略：

- `PDF`
  优先 `pypdf` 文本层提取
- 如果 PDF 文本过少
  再尝试 `pdftotext`
- 如果还是过少
  再走 `tesseract` OCR
- `DOCX`
  用 `python-docx`
- `TXT / MD`
  直接读文本

统一输出为结构化 `ParsedDocument`，包含：

- `metadata`
- `sections`
- `paragraphs`
- `citations`
- `tables`
- `formulas`
- `language`
- `doc_type_guess`
- `parse_strategy`

### 4. 学习引擎

已实现首版启发式学习闭环：

- 材料类型识别：
  - `paper`
  - `argument_text`
  - `notes_or_textbook`
- 学习模式推荐：
  - `deep_read`
  - `logic_breakdown`
  - `course_learning`
- 学习表示重构：
  - `argument_graph`
  - `concept_map`
  - `question_targets`
  - `misconception_risks`
- 课程蓝图生成：
  - `scene`
  - `explain`
  - `probe`
  - `challenge`
  - `reflect`
- 掌握度状态：
  - `current_mastery`
  - `confidence`
  - `evidence_count`
  - `misconceptions`
- 复习计划：
  - `D+1`
  - `D+3`
  - `D+7`

## 这次开发中做过的重要决策

### 1. 没有直接上 Postgres / Redis / S3

原因：

- 当前目标是先把产品闭环跑通，而不是先堆云基础设施。
- 所以先用：
  - `SQLite`
  - 本地文件目录
  - 同步接口

但是接口和数据模型命名已经按后续切换到正式云架构来设计，没有把逻辑绑死在 demo 方案上。

### 2. 没有直接接真实大模型

原因：

- 先把产品结构和数据流打通。
- 当前课程生成、材料识别、追问题目标，主要是启发式版本。

好处：

- 本地可运行
- 无需 API Key
- 更容易验证产品骨架

坏处：

- 课程质量现在只是「结构正确」，还不是「智能强」

### 3. 先做 Web 主产品，不把小猫做成独立桌宠

原因：

- 用户需求的主路径是学习闭环，不是宠物养成。
- 所以小猫现在是课程引导角色，而不是单独产品。

## 已验证项

本地已经验证通过：

- `uv run --project apps/api pytest`
- `pnpm --dir apps/web lint`
- `pnpm --dir apps/web build`

还做过一次真实 API 烟测，成功完成：

- 请求 magic link
- 登录
- 上传文本材料
- 分析材料
- 生成课程蓝图
- 创建课程 run
- 提交学习事件
- 读取复习计划

烟测结果当时确认到：

- 材料被识别为 `paper`
- 推荐模式为 `deep_read`
- 成功生成 `4` 个章节
- 成功生成 `13` 个活动节点
- 成功生成 `3` 条复习计划

## 当前已知限制

### 1. 课程生成还是启发式版本

当前问题：

- 有产品结构，但还没有真正强的论文理解能力。
- 对复杂论文、数学推导、图表密集文档的理解还不够。

后续应优先接入真实模型 provider，把以下环节升级掉：

- 材料类型识别
- 逻辑拆解
- 关键问题生成
- 误解风险预测
- 课程蓝图生成
- 复盘评价

### 2. 登录仍是开发模式

现在的 `magic link` 是本地开发用预览链接，不发真实邮件。

后续正式化时需要：

- 接邮件服务
- 做 session 安全策略
- 处理生产环境 token 生命周期

### 3. 数据库仍是本地 SQLite

当前可以开发和验证，但不适合多人协作和正式部署。

后续建议迁移到：

- `Postgres`
- `pgvector`
- `Redis`
- `S3-compatible storage`

### 4. 前端还没有真正的多人作品流

目前只有：

- 个人历史课程
- 个人复习计划

还没有：

- 课程库
- 社区作品
- 热门课程
- A/B 开关

## 下一位开发者最应该先做什么

建议优先顺序如下：

### P0：接真实模型能力

先新增一个 `model provider` 抽象层，把启发式逻辑替换成真实模型调用。

优先替换位置：

1. `analysis.py`
2. `blueprint.py`
3. `mastery.py` 里的文本回答评价部分

目标不是生成摘要，而是生成：

- 论证结构
- 关键追问
- 误解点
- 课程节点

### P1：补文件解析质量

重点处理：

- 扫描版 PDF
- 表格
- 图表说明
- 数学公式
- 多语言论文

### P1：把课程播放做深

当前学习节点能跑，但体验还不够像产品。

优先增强：

- 更强的像素场景表现
- challenge 类型扩展
  - 排序题
  - 判断题
  - 配对题
- reflect 节点评价更细

### P2：切正式基础设施

把以下组件替换掉：

- SQLite -> Postgres
- 本地文件 -> S3-compatible
- 同步逻辑 -> worker / queue

### P2：做课程库与社区层

补全像 ahafrog 一样的产品外壳：

- 首页
- 课程库
- 热门课程
- 社区作品
- 用户复用

## 本地运行命令

根目录联调：

```bash
pnpm install
uv sync --project apps/api
pnpm dev
```

单独启动 API：

```bash
uv run --project apps/api uvicorn app.main:app --app-dir apps/api --reload --port 8000
```

单独启动前端：

```bash
pnpm --dir apps/web dev --hostname 127.0.0.1 --port 3000
```

## 补充说明

如果在别的开发站继续开发，优先先读这 3 份文件：

1. [DEVLOG.md](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/DEVLOG.md)
2. [README.md](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/README.md)
3. [workbench.tsx](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/web/src/components/workbench.tsx)

如果只想快速接后端逻辑，直接从这 3 个服务文件开始：

1. [parser.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/app/services/parser.py)
2. [analysis.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/app/services/analysis.py)
3. [blueprint.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/app/services/blueprint.py)

## 2026-05-04 推进记录

### 本轮目标

按 gstack 方法论先把项目从本地原型整理成可持续推进的工程基线：

- 收口版本边界
- 建立验证基线
- 补端到端烟测
- 抽象模型 provider
- 增强学习内核与前端反馈

### 已完成

1. 根目录已初始化为主 Git 边界。
2. 原 `apps/web/.git` 已保留式归档为 `apps/web/.git.archived-for-root-monorepo-2026-05-04`，并通过 `.gitignore` 忽略，避免嵌套 Git 干扰根项目。
3. 修正了 DEVLOG 中指向旧 `/01-项目/...` 的路径。
4. 新增 API 端到端烟测：[test_e2e_flow.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/tests/test_e2e_flow.py)。
5. 新增模型 provider 边界：[model_provider.py](/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台/apps/api/app/services/model_provider.py)。
6. `analysis.py` 保留 heuristic fallback，同时把原文证据句、rubric facets 纳入学习表示。
7. `blueprint.py` 给 probe / reflect 活动写入 rubric，供前端展示和评价使用。
8. `mastery.py` 的自由文本评价从单纯关键词命中升级为关键词 + 理解面向共同评分。
9. 前端工作台展示 rubric、关键词线索、学习状态、最近一步反馈，并补了清除上传文件入口。

### 本轮验证

```bash
uv run --project apps/api pytest
pnpm --dir apps/web lint
pnpm --dir apps/web build
```

结果：

- API：`4 passed`
- Web lint：通过
- Web build：通过

已知警告：

- FastAPI `@app.on_event("startup")` 已被标记为 deprecated，后续可迁移到 lifespan handler。

### 下一阶段

优先接入真实模型 provider，但要保留当前 `heuristic` 作为离线 fallback。真实模型阶段的第一目标不是摘要，而是替换：

- 材料类型识别
- 论证结构拆解
- 关键追问生成
- 误解风险预测
- 课程蓝图生成
- 复盘评价

## 2026-05-04 试用阻塞修复

- 复现：前端临时跑在 `127.0.0.1:3011` 时，后端 `OPTIONS /api/auth/request-magic-link` 返回 `400 Bad Request`，浏览器登录第一步直接失败。
- 根因：后端 CORS 只允许 `3000`；同时 magic link 预览地址硬编码为 `127.0.0.1:3000`，备用端口试用会继续跳错页面。
- 修复：新增 `PIXEL_FRONTEND_BASE_URL`，magic link 预览地址改为配置驱动；CORS 开发模式允许 `localhost / 127.0.0.1` 任意端口。
- 验证：`uv run --project apps/api pytest` 通过 `6 passed`；手工 API 链路完成 `magic link -> verify -> asset -> analyze -> blueprint -> course run -> event -> review plan`，后端日志全程 `200 OK`。

## 2026-05-04 前端试用体验修复

- 复现：用户真实浏览器打开页面后，Next dev overlay 报 `Maximum call stack size exceeded`，调用栈全部来自 `chrome-extension://jfed.../catch-script/search.js`。
- 判断：直接异常源是第三方 Chrome 扩展的 content script，不是项目业务代码；但它会破坏首屏试用感受，必须在本地开发页隔离。
- 修复：在 root layout 增加 `beforeInteractive` 扩展错误过滤器，拦截 `chrome-extension://` 来源的 `error` / `unhandledrejection`，避免第三方扩展异常进入页面错误层。
- 产品化补强：默认填入试用邮箱，新增“一键试用”、四步路径提示、当前下一步、推荐试用顺序、继续学习入口，降低首次使用阻力并强化回访闭环。
- 验证：`uv run --project apps/api pytest`、`pnpm --dir apps/web lint`、`pnpm --dir apps/web build` 通过；开发页 HTML 已包含 `extension-error-filter` 和“一键试用”入口。

## 2026-05-05 产品理解入口修复

- 复现：用户反馈“没用懂这款产品”，说明首屏仍在讲抽象能力，没有把用户任务说清楚。
- 调整：把产品定义改成“把难读材料变成可以跟着做的学习练习”；首屏改为三步承诺：放入难读材料、得到练习路径、按自己的节奏检查理解。
- 调整：把首次入口改为“打开示例课”，把指定邮箱折叠到次级区域；输入区主按钮改为“把这段材料变成练习课”，并明确论文、报告、笔记分别会被怎样处理。
- 调整：继续移除“逼你理解”等冒犯性表达，把产品语气改为用户可控、按自己的节奏检查理解。
- 验证：`pnpm --dir apps/web lint`、`pnpm --dir apps/web build` 通过；开发页 HTML 已包含新的首屏解释和 CTA 文案。

## 2026-05-05 留存漏斗基础层

- 目标审计：App Store 前十不是一个代码开关，当前只能先补可验证的产品基础层。已完成 UI 清晰度、manifest 和基础图标；仍缺原生分发、真实模型质量、商店资产、隐私审核包和生产级留存数据。
- 本轮选择：优先补“用户是否真的走完学习闭环”的基础漏斗，因为它直接影响试用、留存和后续 App Store 页面优化判断。
- 后端新增：`ProductEvent` 数据模型、`/api/analytics/events` 手动事件、`/api/analytics/funnel` 当前用户漏斗汇总。
- 自动埋点：材料解析完成、学习路径生成、首个学习节点完成、D+1 回访完成都由 API 端记录，减少前端漏报。
- 前端埋点：打开示例材料时记录 `first_run_sample_started`。
- 后续限制：这只是本地产品漏斗，不等于生产 analytics；下一阶段仍需要 install source、D+1/D+7 留存、转化率、cohort 和商店素材实验数据。

## 2026-05-05 商店素材基础包

- 目标审计继续推进到 `Store creative assets`：此前只有 readiness 缺口描述，没有可复用的产品页文案、截图脚本或产品页优化假设。
- 新增 `STORE_ASSETS.md`，固定产品名、subtitle、promotional text、关键词假设、6 张 iPhone 截图 storyboard、3 个 Product Page Optimization 变体和 30 秒 app preview 脚本。
- 新增 `/store-preview` 静态素材预览页，用同一套视觉系统展示 6 个截图构图方向，后续可作为真实 native app state 截图的构图参考。
- 后续限制：这仍是 draft creative kit，不是最终 App Store Connect 资产；最终还需要 native build、真实设备截图、iPad 截图、导出视频和本地化元数据。

## 2026-05-05 核心试用顺序修复

- 用户澄清：暂时不用继续管 App Store 上线事项，“App Store 前十”只是质量激励。执行方向切回产品本体。
- 产品判断：首次点击“打开示例课”直接生成学习路径太快，会跳过“材料先被检索、再被转换”的关键认知过程。
- 调整：首次 CTA 改为“打开示例材料”；点击后只完成本地登录和样例材料检索，停在检索结果页。
- 预期：用户先看到系统读到了什么，再主动点击“转成学习路径”，更符合串行使用顺序，也更尊重用户理解节奏。

## 2026-05-05 第三步使用说明修复

- 用户反馈：进入第 3 步后仍然不知道“学习路径”到底怎么用，说明页面只展示生成内容，没有把操作规则讲清楚。
- 产品判断：第 3 步的核心不是展示一条路径，而是让用户跟着一个个节点完成学习动作；每个节点都必须说明“当前要做什么”和“提交后发生什么”。
- 调整：流程状态把第 3 步改为“跟着练习”；面板顶部新增“第三步怎么用”，固定为读当前卡片、按要求选择或作答、提交后自动进入下一节点。
- 调整：学习卡片新增“当前你要做的是”，提交按钮改为按活动类型变化；把握程度从 `low / medium / high` 改为“没把握 / 一般 / 有把握”。
- 补充修复：从历史课程点击“继续学习”进入第 3 步时，主任务栏不再错误提示“解析材料”，而是同步显示当前练习动作。
