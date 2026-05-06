# Learn Your Way IA and Migration Plan

Date: 2026-05-05
Status: implementation planning

This plan translates `docs/learn-your-way-reset-prd.md` into concrete UI and code migration work.

## 1. Current State Snapshot

Current product code already has useful foundations:

- `apps/web/src/components/workbench.tsx` has four workflow stages: `input`, `retrieval`, `path`, and `review`.
- `apps/api/app/routers/assets.py` supports asset creation and material analysis.
- `apps/api/app/services/analysis.py` builds a `learning_representation` with keywords, graph nodes, question targets, and misconception risks.
- `apps/api/app/services/blueprint.py` turns analysis into playable activities.
- `apps/api/app/routers/course_runs.py` records learning events and creates review plans.

The main product problem is naming and shape:

- `path` and `course_run` frame the experience as a course path, not a learning pack.
- The UI still feels like operating an internal pipeline.
- The user does not first choose among learning representations.
- Learning activities can still feel like abstract cards unless every item is visibly grounded in source excerpts.

## 2. Target Information Architecture

Target stages:

```text
input -> analysis -> learning_pack -> study_mode -> review
```

### 2.1 Input

User goal:

- Add a source material.

Primary UI:

- Paste text area.
- PDF upload.
- Optional URL/web text entry later.
- One primary action: `解析材料`.

Exit criteria:

- A `Material` exists.
- Parsed text is non-empty.

### 2.2 Analysis

User goal:

- Understand what the system extracted before generating learning content.

Primary UI:

- Material title.
- Summary.
- Sections.
- Key concepts.
- Source excerpts.
- One primary action: `生成学习包`.

Exit criteria:

- A visible analysis result exists.
- The user can inspect at least one section and source excerpt.

### 2.3 Learning Pack

User goal:

- Choose how to learn the material.

Primary UI:

- Three representation cards:
  - `沉浸阅读`
  - `结构图`
  - `理解测验`
- Each card shows what it will do, how many items it contains, and what source coverage it uses.
- One primary action per representation: `进入`.

Exit criteria:

- The user selects one representation.

### 2.4 Study Mode

User goal:

- Work through one selected representation without seeing unrelated tools.

Primary UI requirements shared by all modes:

- Current source section.
- Original excerpt.
- Learning goal.
- User action.
- Feedback area.

Mode-specific UI:

- Immersive Reading: reading blocks with embedded checks.
- Structure Map: graph/list with inspectable nodes and source evidence.
- Understanding Quiz: question, answer, feedback, source evidence.

Exit criteria:

- User completes at least one learning item.

### 2.5 Review

User goal:

- Revisit weak or unfinished learning items.

Primary UI:

- Review cards grouped by material.
- Reason for review.
- Source excerpt.
- Action: `重新学习` or `标记已复习`.

Exit criteria:

- User completes or dismisses a review item.

## 3. Naming Migration

| Current term | Target term | Reason |
| --- | --- | --- |
| `course` | `learning pack` | This is not a course marketplace or fixed curriculum. |
| `course blueprint` | `learning pack blueprint` | The generated object is a pack of representations. |
| `course run` | `study session` | User is studying a material, not enrolling in a course. |
| `path` | `study mode` or `learning representation` | The third stage is no longer one path; it is one chosen representation. |
| `activity` | `learning item` | Better matches cards, quiz items, reading checks, and map nodes. |
| `scene` | remove or rename | Generic scenes create confusion unless grounded in source material. |

Implementation note: internal API names can migrate gradually. UI copy should move first because it controls user comprehension.

## 4. Suggested Frontend Work Breakdown

### 4.1 Stage model

Current:

```ts
type WorkbenchStage = "input" | "retrieval" | "path" | "review";
```

Target:

```ts
type WorkbenchStage = "input" | "analysis" | "learning_pack" | "study_mode" | "review";
```

If a smaller first diff is safer, map old state to new labels first:

- `retrieval` displays as `材料分析`
- `path` splits visually into `学习包` and `学习模式`, even if backed by one data object at first.

### 4.2 Components to extract

`workbench.tsx` should not keep growing as a single large component.

Extract in this order:

- `MaterialInputStep`
- `MaterialAnalysisStep`
- `LearningPackStep`
- `StudyModeStep`
- `ReviewStep`
- `SourceEvidenceCard`

Do this after behavior is covered by tests or browser assertions, because the file already has important flow state and analytics side effects.

### 4.3 Learning pack cards

Minimum card data:

```ts
type LearningMode = {
  id: "immersive_reading" | "structure_map" | "quiz";
  title: string;
  description: string;
  itemCount: number;
  sourceCoverageLabel: string;
};
```

The learning pack step should be the first place where three parallel options appear. Before this step, the flow is serial.

### 4.4 Source evidence card

Every study item should render the same evidence block:

```text
来自材料哪里
材料原文 / 解析片段
这一步要理解什么
你现在要做什么
完成后的反馈
```

This should become a reusable component and a test target.

## 5. Suggested Backend Work Breakdown

### 5.1 Keep current endpoints temporarily

Do not rename API routes first. Preserve compatibility while the product shell changes.

Current endpoints can still power the MVP:

- create asset
- analyze asset
- create blueprint
- create course run
- submit assessment event
- list review plans

Compatibility boundary as of 2026-05-06:

- Public UI language uses `学习包`, `学习形态`, `学习卡片`, and `复习回访`.
- Internal API routes still use `course-blueprint` and `course-runs` to avoid a breaking migration during the product reset.
- New user-facing features should not introduce more `course` copy.
- A later migration can add alias routes such as `/learning-packs` and `/study-sessions` while keeping the current routes until downstream callers are moved.
- create run
- record event
- list review plans

### 5.2 Add learning-pack-shaped response

Add a provider boundary that returns a pack-shaped object:

```text
material
analysis
representations[]
review_seed
```

This can wrap existing `learning_representation` and `blueprint` initially.

### 5.3 Representation mapping

Initial mapping from current data:

- Immersive Reading:
  - source sections
  - summary
  - explain / reflect activities
- Structure Map:
  - `argument_graph`
  - keywords
  - question targets
- Understanding Quiz:
  - `question_targets`
  - probe / challenge activities

### 5.4 Review mapping

Current review plans are tied to course runs. Keep them initially, but UI should present them as material review items.

## 6. Reuse from Old Local Learn Your Way

Useful conceptual imports:

- `types.ts`: `PersonalizedChapter`, `MindMapNode`, `QuizQuestion`, and `AppView` show a clean representation-oriented model.
- `components/ImmersiveReader.tsx`: useful as an interaction reference, not a direct copy target.
- `components/MindMap.tsx`: useful for structure-map behavior.
- `components/Quiz.tsx`: useful for quiz mode shape.
- `services/rewriter.ts`: useful prompt/schema reference for multi-representation generation.

Do not directly copy the old UI wholesale. The current project has auth, asset persistence, analytics, and review plans that the old Vite app does not.

## 7. Reuse from Focus Quiz

Useful product rules:

- Ask fewer, sharper questions.
- Separate hint from evidence.
- Show source evidence after answering.
- Treat wrong answers as return paths to the original material.
- Keep export/review lightweight instead of building a whole second brain.

## 8. Prompt-to-Artifact Checklist

| Requirement from reset objective | Artifact to produce | Verification |
| --- | --- | --- |
| Clear target similar to Learn Your Way | `docs/learn-your-way-reset-prd.md` | PRD includes source -> learning pack -> study loop |
| Local similar work searched | This file section 6 and 7 | Paths to old `learn-your-way` and Focus Quiz are documented |
| Serial pages, not all functions piled together | Updated `workbench.tsx` stage model and browser screenshot | Screenshot shows only one primary workflow step |
| Parallel effects inside selected result | `LearningPackStep` with three representation cards | Browser shows three cards only after analysis/generation |
| Real card content | `SourceEvidenceCard` and tests | Visible item has source excerpt and learning goal |
| 3 MVP modes | representation mapping and UI cards | Reading, structure map, quiz all render from same material |
| Data model boundaries | PRD section 9 plus backend schemas | API response has material/section/pack/representation/item/review concepts |
| Full verification | test/browser evidence | API pytest, web lint/build, browser no-console-error pass |

## 9. First Implementation Slice

The safest first code slice is UI shell only:

1. Keep backend routes unchanged.
2. Rename user-facing stages to:
   - `输入材料`
   - `材料分析`
   - `学习包`
   - `开始学习`
   - `复习`
3. Split current `path` screen into:
   - learning pack choice area
   - active study item area
4. Use existing blueprint activities to populate the first version of:
   - immersive reading
   - structure map
   - understanding quiz
5. Reuse the uncommitted `source_context` work only if it keeps every study item source-grounded.

This slice is valuable because it attacks the user's core confusion before deeper backend renaming.
