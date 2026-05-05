# 材料学习转换器

这是一个面向论文与深度阅读场景的首版 MVP。

它的产品主线是：

```text
输入材料 -> 检索材料内部结构 -> 转成学习路径 -> 跟着练习与复习
```

它支持：

- 粘贴文段或上传 `PDF / DOCX / TXT / MD`
- 自动解析文本、识别材料类型、抽取材料内部结构
- 展示论点、证据、概念、问题目标和容易误解的地方
- 把检索结果转换成可以跟着做的互动练习路径
- 通过追问、测验、复盘和复习计划帮助用户检查理解
- 用像素小猫承担引导、提示、纠错和回访角色

## 技术结构

- `apps/web`：Next.js 前端
- `apps/api`：FastAPI 后端
- `data`：本地开发用上传文件、OCR 中间文件和 SQLite 数据

## 本地启动

```bash
pnpm install
uv sync --project apps/api
pnpm dev
```

如果只单独启动后端：

```bash
uv run --project apps/api uvicorn app.main:app --app-dir apps/api --reload --port 8000
```

如果 `3000 / 8000` 已被占用，可以换成本机备用端口：

```bash
PIXEL_FRONTEND_BASE_URL=http://127.0.0.1:3011 uv run --project apps/api uvicorn app.main:app --app-dir apps/api --reload --port 8011
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8011/api pnpm --dir apps/web dev --hostname 127.0.0.1 --port 3011
```

启动后：

- Web：<http://127.0.0.1:3000>
- API：<http://127.0.0.1:8000>
- API 文档：<http://127.0.0.1:8000/docs>

## 本地开发说明

- 账号系统使用开发模式 magic link。输入邮箱后，界面会直接显示可点击的登录链接。
- 数据库存储默认用 SQLite，但表结构与接口按后续切换 Postgres 的方式设计。
- PDF 解析优先走文本层提取，若文本过少则尝试 `pdftotext`，再 fallback 到 `tesseract` OCR。
- 学习内核通过 `model provider` 边界接入。当前默认 `PIXEL_MODEL_PROVIDER=heuristic`，后续真实模型应替换 provider，而不是改路由层。
- 后端开发模式允许 `localhost / 127.0.0.1` 的任意端口通过 CORS；magic link 预览地址由 `PIXEL_FRONTEND_BASE_URL` 控制。

## 当前验证基线

```bash
uv run --project apps/api pytest
pnpm --dir apps/web lint
pnpm --dir apps/web build
```

API 测试包含一条端到端烟测：`magic link -> 粘贴文本 -> analyze -> course-blueprint -> course-run -> event -> review-plan`。

## 当前阶段

这个项目现在处于本地 Alpha 前的 MVP 阶段：

- 产品闭环已经跑通。
- 课程理解与评价仍以启发式 provider 为默认实现。
- 前端已经能展示材料检索结果、学习目标、rubric、关键词线索、掌握度和最近反馈。
- 下一阶段重点是接入真实模型 provider，并用端到端烟测守住现有闭环。
