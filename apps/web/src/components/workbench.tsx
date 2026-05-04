"use client";

import { useEffect, useMemo, useState } from "react";

import {
  analyzeAsset,
  completeReviewPlan,
  createAsset,
  createBlueprint,
  createCourseRun,
  getCourseRun,
  listCourseRuns,
  listReviewPlans,
  requestMagicLink,
  submitEvent,
  verifyMagicLink,
} from "@/lib/api";
import type {
  Activity,
  AnalyzeResponse,
  CourseBlueprint,
  CourseRun,
  CourseRunSummary,
  LearningIntent,
  ReviewPlanItem,
  SessionResponse,
} from "@/types/api";

const sessionStorageKey = "pixel-learning-session";
const sampleText = `Abstract
This paper studies how game-based micro-learning improves long-term retention for complex reading tasks.

Introduction
Learners often finish long documents without forming a usable internal model of the argument.

Methods
We compare a linear reading condition with an interactive challenge condition and record delayed recall.

Results
The interactive condition produces stronger transfer and better explanation quality.

Discussion
The effect depends on turning claims and evidence into actions instead of summaries.`;

const productPromise = [
  {
    title: "放入一篇难读材料",
    body: "论文、报告、课程笔记都可以。先用示例文本试一遍，再换成自己的材料。",
  },
  {
    title: "得到一节互动小课",
    body: "系统会拆出论点、证据、概念和误解风险，变成一组需要回答的学习节点。",
  },
  {
    title: "用答题证明理解",
    body: "你不是看摘要，而是完成追问、选择题和复盘，并自动生成后续回访。",
  },
];

function flattenActivities(blueprint?: CourseBlueprint): Activity[] {
  if (!blueprint) return [];
  return blueprint.chapters.flatMap((chapter) => chapter.activities);
}

function formatIntent(intent: LearningIntent): string {
  return intent === "deep_read" ? "深度解读" : intent === "logic_breakdown" ? "逻辑拆解" : "课程化学习";
}

function formatFacet(facet: string): string {
  const labels: Record<string, string> = {
    problem: "问题",
    claim: "主张",
    method: "方法",
    evidence: "证据",
    counterfactual: "反事实",
    boundary: "边界",
    transfer: "迁移",
    premise: "前提",
    concept: "概念",
    dependency: "依赖",
    example: "例子",
    misconception: "误解",
  };
  return labels[facet] ?? facet;
}

function relativeDue(dateString: string): string {
  const diff = new Date(dateString).getTime() - Date.now();
  const hours = Math.round(diff / 1000 / 60 / 60);
  if (hours <= 0) return "已到期";
  if (hours < 24) return `${hours} 小时后`;
  return `${Math.round(hours / 24)} 天后`;
}

function formatActivityType(type: string): string {
  const labels: Record<string, string> = {
    scene: "剧情",
    explain: "讲解",
    probe: "追问",
    challenge: "挑战",
    reflect: "复盘",
  };
  return labels[type] ?? type;
}

export function LearningWorkbench() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [email, setEmail] = useState("learner@example.com");
  const [magicPreview, setMagicPreview] = useState<{ token: string; link: string } | null>(null);
  const [inputText, setInputText] = useState(sampleText);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [blueprint, setBlueprint] = useState<CourseBlueprint | null>(null);
  const [activeRun, setActiveRun] = useState<CourseRun | null>(null);
  const [runs, setRuns] = useState<CourseRunSummary[]>([]);
  const [reviewPlans, setReviewPlans] = useState<ReviewPlanItem[]>([]);
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium");
  const [freeTextAnswer, setFreeTextAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const activities = useMemo(() => flattenActivities(activeRun?.blueprint), [activeRun]);
  const currentActivity = activeRun ? activities[activeRun.current_activity_index] ?? null : null;
  const progressRatio = activeRun && activities.length > 0 ? activeRun.current_activity_index / activities.length : 0;
  const currentRubricFacets = currentActivity?.rubric?.required_facets ?? [];
  const currentRubricKeywords = currentActivity?.rubric?.expected_keywords ?? currentActivity?.expected_keywords ?? [];
  const incompleteRuns = runs.filter((run) => run.course_status !== "completed");
  const nextStep = !session
    ? "一键试用"
    : !activeRun
      ? "生成或继续课程"
      : currentActivity
        ? `${formatActivityType(currentActivity.type)}：${currentActivity.title}`
        : "查看复习计划";

  async function refreshDashboard(token = session?.session_token) {
    if (!token) return;
    const [nextRuns, nextReviews] = await Promise.all([listCourseRuns(token), listReviewPlans(token)]);
    setRuns(nextRuns);
    setReviewPlans(nextReviews);
  }

  async function completeLogin(token: string) {
    const verified = await verifyMagicLink(token);
    setSession(verified);
    localStorage.setItem(sessionStorageKey, JSON.stringify(verified));
    setMagicPreview(null);
    setInfoMessage(`欢迎回来，${verified.user.display_name}。`);
    await refreshDashboard(verified.session_token);
  }

  useEffect(() => {
    const cached = window.localStorage.getItem(sessionStorageKey);
    if (cached) {
      try {
        setSession(JSON.parse(cached) as SessionResponse);
      } catch {
        window.localStorage.removeItem(sessionStorageKey);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const magic = params.get("magic");
    if (magic) {
      verifyMagicLink(magic)
        .then(async (verified) => {
          setSession(verified);
          localStorage.setItem(sessionStorageKey, JSON.stringify(verified));
          setMagicPreview(null);
          setInfoMessage(`欢迎回来，${verified.user.display_name}。`);
          const [nextRuns, nextReviews] = await Promise.all([
            listCourseRuns(verified.session_token),
            listReviewPlans(verified.session_token),
          ]);
          setRuns(nextRuns);
          setReviewPlans(nextReviews);
        })
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "登录失败"));
      params.delete("magic");
      window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    Promise.all([listCourseRuns(session.session_token), listReviewPlans(session.session_token)])
      .then(([nextRuns, nextReviews]) => {
        setRuns(nextRuns);
        setReviewPlans(nextReviews);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "读取学习历史失败"));
  }, [session]);

  async function selectRun(runId: string) {
    if (!session) return;
    try {
      const run = await getCourseRun(runId, session.session_token);
      setActiveRun(run);
      setBlueprint(run.blueprint);
      setInfoMessage(`已切换到课程：${run.title}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取课程失败");
    }
  }

  async function handleRequestMagicLink() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await requestMagicLink(email);
      setMagicPreview({ token: response.preview_token, link: response.preview_link });
      setInfoMessage("开发模式下，magic link 已直接生成。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "发送 magic link 失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStartDemo() {
    setIsBusy(true);
    setError(null);
    try {
      const trialEmail = email.trim() || "learner@example.com";
      setEmail(trialEmail);
      const response = await requestMagicLink(trialEmail);
      setMagicPreview({ token: response.preview_token, link: response.preview_link });
      await completeLogin(response.preview_token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "启动试用失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerateCourse(intentOverride?: LearningIntent) {
    if (!session) return;
    setIsBusy(true);
    setError(null);
    try {
      const asset = await createAsset({ text: selectedFile ? undefined : inputText, file: selectedFile ?? undefined }, session.session_token);
      const analyzed = await analyzeAsset(asset.asset_id, session.session_token);
      setAnalyzeResult(analyzed);
      const intent = intentOverride ?? analyzed.recommended_intent;
      const blueprintResponse = await createBlueprint(asset.asset_id, intent, session.session_token);
      setBlueprint(blueprintResponse.blueprint);
      const run = await createCourseRun(asset.asset_id, intent, blueprintResponse.blueprint, session.session_token);
      setActiveRun(run);
      setFreeTextAnswer("");
      setSelectedChoice(null);
      setInfoMessage("课程已生成。先做理解验证，而不是直接读总结。");
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成课程失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSubmitCurrentActivity() {
    if (!session || !activeRun || !currentActivity) return;
    setIsBusy(true);
    setError(null);
    try {
      const answer =
        currentActivity.type === "challenge"
          ? { selected_index: selectedChoice ?? -1 }
          : currentActivity.type === "probe" || currentActivity.type === "reflect"
            ? { text: freeTextAnswer }
            : {};

      const response = await submitEvent(
        activeRun.id,
        {
          activity_id: currentActivity.id,
          activity_type: currentActivity.type,
          answer,
          confidence,
          duration_seconds: 45,
        },
        session.session_token,
      );
      setActiveRun(response.course_run);
      setBlueprint(response.course_run.blueprint);
      setFreeTextAnswer("");
      setSelectedChoice(null);
      setInfoMessage(response.result.feedback);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "提交失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCompleteReviewPlan(reviewId: string) {
    if (!session) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = await completeReviewPlan(reviewId, session.session_token);
      setInfoMessage(result.message);
      await refreshDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "完成复习失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleResumeLatestRun() {
    const nextRun = incompleteRuns[0] ?? runs[0];
    if (!nextRun) return;
    await selectRun(nextRun.id);
  }

  function resetSession() {
    setSession(null);
    setMagicPreview(null);
    setAnalyzeResult(null);
    setBlueprint(null);
    setActiveRun(null);
    setRuns([]);
    setReviewPlans([]);
    localStorage.removeItem(sessionStorageKey);
  }

  return (
    <main className="app-shell">
      <section className="hero-strip">
        <div>
          <p className="eyebrow">PIXEL LEARNING WORKBENCH</p>
          <h1>把论文与长文，变成会逼你理解的像素课程。</h1>
          <p className="hero-copy">
            这不是摘要工具。它更像一个陪你读论文的练习教练：先拆材料，再出题追问，最后安排复习。
          </p>
          <div className="promise-grid" aria-label="产品能做什么">
            {productPromise.map((item, index) => (
              <article key={item.title} className="promise-card">
                <span>{index + 1}</span>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <div className="journey-rail" aria-label="试用路径">
            <span className={!session ? "active" : ""}>1 进入</span>
            <span className={session && !activeRun ? "active" : ""}>2 建课</span>
            <span className={activeRun && currentActivity ? "active" : ""}>3 验证</span>
            <span className={reviewPlans.length ? "active" : ""}>4 回访</span>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span>你要放进去</span>
            <strong>论文 / 长文</strong>
          </div>
          <div className="stat-card">
            <span>你会拿到</span>
            <strong>互动小课</strong>
          </div>
          <div className="stat-card">
            <span>当前下一步</span>
            <strong>{nextStep}</strong>
          </div>
        </div>
      </section>

      {!session ? (
        <section className="login-shell panel">
          <div className="login-copy">
            <p className="eyebrow">MAGIC LINK ACCESS</p>
            <h2>进入你的学习工作台</h2>
            <p>先进入工作台，系统才可以记住你的课程进度、答题结果和 D+1 / D+3 / D+7 回访。</p>
            <div className="trial-note">
              <strong>最快路径</strong>
              <span>直接点“一键试用”。不用收邮件，开发模式会自动完成登录。</span>
            </div>
          </div>
          <div className="login-form">
            <label htmlFor="email">邮箱</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            <button className="pixel-button" disabled={isBusy} onClick={handleStartDemo}>
              {isBusy ? "进入中..." : "一键试用"}
            </button>
            <button className="pixel-button" disabled={!email || isBusy} onClick={handleRequestMagicLink}>
              {isBusy ? "生成中..." : "发送 magic link"}
            </button>
            {magicPreview ? (
              <div className="magic-preview">
                <p>开发模式链接已生成。</p>
                <button className="secondary-button" onClick={() => completeLogin(magicPreview.token)}>
                  直接登录
                </button>
                <a href={magicPreview.link} target="_blank" rel="noreferrer">
                  在新标签打开
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <header className="toolbar">
            <div>
              <p className="eyebrow">WELCOME BACK</p>
              <h2>{session.user.display_name} 的像素学习工作台</h2>
            </div>
            <div className="toolbar-meta">
              <span>{session.user.email}</span>
              {runs.length ? (
                <button className="secondary-button" onClick={handleResumeLatestRun} disabled={isBusy}>
                  继续学习
                </button>
              ) : null}
              <button className="secondary-button" onClick={resetSession}>
                退出
              </button>
            </div>
          </header>

          {error ? <div className="status-banner error-banner">{error}</div> : null}
          {infoMessage ? <div className="status-banner info-banner">{infoMessage}</div> : null}

          <div className="workspace-grid">
            <section className="panel input-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">UPLOAD / PASTE</p>
                  <h3>第一步：放入你想读懂的材料</h3>
                </div>
                <button className="secondary-button" onClick={() => setInputText(sampleText)}>
                  加载示例
                </button>
              </div>
              <div className="next-action-card">
                <strong>你现在只需要做一件事</strong>
                <span>保留示例文本，点击下方按钮。跑通后，再粘贴自己的论文、报告或课程笔记。</span>
              </div>
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="粘贴论文、长文或课程笔记..."
                disabled={Boolean(selectedFile)}
              />
              <label className="file-picker">
                <span>{selectedFile ? `已选择：${selectedFile.name}` : "或者上传 PDF / DOCX / TXT / MD"}</span>
                <input type="file" accept=".pdf,.docx,.txt,.md" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
              </label>
              {selectedFile ? (
                <button className="secondary-button compact-button" onClick={() => setSelectedFile(null)} disabled={isBusy}>
                  清除文件，改用粘贴文本
                </button>
              ) : null}
              <div className="intent-hints">
                <span>论文：拆论点和证据</span>
                <span>报告：抓结论和边界</span>
                <span>笔记：变成练习课</span>
              </div>
              <button className="pixel-button" disabled={isBusy || (!selectedFile && inputText.trim().length < 80)} onClick={() => handleGenerateCourse()}>
                {isBusy ? "生成中..." : "把这段材料变成练习课"}
              </button>
            </section>

            <section className="panel studio-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">COURSE STUDIO</p>
                  <h3>第二步：确认系统怎么拆这份材料</h3>
                </div>
              </div>
              {analyzeResult ? (
                <>
                  <div className="meta-grid">
                    <div className="meta-card">
                      <span>材料类型</span>
                      <strong>{analyzeResult.parsed_document.doc_type_guess}</strong>
                    </div>
                    <div className="meta-card">
                      <span>推荐模式</span>
                      <strong>{formatIntent(analyzeResult.recommended_intent)}</strong>
                    </div>
                    <div className="meta-card">
                      <span>解析策略</span>
                      <strong>{analyzeResult.parsed_document.parse_strategy}</strong>
                    </div>
                  </div>
                  {analyzeResult.follow_up_question ? <p className="follow-up">{analyzeResult.follow_up_question}</p> : null}
                  <div className="toggle-row">
                    {(["deep_read", "logic_breakdown", "course_learning"] as LearningIntent[]).map((intent) => (
                      <button key={intent} className="intent-toggle" onClick={() => handleGenerateCourse(intent)} disabled={isBusy}>
                        {formatIntent(intent)}
                      </button>
                    ))}
                  </div>
                  {blueprint ? (
                    <>
                      <div className="blueprint-cover">
                        <h4>{blueprint.title}</h4>
                        <p>{blueprint.cover.hook}</p>
                        <div className="chip-row">
                          <span>{blueprint.cover.chapter_count} 章</span>
                          <span>{blueprint.cover.activity_count} 个节点</span>
                          <span>{blueprint.cover.estimated_minutes} 分钟</span>
                        </div>
                      </div>
                      <div className="chapter-stack">
                        {blueprint.chapters.map((chapter) => (
                          <article key={chapter.id} className="chapter-card">
                            <header>
                              <strong>{chapter.title}</strong>
                              <span>{chapter.theme}</span>
                            </header>
                            <p>{chapter.activities.map((activity) => activity.type).join(" -> ")}</p>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <p className="empty-state">生成后，这里会显示它把材料识别成什么、建议用什么学习方式、会拆成几章几道练习。</p>
              )}
            </section>

            <section className="panel play-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">PLAY / LEARN</p>
                  <h3>第三步：回答问题，证明自己真的懂了</h3>
                </div>
              </div>
              {activeRun && currentActivity ? (
                <>
                  <div className="progress-strip">
                    <div className="progress-bar">
                      <div style={{ width: `${Math.min(100, Math.round(progressRatio * 100))}%` }} />
                    </div>
                    <span>
                      {Math.min(activeRun.current_activity_index + 1, activities.length)} / {activities.length}
                    </span>
                    <span className="status-pill">{activeRun.course_status === "completed" ? "已完成" : "学习中"}</span>
                  </div>
                  <div className="cat-console">
                    <div className="cat-avatar">
                      <span>ฅ</span>
                    </div>
                    <div>
                      <p className="cat-role">像素小猫 / 学习引导角色</p>
                      <p>{activeRun.latest_guide_message}</p>
                    </div>
                  </div>
                  <div className="activity-card">
                    <span className="activity-type">{formatActivityType(currentActivity.type)}</span>
                    <h4>{currentActivity.title}</h4>
                    <p>{currentActivity.body}</p>
                    {currentActivity.rubric?.passing_note ? <p className="learning-note">{currentActivity.rubric.passing_note}</p> : null}
                    {currentRubricFacets.length || currentRubricKeywords.length ? (
                      <div className="rubric-box">
                        {currentRubricFacets.length ? (
                          <div>
                            <span>检验面向</span>
                            <div className="chip-row">
                              {currentRubricFacets.map((facet) => (
                                <span key={facet}>{formatFacet(facet)}</span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {currentRubricKeywords.length ? (
                          <div>
                            <span>关键词线索</span>
                            <div className="chip-row">
                              {currentRubricKeywords.map((keyword) => (
                                <span key={keyword}>{keyword}</span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {currentActivity.key_points?.length ? (
                      <ul className="key-point-list">
                        {currentActivity.key_points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    ) : null}
                    {currentActivity.type === "challenge" ? (
                      <div className="choice-grid">
                        {currentActivity.choices?.map((choice, index) => (
                          <button key={choice} className={selectedChoice === index ? "choice-button selected" : "choice-button"} onClick={() => setSelectedChoice(index)}>
                            <span>{String.fromCharCode(65 + index)}</span>
                            {choice}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {currentActivity.type === "probe" || currentActivity.type === "reflect" ? (
                      <textarea value={freeTextAnswer} onChange={(event) => setFreeTextAnswer(event.target.value)} placeholder="请重建逻辑、证据和边界，而不是只写总结。" />
                    ) : null}
                    <div className="confidence-row">
                      <span>当前把握</span>
                      {(["low", "medium", "high"] as const).map((item) => (
                        <button key={item} className={confidence === item ? "confidence-pill active" : "confidence-pill"} onClick={() => setConfidence(item)}>
                          {item}
                        </button>
                      ))}
                    </div>
                    <button
                      className="pixel-button"
                      disabled={
                        isBusy ||
                        (currentActivity.type === "challenge" && selectedChoice === null) ||
                        ((currentActivity.type === "probe" || currentActivity.type === "reflect") && freeTextAnswer.trim().length < 12)
                      }
                      onClick={handleSubmitCurrentActivity}
                    >
                      提交本步学习结果
                    </button>
                  </div>
                </>
              ) : activeRun && activeRun.course_status === "completed" ? (
                <p className="empty-state">这轮课程已完成。右侧已经生成回访计划，下一步是复盘与迁移，而不是停在总结。</p>
              ) : (
                <p className="empty-state">生成课程后，这里会直接出现第一个学习节点。你需要选择、回答或复盘，系统会根据结果推进进度。</p>
              )}
            </section>

            <section className="panel review-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">REVIEW / HISTORY</p>
                  <h3>第四步：回来复习，不让理解消失</h3>
                </div>
              </div>
              <div className="review-columns">
                <div>
                  <h4>历史课程</h4>
                  <div className="history-list">
                    {runs.length ? (
                      runs.map((run) => (
                        <button key={run.id} className="history-card" onClick={() => selectRun(run.id)}>
                          <strong>{run.title}</strong>
                          <span>{formatIntent(run.intent)}</span>
                          <span>{run.course_status === "completed" ? "已完成" : `进行到 ${run.current_activity_index + 1} 步`}</span>
                        </button>
                      ))
                    ) : (
                      <p className="empty-state small">还没有历史课程。</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4>复习计划</h4>
                  <div className="history-list">
                    {reviewPlans.length ? (
                      reviewPlans.map((plan) => (
                        <div key={plan.id} className="review-card">
                          <strong>{plan.title}</strong>
                          <span>{plan.stage_label}</span>
                          <span>{relativeDue(plan.due_at)}</span>
                          <p>{plan.guide_message}</p>
                          <button className="secondary-button" onClick={() => handleCompleteReviewPlan(plan.id)} disabled={plan.status === "completed" || isBusy}>
                            {plan.status === "completed" ? "已完成" : "标记完成"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state small">课程结束后，会自动生成 D+1 / D+3 / D+7 回访。</p>
                    )}
                  </div>
                </div>
              </div>
              {activeRun ? (
                <div className="mastery-box">
                  <h4>掌握度快照</h4>
                  {activeRun.mastery_state.skills.map((skill) => (
                    <div key={skill.id} className="mastery-row">
                      <div>
                        <strong>{skill.id}</strong>
                        <p>{skill.label}</p>
                      </div>
                      <div className="mastery-meter">
                        <div style={{ width: `${Math.round(skill.current_mastery * 100)}%` }} />
                      </div>
                      <span>{Math.round(skill.current_mastery * 100)}%</span>
                    </div>
                  ))}
                  {activeRun.mastery_state.last_result ? (
                    <div className="last-result">
                      <strong>{activeRun.mastery_state.last_result.is_correct ? "最近一步通过" : "最近一步需要重试"}</strong>
                      <p>{activeRun.mastery_state.last_result.feedback}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
