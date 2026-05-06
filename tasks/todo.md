# 当前任务清单

## 2026-05-06 专注学习模式与项目来源梳理

- [x] 确认当前用户问题：进入具体学习板块后仍被全局流程、帮助块和引导模块打断，无法专注。
- [x] 将具体学习模式改为专注界面：隐藏欢迎区、流程状态条、当前任务条、步骤意图面板和普通提示横幅。
- [x] 在专注学习界面保留最小模式头、学习内容、源材料依据、操作按钮、进度和回到学习包入口。
- [x] 在专注学习界面隐藏学习卡片帮助块、结构图帮助块和通用学习引导模块。
- [x] 新增 `docs/project-origin-map.md`，梳理当前项目与 `learn-your-way`、`Focus Quiz`、`AI阅读教练`、`cognitive-reader` 等本地子项目的关系。
- [x] 运行 Web lint/build、API 测试和浏览器可见验证。

## 2026-05-05 Learn Your Way 目标重置

- [x] 重新设定产品目标：`材料 -> 学习包 -> 可验证学习闭环`。
- [x] 新增 `docs/learn-your-way-reset-prd.md`，写清产品定义、MVP 边界和验收标准。
- [x] 新增 `docs/learn-your-way-ia-migration-plan.md`，把旧工作台迁移到串行流程。
- [x] 新增 `docs/goal-completion-audit.md`，逐项映射目标、证据和剩余缺口。
- [x] 将主界面推进为五步：输入材料、材料分析、学习包、开始学习、复习回访。
- [x] 学习卡片显化来源：材料位置、原文/解析片段、结构节点和检查目标。
- [x] 学习包页显化三种学习形态：沉浸阅读、结构图、理解测验。
- [x] 选择理解测验后进入测验卡，而不是继续显示泛化情境卡。
- [x] 将结构图模式补齐为真实可操作页面：结构节点、材料依据、结构角色、验证问题和关键概念。
- [x] 将材料分析页补齐为显式材料封面：材料标题、摘要、来源、结构数和关键词数。
- [x] 用真实 PDF 完成上传、解析、生成学习包并进入结构图学习模式。
- [x] 补齐 Web URL 材料入口：前端输入网页地址，后端抓取 HTTP/HTTPS 正文并进入同一分析流程。
- [x] 复习计划显化原因：错题、低把握、弱概念和误解线索会显示在 `为什么复习这些`。
- [x] 将合作流程改成浏览器可见模式：每个步骤卡显示 `意图`，当前步骤面板显示 `当前步骤意图 / 用户现在要做什么 / 完成标准 / 可见证据`。
- [x] 清理会直接误导用户的“课程化学习 / 学习路径”文案。
- [x] 运行 API 测试、Web lint/build 和浏览器验证。
- [x] 形成当前能力、缺口和下一步交付边界报告。

### 当前验收结果

- `pnpm --dir apps/web lint` 通过。
- `pnpm --dir apps/web build` 通过。
- `uv run --project apps/api pytest` 通过：9 passed，保留 FastAPI `on_event` 既有 deprecation warning。
- 浏览器验证通过：输入材料 -> 材料分析 -> 学习包 -> 进入理解测验 -> 提交回答并看到反馈。
- 二次浏览器验证通过：输入材料 -> 材料分析 -> 学习包 -> 进入结构图 -> 点击结构节点 -> 进入理解测验。
- 真实 PDF 浏览器验证通过：上传 `华为慧通新零售管培生谈薪攻略.pdf` -> `pdf_text_layer` 解析 -> 学习包 -> 结构图。
- Web URL 浏览器验证通过：输入页显示 `或者输入网页地址`，填写 `https://example.com/article` 后状态显示 `网页已就绪`。
- 流程意图浏览器验证通过：页面显示 `当前步骤意图`、`用户现在要做什么`、`完成标准`、`可见证据`，每个流程卡显示 `意图：...`。
- API URL 回归测试通过：`/api/assets` 接收 URL，`/api/assets/{id}/analyze` 返回 `parse_strategy=web_url` 和结构图。
- 复习计划回归测试通过：低把握学习事件会进入 `review_reasons`。
- 浏览器 console 验证：Errors 0，Warnings 0。
- 截图产物：`pixel-reset-goal-learning-pack-flow-2026-05-05.png`。
- 截图产物：`pixel-structure-map-panel-2026-05-06.png`、`pixel-structure-map-study-mode-2026-05-06.png`。
- 截图产物：`pixel-material-analysis-cover-2026-05-06.png`、`pixel-real-pdf-structure-map-2026-05-06.png`。
- 截图产物：`pixel-url-input-field-2026-05-06.png`。
- 截图产物：`pixel-workflow-intent-panel-2026-05-06.png`。

### 当前缺口

- FastAPI `on_event` 仍有既有 deprecation warning，后续维护清理。
- 仍沿用 `course-blueprint / course-run` 等内部 API 命名；本轮已在 `docs/learn-your-way-ia-migration-plan.md` 记录兼容边界，后续可加 alias route 再迁移。

## 2026-05-05 UI 收敛

- [x] 确认 `~/.codex/AGENTS.md` 的 `quality_execution_guidelines` 已加载。
- [x] 明确当前产品成功标准：用户能看懂并使用 `输入材料 -> 检索材料 -> 转成学习路径 -> 开始学习`。
- [x] 重构主工作台，让材料解析和材料检索结果成为显式步骤。
- [x] 更新 README / DEVLOG，纠正产品定位表达。
- [x] 运行前端 lint、build 和本地页面验证。
- [x] 提交本地 commit，并记录无法 push 的原因。

## 2026-05-05 UI 清晰度修复

- [x] 移除登录后大 hero 对工作台的干扰。
- [x] 增加四步工作流状态条，明确当前步骤和下一步。
- [x] 将主工作区改为材料、检索、学习三列，复习历史下沉到底部。
- [x] 将视觉系统从重暗色卡片改成更轻的工作台风格。
- [x] 运行前端 lint、build 和页面验证。
- [x] 提交本地 commit，并尝试 push。

## 2026-05-05 Skill-backed 产品化优化

- [x] 搜索并读取可用于当前目标的本地 skill：`frontend-app-builder`、`react-best-practices`、`design-consultation`、`design-review`。
- [x] 建立 `DESIGN.md`，把产品语义、视觉系统和 App-Store-ready 启发式写成设计源文件。
- [x] 在登录后工作台加入当前主任务 command bar，让用户始终知道下一步该点什么。
- [x] 给材料输入区增加 readiness 状态，避免用户不知道为什么按钮不可用。
- [x] 给检索区和学习区的空状态补上可执行按钮。
- [x] 将学习引导 UI 从玩具化角色收敛为更正式的引导模块。
- [x] 运行前端 lint、build 和页面验证。
- [x] 提交并推送本轮改动。

## 2026-05-05 App Store readiness 基础层

- [x] 查阅 Apple 官方产品页、产品页优化、custom product pages 和 App Analytics 资料。
- [x] 新增 `APP_STORE_READINESS.md`，把目标拆成 prompt-to-artifact 检查表和缺口清单。
- [x] 新增 Web app manifest 与基础图标：`apps/web/src/app/manifest.ts`、`apps/web/public/icon.svg`。
- [x] 更新 Next metadata：应用名、manifest、Apple web app、theme color、Open Graph。
- [x] 运行 lint/build，并验证 `/manifest.webmanifest`。
- [x] 提交本轮改动。
- [x] 推送本轮改动。

## 2026-05-05 串行流程页修复

- [x] 确认当前问题：登录后把材料输入、检索结果、学习路径、复习历史全部堆在同一屏，破坏用户顺序感。
- [x] 将工作台改为四个串行功能页：输入材料、检索结构、学习路径、复习回访。
- [x] 将顶部四步状态条改成流程导航，只允许进入已经解锁的阶段。
- [x] 在解析、生成路径、选择历史课程、完成课程等节点自动切换到对应功能页。
- [x] 运行 lint/build/API 和浏览器交互验证，确认不会再同时展示全部功能面板。
- [x] 提交本轮改动。
- [x] 推送本轮改动。

## 2026-05-05 留存漏斗基础层

- [x] 完成目标审计：当前还缺原生分发、商店资产、隐私审核、真实模型质量和生产留存数据。
- [x] 新增 `ProductEvent` 数据模型，记录产品级用户行为。
- [x] 新增 `/api/analytics/events` 和 `/api/analytics/funnel`。
- [x] 后端自动记录材料解析、路径生成、首步学习完成、D+1 回访完成。
- [x] 前端记录打开示例材料事件，避免首轮试用入口丢失。
- [x] 运行 lint/build/API 验证。
- [x] 提交并推送本轮改动。

## 2026-05-05 商店素材基础包

- [x] 确认缺口：仍缺 final icon variants、6.7-inch screenshots、iPad screenshots、app preview videos。
- [x] 新增 `STORE_ASSETS.md`：产品页文案、关键词假设、截图 storyboard、三组产品页优化变体、预览视频脚本。
- [x] 新增 `/store-preview` 静态截图构图页。
- [x] 运行 lint/build 和浏览器验证。
- [x] 提交并推送本轮改动。

## 2026-05-05 核心试用顺序修复

- [x] 根据最新方向，停止继续推进 App Store 上线包装，把目标切回高质量产品体验。
- [x] 将首次 CTA 从“打开示例课”收敛为“打开示例材料”。
- [x] 示例入口只完成登录和材料检索，停留在检索结果页，由用户主动点击“转成学习路径”。
- [x] 运行 lint/build/API 和浏览器验证。
- [x] 提交并推送本轮改动。

## 2026-05-05 第三步使用说明修复

- [x] 确认用户困惑点：第 3 步只展示学习内容，没有说明当前要做什么、怎么推进、提交后发生什么。
- [x] 将流程状态里的第 3 步从“学习路径”调整为“跟着练习”，避免用户误以为这里只是目录或摘要。
- [x] 在第 3 步面板新增“第三步怎么用”：读卡片、选择或作答、提交后自动进入下一节点。
- [x] 将学习卡片里的当前动作、提交按钮、把握程度全部改成动作化中文。
- [x] 修复继续学习进入第 3 步后主任务栏仍显示“解析材料”的状态错位。
- [x] 二次修复“卡片在哪里”的问题：第 3 步说明直接指向写着“当前学习卡片”的区域，并给该区域加显式标题和更强边框。
- [x] 将“当前学习卡片”提前到学习引导之前，让真正要读的区域更早出现在页面中。
- [x] 运行 lint/build/API 和浏览器验证。
- [x] 提交并推送本轮改动。

## 验证标准

- 页面首屏能直接说明产品是材料学习转换器，而不是抽象课程工作台。
- 登录后主界面按四步组织：材料输入、材料检索结果、学习路径、学习与复习。
- 用户可以先解析材料，再把解析结果转成练习路径。
- TypeScript / lint / build 通过。

## Review

- `pnpm --dir apps/web lint` 通过。
- `pnpm --dir apps/web build` 通过。
- `curl -I http://127.0.0.1:3011` 返回 `200 OK`。
- 首屏 HTML 已包含 `材料学习转换器`、`检索材料内部结构`、`转成学习形态`。
- API 烟测通过：文本材料 -> analyze -> course-blueprint -> course-run，返回 `paper / direct_text / 4 graph nodes / 4 questions / 8 keywords / 4 chapters / in_progress`。
- 浏览器 MCP 当前被已有 Playwright 会话锁住，未能做交互截图验证。
- 本地已提交；当前仓库没有配置 remote，因此无法执行 `git push`。

### UI 清晰度修复验证

- `pnpm --dir apps/web lint` 通过。
- `pnpm --dir apps/web build` 通过。
- `curl -I http://127.0.0.1:3011` 返回 `200 OK`。
- 页面正文包含 `材料学习转换器`、`输入一份材料`、`检索材料内部结构`、`转成学习形态`。
- 浏览器 MCP 仍被已有 Playwright 会话锁住；仓库本身没有安装 `playwright` 包，因此本轮没有完成截图级交互验证。

### Skill-backed 产品化优化验证

- `pnpm --dir apps/web lint` 通过。
- `pnpm --dir apps/web build` 通过。
- `uv run --project apps/api pytest` 通过：6 passed，保留 FastAPI `on_event` 既有 deprecation warning。
- `curl -I http://127.0.0.1:3011` 返回 `200 OK`。
- 首页 HTML 已包含 `跟着练习复习`，源码包含 `当前主任务`、`输入状态`、`学习引导`。
- 已解除卡住的 Playwright MCP 临时 Chrome 进程，并用浏览器验证：
  - 桌面端打开示例课后，主任务栏、四步状态、检索结果、学习路径均出现。
  - 主任务栏点击 `提交本步` 后，学习进度从 `1 / 13` 推进到 `2 / 13`。
  - 移动端 390px 宽度下，四步状态纵向排列且第 4 步不会因历史复习计划误标为当前 active。
  - 截图产物：`pixel-workbench-desktop-2026-05-05.png`、`pixel-workbench-mobile-fixed-2026-05-05.png`。

### 第三步使用说明修复验证

- `pnpm --dir apps/web lint` 通过。
- `pnpm --dir apps/web build` 通过。
- `uv run --project apps/api pytest` 通过：6 passed，保留 FastAPI `on_event` 既有 deprecation warning。
- `curl -I http://127.0.0.1:3011` 返回 `200 OK`。
- 浏览器验证：点击“继续学习”后，当前下一步显示 `完成本步练习：像素场景 1`，主任务栏显示 `当前任务：完成这一小步`，第 3 步面板显示 `第三步怎么用`、`读当前卡片`、`按要求选择或作答`、`提交后自动进入下一节点`，按钮显示 `我读懂了，进入下一步`。
- 浏览器 console 验证：Errors 0，Warnings 0。
- 截图产物：`pixel-step3-clarity-2026-05-05.png`。

### 第三步卡片定位二次修复验证

- [x] `pnpm --dir apps/web lint`
- [x] `pnpm --dir apps/web build`
- [x] 浏览器验证：第 3 步说明能直接指向 `当前学习卡片`，不再出现无法定位的 `读当前卡片`。
- [x] 浏览器文本断言：`当前学习卡片` 存在，`读当前卡片` 不存在，`点卡片底部绿色按钮进入下一节点` 存在。
- [x] 浏览器 console 验证：Errors 0，Warnings 0。
- [x] 截图产物：`pixel-step3-card-anchor-top-2026-05-05.png`。
- [x] 提交并推送。

## 2026-05-05 学习卡片内容显化修复

- [x] 确认根因：学习卡片显示为流程壳，后端活动没有携带材料来源、原文片段、结构节点和学习问题。
- [x] 后端活动新增 `source_context`，把检索结果带入每个学习节点。
- [x] 前端学习卡片新增材料来源区：来自哪里、原文/解析片段、系统抽出的结构、这一步要检查什么。
- [x] 兼容旧课程：如果活动没有 `source_context`，前端从 `learning_representation` 里 fallback 补齐。
- [x] 清理旧的空泛 `scene` 正文和“情境卡”指令，让当前任务直接指向材料片段和结构节点。
- [x] 调整第 3 步布局顺序：先展示“当前学习卡片”，再展示进度、操作说明和学习引导。
- [x] 运行 API 测试、Web lint/build 和浏览器验证。
- [ ] 提交并推送。
