# Learn Your Way Reset PRD

Date: 2026-05-05
Status: planning baseline

## 1. Product Decision

The product is no longer framed as an AI course workbench.

It is a material learning converter:

```text
Source material -> Learning pack -> Verifiable study loop
```

A user brings one PDF, text passage, or web article. The system extracts its structure and turns the same source into multiple learning representations, then guides the user through reading, practice, and review with visible source evidence.

## 2. Reference Model

The target pattern is Google Learn Your Way:

- Start from textbook-like source material.
- Adapt the material to the learner's level and interests.
- Generate multiple learning formats from the same source.
- Keep assessment tied to the source material.

Reference evidence:

- Google Research describes the Learn Your Way interface as multiple personalized representations of source content: immersive text, section-level quizzes, slides and narration, audio lessons, and mind maps. Source: https://research.google/blog/learn-your-way-reimagining-textbooks-with-generative-ai/
- Google's product announcement frames Learn Your Way as transforming textbook material into interactive guides with mind maps, audio lessons, interactive quizzes, real-time feedback, and learner agency. Source: https://blog.google/outreach-initiatives/education/learn-your-way/

Local prior work points to the same direction:

- `/Users/mahaoxuan/Desktop/AI产品经理/实验探索/vibe-coding/learn-your-way` already models PDF upload, immersive reader, slide deck, mind map, audio lesson, and quiz.
- `/Users/mahaoxuan/Documents/trae_projects/focus-quiz/focus-quiz-optimized` contributes the stronger practice loop: questions should expose understanding gaps, show evidence after answering, and link mistakes back to the source.

## 3. Product Promise

For the first release, the promise is:

> Upload or paste one learning material. Pixel turns it into a clear learning pack with reading, structure, and quiz modes, where every card shows where it came from and what the learner should verify.

## 4. Primary User

The primary user is a student or self-learner who has a serious source material and does not want a generic summary.

They need:

- To know what the material says.
- To see the internal structure of the material.
- To study it in a format that fits the task.
- To test whether they actually understood it.
- To return to the exact source passage when they fail or feel unsure.

## 5. Non-goals

Do not optimize this phase for:

- App Store launch packaging.
- Social learning.
- A complete second-brain system.
- A course marketplace.
- A full LMS.
- Decorative dashboard analytics.
- More learning formats before the first three are reliable.

## 6. MVP Scope

The MVP must support one complete local study loop:

1. Input material: paste text, upload PDF, or provide web text.
2. Analyze material: title, summary, sections, key concepts, and source excerpts.
3. Generate learning pack: at least three representations.
4. Choose one representation: the user enters one learning mode at a time.
5. Study with evidence: every card has source excerpt, learning goal, user action, and feedback.
6. Review weak points: wrong answers or low-confidence cards become review items.

## 7. Required Learning Representations

### 7.1 Immersive Reading

Purpose: help the learner read the material in a guided sequence.

Must show:

- Current source section.
- Rewritten or segmented reading content.
- Original source excerpt.
- One embedded check or reflection prompt.

### 7.2 Structure Map

Purpose: make the material's internal logic visible.

Must show:

- Root material title.
- Section nodes.
- Key concept nodes.
- Evidence or question nodes where available.

The user should be able to inspect a node and see the source passage or explanation behind it.

### 7.3 Understanding Quiz

Purpose: check understanding, not generate a long exam.

Must show:

- A short question tied to a source excerpt.
- Answer choices or a short-answer field.
- Post-answer feedback.
- The evidence passage after answering.

Quiz design should follow Focus Quiz's useful distinction:

- concept boundary
- causal or logical relation
- transfer to a new scenario

## 8. Information Architecture

The interface must be serial at the page/workflow level and parallel only inside a selected result.

Correct sequence:

```text
Start -> Input -> Material analysis -> Learning pack -> One learning mode -> Review
```

Do not show all major functions at once. Each screen must answer:

- What material am I using?
- What has the system produced?
- What is my one next action?

## 9. Core Data Objects

### Material

- `id`
- `source_type`: `pdf`, `text`, `web`
- `title`
- `raw_text`
- `summary`
- `created_at`

### Material Section

- `id`
- `material_id`
- `heading`
- `order`
- `source_excerpt`
- `summary`

### Learning Pack

- `id`
- `material_id`
- `learner_profile`
- `representations`
- `generated_at`

### Learning Representation

- `id`
- `pack_id`
- `type`: `immersive_reading`, `structure_map`, `quiz`
- `title`
- `items`

### Learning Item

- `id`
- `representation_id`
- `source_section_id`
- `source_excerpt`
- `learning_goal`
- `user_action`
- `content`
- `feedback_rule`

### Review Item

- `id`
- `material_id`
- `source_item_id`
- `reason`: `wrong_answer`, `low_confidence`, `skipped`, `manual_save`
- `next_review_at`

## 10. Acceptance Criteria

| Requirement | Evidence needed |
| --- | --- |
| A first-time user understands the product in 10 seconds | First viewport says material -> learning pack, not course workbench |
| Input is clear | User can paste text or upload PDF from the first task screen |
| Material analysis is visible | UI shows title, summary, sections, key concepts, and source excerpts after analysis |
| Learning pack exists | UI shows at least three generated representations from the same material |
| No function pile-up | Only the current workflow step is primary; other modes are selectable after generation |
| Every card has real content | No empty card, generic scene text, or action button without material content |
| Every card is traceable | Card shows source excerpt, source section, learning goal, and user action |
| Quiz is verifiable | Answering a quiz item reveals feedback and source evidence |
| Review loop exists | Wrong or low-confidence items appear in review |
| Browser is stable | Browser console has zero runtime errors during the happy path |
| Build is stable | API tests, web lint, and web build pass |
| Real-material proof exists | A real PDF or realistic text sample completes input -> analysis -> pack -> study -> review |

## 11. Verification Plan

Required commands:

```bash
uv run --project apps/api pytest
pnpm --dir apps/web lint
pnpm --dir apps/web build
```

Required browser evidence:

- Desktop happy-path screenshot after material analysis.
- Desktop screenshot showing learning pack choices.
- Desktop screenshot showing one active learning card with source evidence.
- Quiz answer interaction with feedback and source evidence.
- Browser console check with zero runtime errors.

Required test fixture:

- One real PDF already in `data/uploads`, or a newly uploaded non-sensitive sample PDF.
- One pasted text fixture for fast smoke testing.

## 12. Implementation Phases

### Phase 1: Product Shell Reset

Deliverables:

- Replace workbench-first wording with material learning converter wording.
- Introduce serial workflow screens.
- Show one primary next action per step.

Verification:

- First viewport and logged-in shell pass the 10-second clarity test.
- Browser screenshot proves functions are not piled into one page.

### Phase 2: Material Analysis Surface

Deliverables:

- Analysis result page shows title, summary, sections, concepts, and excerpts.
- Learning pack generation starts from analysis, not from hidden state.

Verification:

- Text and PDF fixtures both produce visible analysis.

### Phase 3: Learning Pack MVP

Deliverables:

- Generate immersive reading, structure map, and quiz from the same material.
- User chooses one representation before entering its UI.

Verification:

- Browser screenshot shows three modes.
- Each mode contains source-tied content.

### Phase 4: Evidence-backed Learning Items

Deliverables:

- Every learning item includes source excerpt, goal, action, and feedback.
- Remove generic scene/activity content that does not point back to the material.

Verification:

- Automated or browser text assertion confirms each visible item contains source evidence.

### Phase 5: Review Loop

Deliverables:

- Wrong answers and low-confidence submissions become review items.
- Review screen shows what to revisit and why.

Verification:

- Complete a quiz incorrectly and verify the review item appears with source link/excerpt.

## 13. Migration Notes

Existing work should be evaluated against this PRD rather than carried forward automatically.

Likely reusable:

- Current FastAPI upload/analyze/course endpoints.
- Current material graph and question extraction.
- The uncommitted `source_context` idea if it reliably attaches source excerpts to learning items.
- The old local `learn-your-way` representation schema.
- Focus Quiz's hint/evidence and mistake-return loop.

Likely replace:

- Workbench UI that presents all functions together.
- "Course run" language when it hides the source-material transformation.
- Generic activity or scene text not grounded in source excerpts.

## 14. Completion Definition

This reset is complete only when a new user can perform this full path without explanation:

```text
Open app -> Add material -> See analysis -> Generate learning pack -> Choose quiz or reading -> Complete one learning item -> See feedback -> See review item if needed
```

All steps must be visible, source-grounded, and verified with automated checks plus browser evidence.
