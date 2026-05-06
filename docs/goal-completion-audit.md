# Goal Completion Audit

Date: 2026-05-06
Status: complete with non-blocking follow-up notes

## Objective Restatement

Build Pixel as a Learn Your Way style material learning converter:

```text
PDF / text / web material -> material analysis -> learning pack -> one selected learning representation -> verifiable study -> review
```

The product should not feel like a generic course workbench. It should help a learner transform one source material into multiple source-grounded study modes and complete a clear learning loop.

## Prompt-to-Artifact Checklist

| Requirement | Evidence checked | Current status |
| --- | --- | --- |
| Product definition says material converter, not AI course workbench | `docs/learn-your-way-reset-prd.md`, `README.md`, first viewport browser snapshot | Done |
| Google Learn Your Way reference researched | Google Research and Google Keyword official pages cited in `docs/learn-your-way-reset-prd.md` | Done |
| Input supports pasted material and file upload | Existing UI has text area and file upload; API accepts text/file | Done for text/file shell |
| PDF / text / web material requirement | Parser supports PDF/DOCX/TXT/MD upload, pasted text, and HTTP/HTTPS URL ingestion; API URL flow is covered by regression test | Done |
| Material analysis shows title, summary, sections, concepts, source excerpts | Analysis page shows material title, summary, source, section count, keyword count, structure nodes, learning questions, risks | Done |
| Learning pack generated from same material | Learning pack page shows three modes and pack summary | Done |
| At least three MVP learning modes | Immersive reading, structure map, understanding quiz are selectable | Done |
| Structure map is real, not just a label | `apps/web/src/components/workbench.tsx` renders a structure map study panel with clickable nodes, evidence, roles, concepts, and verification target | Done |
| Every card has real source content | Activity cards render `source_context` with source section, excerpt, graph node, and question target | Done for generated activities |
| Card shows source, learning goal, user action, feedback | Source and action are visible before submission; feedback appears after submit | Done for quiz/probe path |
| User sees one workflow step at a time | Workbench stages are serial: input, analysis, learning pack, study mode, review | Done |
| User and collaborator can see each step's intent | Browser UI shows `当前步骤意图`, `用户现在要做什么`, `完成标准`, `可见证据`; each workflow card includes `意图：...` | Done |
| Browser has no runtime errors | Playwright console check: Errors 0, Warnings 0 during happy path | Done for sample text path |
| API tests pass | `uv run --project apps/api pytest`: 9 passed | Done |
| Web lint/build pass | `pnpm --dir apps/web lint` and `pnpm --dir apps/web build` pass | Done |
| Real PDF end-to-end proof | Uploaded `/Users/mahaoxuan/Desktop/华为慧通新零售管培生谈薪攻略.pdf`, parsed with `pdf_text_layer`, generated learning pack, completed 13 learning items, and generated 3 review plans | Done |
| Review loop uses weak points / wrong answers | Review plan now exposes `review_reasons` from wrong answers, low-confidence events, weak mastery, and misconceptions; UI renders `为什么复习这些` | Done |
| Internal data model aligned to learning pack/study session | UI language is aligned; `docs/learn-your-way-ia-migration-plan.md` documents a compatibility boundary for remaining `course-*` API names | Done for current reset |

## Current Evidence

- Browser sample text path verified: input material -> material analysis -> learning pack -> structure map -> understanding quiz.
- Browser real PDF path verified: upload PDF -> material analysis -> learning pack -> structure map.
- API real PDF completion verified: `/Users/mahaoxuan/Desktop/华为慧通新零售管培生谈薪攻略.pdf` -> `pdf_text_layer` -> 3 graph nodes -> 13 activities -> `course_status=completed` -> 3 review plans.
- Browser URL input visibility verified: input page shows `或者输入网页地址`; filling `https://example.com/article` switches status to `网页已就绪`.
- Browser workflow intent verified: page shows `当前步骤意图`, `用户现在要做什么`, `完成标准`, `可见证据`, and every workflow card has `意图：...`.
- Material analysis screenshot: `pixel-material-analysis-cover-2026-05-06.png`.
- Real PDF screenshot: `pixel-real-pdf-structure-map-2026-05-06.png`.
- URL input screenshot: `pixel-url-input-field-2026-05-06.png`.
- Workflow intent screenshot: `pixel-workflow-intent-panel-2026-05-06.png`.
- Structure map screenshot: `pixel-structure-map-panel-2026-05-06.png`.
- Quiz screenshot: `pixel-structure-map-study-mode-2026-05-06.png`.
- Console check: Errors 0, Warnings 0.
- Automated checks:
  - `pnpm --dir apps/web lint`
  - `pnpm --dir apps/web build`
  - `uv run --project apps/api pytest`

## Non-blocking Follow-up Notes

1. The backend still emits FastAPI `on_event` deprecation warnings. They do not block current product use, but should be cleaned in a maintenance pass.
2. Internal API names still include `course-blueprint` / `course-run`; the compatibility boundary is documented, and alias routes can be added in a future migration.
