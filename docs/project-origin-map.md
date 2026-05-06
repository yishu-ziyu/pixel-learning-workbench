# Project Origin Map

Date: 2026-05-06
Status: working diagnosis

## 1. Current Conclusion

This project is not a direct fork of one open-source repository.

It is a self-built MVP that combines several earlier local experiments around one newer product direction:

```text
one source material -> material structure -> learning pack -> one focused learning mode -> review loop
```

The closest external product reference is Google Learn Your Way. The closest local prototype is:

```text
/Users/mahaoxuan/Desktop/AI产品经理/实验探索/vibe-coding/learn-your-way
```

But the current repo has its own Next.js + FastAPI implementation and does not use that prototype as the codebase trunk.

## 2. External Reference

### Google Learn Your Way

Source:

- https://research.google/blog/learn-your-way-reimagining-textbooks-with-generative-ai/
- https://blog.google/outreach-initiatives/education/learn-your-way/

Relevant product pattern:

- Start from a source material, especially textbook-like PDF material.
- Preserve source integrity while producing multiple learning representations.
- Let the learner choose a representation such as immersive text, quiz, slides, audio lesson, or mind map.
- Keep assessment and feedback tied to the source material.
- Use personalization as a pipeline, not just as a theme layer.

What we should copy from it:

- Source-first product framing.
- Multiple representations from the same material.
- Assessment connected to the source.
- Learner agency through choosing one study mode.

What we should not copy yet:

- Five full learning formats at once.
- Heavy multimodal generation before text/PDF study quality is stable.
- Complex personalization before the basic learning loop is understandable.

## 3. Local Subproject Map

### 3.1 `learn-your-way`

Path:

```text
/Users/mahaoxuan/Desktop/AI产品经理/实验探索/vibe-coding/learn-your-way
```

Evidence:

- README positions it as an AI-augmented textbook platform.
- `App.tsx` routes one uploaded/source text into `ImmersiveReader`, `SlideDeck`, `MindMap`, `AudioPlayer`, and `Quiz`.
- It has PDF extraction in `utils/pdf.ts` and generation logic in `services/rewriter.ts`.

Reusable role:

- Product representation model: one material becomes several learning forms.
- UI reference for mode switching.
- Proof that the local machine already had a Learn Your Way style prototype before the current repo reset.

Current limitation as source for this repo:

- It is a Vite/Gemini front-end prototype, not a full product backend.
- It is representation-heavy but lacks the current repo's persistent review/run model.

### 3.2 `focus-quiz-optimized`

Path:

```text
/Users/mahaoxuan/Documents/trae_projects/focus-quiz/focus-quiz-optimized
```

Evidence:

- README defines it as a Chrome extension for cognitive pressure testing, not summarization.
- It emphasizes retrieval practice, counterfactual reasoning, transfer, hint/evidence separation, local mistake records, and Markdown export.
- `THREE_QUESTION_RATIONALE.md` frames three questions as a cold-start minimum diagnostic loop.
- `PRODUCT_STRATEGY_NEXT.md` states that the product should expose understanding gaps and link mistakes back to source text.

Reusable role:

- Practice loop: do not summarize; force active recall and check real understanding.
- Assessment taxonomy: concept boundary, logical relation, transfer.
- Evidence discipline: answer feedback should point back to the source.

Current limitation as source for this repo:

- It is article/webpage-first and Chrome-extension-first.
- It does not solve PDF-to-learning-pack or multi-representation learning by itself.

### 3.3 `AI阅读教练`

Path:

```text
/Users/mahaoxuan/Desktop/AI产品经理/实验探索/vibe-coding/AI阅读教练
```

Evidence:

- README describes a MiniMax-based AI reading assistant.
- Main features include text difficulty analysis, vocabulary explanation, personalized suggestions, reading path planning, progress tracking, and achievements.
- It has separate frontend/backend directories and service modules for text analysis, vocabulary, SRS, recommendation, analytics, and PDF parsing.

Reusable role:

- Reading-assistant product surface.
- Text analysis and recommendation vocabulary.
- Progress and SRS thinking.

Current limitation as source for this repo:

- It is closer to a general reading coach and vocabulary/progress app.
- It can easily pull the current project back into dashboard clutter if copied too broadly.

### 3.4 `cognitive-reader-(yishu-edition)`

Path:

```text
/Users/mahaoxuan/Desktop/AI产品经理/实验探索/vibe-coding/cognitive-reader-(yishu-edition)
```

Evidence:

- README is still AI Studio boilerplate.
- `project-details.md` describes a broad cognitive reader application.
- Components include editor/card/loading/error surfaces.

Reusable role:

- Early exploration around immersive/cognitive reading.
- Some interaction ideas may be reusable.

Current limitation as source for this repo:

- Product intent is generic and not yet strict enough.
- It is not the current product's strongest foundation.

### 3.5 Pixel / pet / store-readiness branches

Evidence in current repo:

- Current commit history includes app-like UI, store assets, analytics, and sample-led onboarding.
- Current docs mention Pixel guide behavior and app-store-readiness heuristics.

Reusable role:

- Motivation, character guide, retention thinking, and product packaging.

Current limitation as source for this repo:

- These concerns should stay downstream.
- If they appear before the user understands the source-to-study loop, they increase confusion.

## 4. Current Repo Role

Path:

```text
/Users/mahaoxuan/Desktop/AI产品经理/项目C-像素深度学习工作台
```

Current implementation:

- `apps/web`: Next.js product surface.
- `apps/api`: FastAPI backend.
- `data`: local uploads, OCR/cache files, SQLite data.

Current product capabilities:

- Paste or upload material.
- Parse PDF, DOCX, TXT, and MD.
- Analyze material structure.
- Generate a learning pack.
- Offer three first-release learning modes: immersive reading, structure map, understanding quiz.
- Track run progress and review plans.

Important internal mismatch:

- Backend and API names still say `course-blueprint` and `course-run`.
- Product language now says material, learning pack, representation, study mode.
- This mismatch is survivable internally but dangerous in UI copy.

## 5. Why The Product Still Feels Confusing

The confusion does not come from one button label. It comes from mixed product centers:

1. `Learn Your Way` asks the user to choose a representation of source material.
2. `Focus Quiz` asks the user to accept a short understanding test.
3. `AI阅读教练` asks the user to live inside a broader reading dashboard.
4. Pixel/store work asks the product to feel polished and retained.
5. Current API language still thinks in course runs.

When all of these are visible at once, the user sees a pile of functions instead of a task.

The correct product center should be:

```text
I brought one material.
The system extracted its structure.
Now I choose one way to study it.
Once inside that way, I stay focused until this round is done.
```

## 6. Product Principle Going Forward

### Page-level sequence must be serial

```text
Start -> Input -> Material Analysis -> Learning Pack -> One Study Mode -> Review
```

Only one step should be primary on screen.

### Inside one study mode, the interface must be focused

After the user enters a concrete learning mode, hide global workflow chrome.

Allowed elements:

- Minimal mode header.
- Current source material card, structure node, or quiz item.
- Source evidence.
- User action.
- Progress.
- One exit back to the learning pack.

Disallowed elements:

- Global workflow state cards.
- Product-introduction hero blocks.
- Store/readiness or retention panels.
- Generic coach console unless it directly changes the current card.
- Review/history while the user is inside a learning mode.

## 7. Development Intention Restated

The original useful intention should be rewritten as:

> Build a Learn Your Way style material learning converter for serious reading. A user uploads or pastes one source material, the system extracts the material's internal structure, then converts the same material into focused learning modes with source-grounded practice and review.

The project should not be judged by whether it has many modules. It should be judged by whether a first-time user can answer:

- What material am I studying?
- What did the system extract from it?
- Which learning mode am I in?
- What do I read or answer right now?
- Where is the source evidence?
- What happens after I submit?

## 8. Immediate Product Direction

1. Keep the current MVP scope to three learning modes only:
   - immersive reading
   - structure map
   - understanding quiz
2. Do not add more dashboard surfaces until these three are understandable.
3. Rename user-facing language away from course/path wording.
4. Continue migrating internals from course terminology only after user-facing confusion is fixed.
5. For every learning card, require:
   - source excerpt
   - learning goal
   - user action
   - feedback or completion state

