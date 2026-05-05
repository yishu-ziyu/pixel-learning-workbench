# 当前任务清单

- [x] 确认 `~/.codex/AGENTS.md` 的 `quality_execution_guidelines` 已加载。
- [x] 明确当前产品成功标准：用户能看懂并使用 `输入材料 -> 检索材料 -> 转成学习路径 -> 开始学习`。
- [x] 重构主工作台，让材料解析和材料检索结果成为显式步骤。
- [x] 更新 README / DEVLOG，纠正产品定位表达。
- [x] 运行前端 lint、build 和本地页面验证。
- [x] 提交本地 commit，并记录无法 push 的原因。

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
