# 当前任务清单

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
- [ ] 推送本轮改动。

## 2026-05-05 串行流程页修复

- [x] 确认当前问题：登录后把材料输入、检索结果、学习路径、复习历史全部堆在同一屏，破坏用户顺序感。
- [x] 将工作台改为四个串行功能页：输入材料、检索结构、学习路径、复习回访。
- [x] 将顶部四步状态条改成流程导航，只允许进入已经解锁的阶段。
- [x] 在解析、生成路径、选择历史课程、完成课程等节点自动切换到对应功能页。
- [x] 运行 lint/build/API 和浏览器交互验证，确认不会再同时展示全部功能面板。
- [x] 提交本轮改动。
- [ ] 推送本轮改动。

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
