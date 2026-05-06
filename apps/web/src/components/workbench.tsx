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
  recordProductEvent,
  submitEvent,
  verifyMagicLink,
} from "@/lib/api";
import type {
  Activity,
  ActivityType,
  AnalyzeResponse,
  CourseBlueprint,
  CourseRun,
  CourseRunSummary,
  LearningIntent,
  ProductEventName,
  ReviewPlanItem,
  SessionResponse,
} from "@/types/api";

const sessionStorageKey = "pixel-learning-session";
type WorkbenchStage = "input" | "analysis" | "learning_pack" | "study_mode" | "review";
type LearningModeId = "immersive_reading" | "structure_map" | "quiz";
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
    title: "输入一份材料",
    body: "粘贴长文，或上传 PDF / DOCX / TXT / MD。系统先把它当作学习对象，而不是让你先填复杂表单。",
  },
  {
    title: "检索材料内部结构",
    body: "系统会抽出论点、证据、概念、问题目标和容易误解的地方，让你先看见它读到了什么。",
  },
  {
    title: "转成学习形态",
    body: "再把同一份材料转换成沉浸阅读、结构图、理解测验和后续复习计划。",
  },
  {
    title: "跟着练习复习",
    body: "你需要回答、选择和复盘。系统根据结果推进下一步，并留下后续回访。",
  },
];

function flattenActivities(blueprint?: CourseBlueprint): Activity[] {
  if (!blueprint) return [];
  return blueprint.chapters.flatMap((chapter) => chapter.activities);
}

function formatIntent(intent: LearningIntent): string {
  return intent === "deep_read" ? "深度解读" : intent === "logic_breakdown" ? "逻辑拆解" : "系统学习";
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

function formatLearningMode(mode: LearningModeId | null): string {
  const labels: Record<LearningModeId, string> = {
    immersive_reading: "沉浸阅读",
    structure_map: "结构图",
    quiz: "理解测验",
  };
  return mode ? labels[mode] : "学习形态";
}

function activityInstruction(type: ActivityType): string {
  const instructions: Record<ActivityType, string> = {
    scene: "先看本卡片里的“材料原文 / 解析片段”和“系统抽出的结构”，确认这段材料在讨论什么。",
    explain: "先看材料片段，再看最小讲解，抓住一个核心结论和它的依据。",
    probe: "根据上方材料片段，用自己的话写出理解，至少 12 字；重点写逻辑、证据或边界。",
    challenge: "根据上方材料片段和结构节点选择一个答案，再提交。",
    reflect: "回看上方材料依据，写下本轮收获、卡住点或迁移场景，至少 12 字。",
  };
  return instructions[type];
}

function activitySubmitLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    scene: "我读懂了，进入下一步",
    explain: "我读懂了，进入下一步",
    probe: "提交回答并看反馈",
    challenge: "提交选择并看反馈",
    reflect: "提交复盘并生成回访",
  };
  return labels[type];
}

function formatConfidence(value: "low" | "medium" | "high"): string {
  const labels: Record<"low" | "medium" | "high", string> = {
    low: "没把握",
    medium: "一般",
    high: "有把握",
  };
  return labels[value];
}

function buildActivitySourceContext(activity: Activity | null, blueprint?: CourseBlueprint | null) {
  if (!activity) return null;
  const chapterIndex = blueprint?.chapters.findIndex((chapter) => chapter.activities.some((entry) => entry.id === activity.id)) ?? -1;
  const fallbackNode = blueprint?.learning_representation.argument_graph[Math.max(0, chapterIndex)] ?? blueprint?.learning_representation.argument_graph[0];
  const fallbackTarget = blueprint?.learning_representation.question_targets[Math.max(0, chapterIndex)] ?? blueprint?.learning_representation.question_targets[0];
  const sourceContext = activity.source_context;
  const excerpt =
    sourceContext?.material_excerpt ||
    activity.key_points?.find((point) => point.trim().length > 0) ||
    recordText(fallbackNode ?? {}, "detail", activity.body);
  const graphLabel = sourceContext?.graph_label || recordText(fallbackNode ?? {}, "label", "材料结构节点");
  const graphDetail = sourceContext?.graph_detail || recordText(fallbackNode ?? {}, "detail", "系统会把这里作为当前练习的依据。");
  const questionTarget = sourceContext?.question_target || recordText(fallbackTarget ?? {}, "prompt", "确认这一段到底需要被理解什么。");

  return {
    sectionHeading: sourceContext?.section_heading || (chapterIndex >= 0 ? blueprint?.chapters[chapterIndex]?.title : undefined) || activity.title,
    materialExcerpt: excerpt,
    graphLabel,
    graphDetail,
    questionTarget,
    whyThisStep:
      sourceContext?.why_this_step ||
      (activity.type === "challenge"
        ? "把材料结构变成一次可判定的选择，检查你有没有抓住重点。"
        : activity.type === "probe" || activity.type === "reflect"
          ? "让你用自己的话重建材料逻辑，而不是停在看过的感觉里。"
          : "先把材料里的真实内容放到眼前，再进行下一步学习动作。"),
  };
}

function shouldShowActivityBody(activity: Activity, hasSourceContext: boolean): boolean {
  if (!activity.body.trim()) return false;
  if (activity.type !== "scene") return true;
  if (!hasSourceContext) return true;
  return false;
}

function recordText(entry: Record<string, unknown>, key: string, fallback = ""): string {
  const value = entry[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string" || typeof item === "number").join("、");
  return fallback;
}

function truncateText(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}...`;
}

function metadataText(metadata: Record<string, unknown>, key: string, fallback = ""): string {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function formatGraphKind(kind: string): string {
  const labels: Record<string, string> = {
    claim: "论点",
    evidence: "证据",
    premise: "前提",
    risk: "风险",
  };
  return labels[kind] ?? kind;
}

export function LearningWorkbench() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [email, setEmail] = useState("learner@example.com");
  const [magicPreview, setMagicPreview] = useState<{ token: string; link: string } | null>(null);
  const [inputText, setInputText] = useState(sampleText);
  const [inputUrl, setInputUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [preparedAssetId, setPreparedAssetId] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [blueprint, setBlueprint] = useState<CourseBlueprint | null>(null);
  const [activeRun, setActiveRun] = useState<CourseRun | null>(null);
  const [runs, setRuns] = useState<CourseRunSummary[]>([]);
  const [reviewPlans, setReviewPlans] = useState<ReviewPlanItem[]>([]);
  const [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium");
  const [freeTextAnswer, setFreeTextAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [activeStage, setActiveStage] = useState<WorkbenchStage>("input");
  const [selectedLearningMode, setSelectedLearningMode] = useState<LearningModeId | null>(null);
  const [selectedStructureNodeId, setSelectedStructureNodeId] = useState<string | null>(null);

  const activities = useMemo(() => flattenActivities(activeRun?.blueprint), [activeRun]);
  const readingItems = useMemo(() => activities.filter((activity) => activity.type === "scene" || activity.type === "explain" || activity.type === "reflect"), [activities]);
  const quizItems = useMemo(() => activities.filter((activity) => activity.type === "probe" || activity.type === "challenge"), [activities]);
  const structureNodes = blueprint?.learning_representation.argument_graph ?? analyzeResult?.learning_representation.argument_graph ?? [];
  const conceptNodes = blueprint?.learning_representation.concept_map ?? analyzeResult?.learning_representation.concept_map ?? [];
  const questionTargets = blueprint?.learning_representation.question_targets ?? analyzeResult?.learning_representation.question_targets ?? [];
  const selectedStructureNode =
    structureNodes.find((node) => recordText(node, "id", recordText(node, "label", "")) === selectedStructureNodeId) ?? structureNodes[0] ?? null;
  const selectedStructureNodeIndex = selectedStructureNode ? Math.max(0, structureNodes.indexOf(selectedStructureNode)) : 0;
  const selectedStructureQuestion = questionTargets[selectedStructureNodeIndex] ?? questionTargets[0] ?? null;
  const learningModes = useMemo(
    () => [
      {
        id: "immersive_reading" as const,
        title: "沉浸阅读",
        description: "按材料顺序阅读关键片段，并用小检查确认自己读懂了什么。",
        itemCount: Math.max(1, readingItems.length),
        sourceCoverageLabel: blueprint ? `${blueprint.cover.chapter_count} 个材料章节` : "等待学习包",
      },
      {
        id: "structure_map" as const,
        title: "结构图",
        description: "先看系统抽出的论点、证据、概念和问题目标，再点开节点回到材料依据。",
        itemCount: blueprint?.learning_representation.argument_graph.length ?? analyzeResult?.learning_representation.argument_graph.length ?? 0,
        sourceCoverageLabel: "结构节点与原文片段",
      },
      {
        id: "quiz" as const,
        title: "理解测验",
        description: "用少量问题检查概念边界、逻辑关系和迁移理解，答完后显示材料证据。",
        itemCount: Math.max(1, quizItems.length),
        sourceCoverageLabel: blueprint ? `${blueprint.learning_representation.question_targets.length} 个可验证问题` : "等待学习包",
      },
    ],
    [analyzeResult?.learning_representation.argument_graph.length, blueprint, quizItems.length, readingItems.length],
  );
  const completedActivityIds = activeRun?.mastery_state.completed_activity_ids ?? [];
  const selectedModeActivities =
    selectedLearningMode === "immersive_reading"
      ? readingItems
      : selectedLearningMode === "quiz"
        ? quizItems
        : [];
  const currentActivity = activeRun
    ? selectedLearningMode
      ? selectedModeActivities.find((activity) => !completedActivityIds.includes(activity.id)) ?? selectedModeActivities[0] ?? null
      : activities[activeRun.current_activity_index] ?? null
    : null;
  const currentActivitySource = useMemo(
    () => buildActivitySourceContext(currentActivity, activeRun?.blueprint),
    [activeRun?.blueprint, currentActivity],
  );
  const showCurrentActivityBody = Boolean(currentActivity && shouldShowActivityBody(currentActivity, Boolean(currentActivitySource)));
  const progressRatio = activeRun && activities.length > 0 ? activeRun.current_activity_index / activities.length : 0;
  const currentRubricFacets = currentActivity?.rubric?.required_facets ?? [];
  const currentRubricKeywords = currentActivity?.rubric?.expected_keywords ?? currentActivity?.expected_keywords ?? [];
  const incompleteRuns = runs.filter((run) => run.course_status !== "completed");
  const materialTitle = analyzeResult ? metadataText(analyzeResult.parsed_document.metadata, "title", "未命名材料") : "";
  const materialSourceName = analyzeResult ? metadataText(analyzeResult.parsed_document.metadata, "source_name", "文本输入") : "";
  const materialSummary = analyzeResult
    ? truncateText(analyzeResult.parsed_document.paragraphs.slice(0, 2).join(" "), 220) || "系统还没有抽取到可展示摘要。"
    : "";
  const textLength = inputText.trim().length;
  const trimmedUrl = inputUrl.trim();
  const hasUrl = /^https?:\/\/\S+\.\S+/.test(trimmedUrl);
  const canUseMaterial = Boolean(selectedFile) || hasUrl || inputText.trim().length >= 80;
  const canSubmitCurrentActivity =
    Boolean(activeRun && currentActivity) &&
    !isBusy &&
    (currentActivity?.type === "challenge"
      ? selectedChoice !== null
      : currentActivity?.type === "probe" || currentActivity?.type === "reflect"
        ? freeTextAnswer.trim().length >= 12
        : true);
  const materialReadiness = selectedFile
    ? { title: "文件已就绪", detail: selectedFile.name }
    : hasUrl
      ? { title: "网页已就绪", detail: trimmedUrl }
      : trimmedUrl
        ? { title: "网页地址待确认", detail: "请使用 http:// 或 https:// 开头的完整网址" }
        : textLength >= 80
          ? { title: "文本已就绪", detail: `${textLength} 字，可以开始解析` }
          : textLength > 0
            ? { title: "文本偏短", detail: `当前 ${textLength} 字，至少需要 80 字` }
            : { title: "等待材料", detail: "粘贴文本、输入网页地址或上传文件" };
  const stageAvailability: Record<WorkbenchStage, boolean> = {
    input: Boolean(session),
    analysis: Boolean(session && analyzeResult),
    learning_pack: Boolean(session && activeRun),
    study_mode: Boolean(session && activeRun && selectedLearningMode),
    review: Boolean(session && (reviewPlans.length || activeRun?.course_status === "completed" || runs.some((run) => run.course_status === "completed"))),
  };
  const nextStep = (() => {
    if (!session) return "打开示例材料";
    if (activeRun?.course_status === "completed") return "查看复习";
    if (!analyzeResult) return "输入并解析材料";
    if (!activeRun) return "生成学习包";
    if (!selectedLearningMode) return "选择一种学习形态";
    if (selectedLearningMode === "structure_map") return "查看结构图并选择下一种学习形态";
    if (currentActivity) return `完成本步学习：${currentActivity.title}`;
    return "查看复习";
  })();
  const workflowStatus = [
    {
      stage: "input" as const,
      label: "输入材料",
      body: selectedFile ? selectedFile.name : hasUrl ? trimmedUrl : inputText.trim() ? `${inputText.trim().length} 字文本` : "等待材料",
      intent: "把原始材料交给系统，先不生成内容。",
      action: "粘贴文本、输入网页地址，或上传 PDF / DOCX / TXT / MD。",
      done: "材料来源有效，按钮变为可解析。",
      proof: "输入状态会显示文本已就绪、网页已就绪或文件已就绪。",
      state: session ? (analyzeResult || activeRun ? "done" : "active") : "pending",
    },
    {
      stage: "analysis" as const,
      label: "材料分析",
      body: analyzeResult
        ? `${analyzeResult.learning_representation.argument_graph.length} 个结构节点`
        : activeRun
          ? "历史学习包已生成"
          : "解析后显示论点、证据和概念",
      intent: "让用户先看到系统从材料里读出了什么。",
      action: "检查标题、摘要、来源、结构节点、问题目标和误解风险。",
      done: "你能判断这份材料是否被正确理解，再决定生成学习包。",
      proof: "页面会显示材料封面、关键词、结构节点和可练习问题。",
      state: analyzeResult ? (activeRun ? "done" : "active") : activeRun ? "done" : "pending",
    },
    {
      stage: "learning_pack" as const,
      label: "学习包",
      body: activeRun
        ? `3 种形态 / ${activities.length} 个学习项`
        : analyzeResult
          ? "可生成阅读、结构图和测验"
          : "等待材料分析",
      intent: "把同一份材料转换成几种可学习形态。",
      action: "选择沉浸阅读、结构图或理解测验中的一种进入。",
      done: "学习包显示三种形态，并且每种都说明来源覆盖和学习项数量。",
      proof: "学习形态卡会显示学习项数量、用途和进入按钮。",
      state: activeRun ? (selectedLearningMode ? "done" : "active") : analyzeResult ? "active" : "pending",
    },
    {
      stage: "study_mode" as const,
      label: "开始学习",
      body: !selectedLearningMode
        ? "先选择一种学习形态"
        : currentActivity
        ? `${formatLearningMode(selectedLearningMode)}：${activitySubmitLabel(currentActivity.type)}`
        : selectedLearningMode === "structure_map"
          ? "结构图：点节点看材料依据"
        : blueprint
          ? `${formatLearningMode(selectedLearningMode)} 已就绪`
          : "等待学习包",
      intent: "只进入一种学习形态，避免把所有功能堆给用户。",
      action: "按当前卡片要求阅读、点结构节点、选择答案或写短答。",
      done: "当前卡显示原文依据、学习目标、用户动作和提交反馈。",
      proof: "学习卡片会显示来源片段、检查目标、操作按钮和反馈结果。",
      state: activeRun ? (selectedLearningMode ? "active" : "pending") : "pending",
    },
    {
      stage: "review" as const,
      label: "复习回访",
      body: reviewPlans.length ? "查看复习计划" : activeRun?.course_status === "completed" ? "查看掌握度" : "学习完成后出现",
      intent: "把错题、低把握和弱概念变成下一次复习任务。",
      action: "查看为什么复习这些，再按 D+1 / D+3 / D+7 回访。",
      done: "复习卡显示原因，而不是只给一个日期。",
      proof: "复习计划会显示“为什么复习这些”和对应原因。",
      state: reviewPlans.length || activeRun?.course_status === "completed" ? "active" : activeRun ? "pending" : "pending",
    },
  ];
  const activeWorkflowStep = workflowStatus.find((step) => step.stage === activeStage) ?? workflowStatus[0];
  const isFocusedStudyMode = Boolean(session && activeStage === "study_mode" && activeRun && selectedLearningMode);
  const primaryCommand: {
    label: string;
    title: string;
    body: string;
    onSelect?: () => void | Promise<void>;
    disabled?: boolean;
  } = !session
    ? {
        label: isBusy ? "正在准备..." : "打开示例材料",
        title: "先看系统如何检索一份材料",
        body: "不需要先配置账号。先看材料结构，再决定是否生成学习包。",
        onSelect: handleOpenSampleCourse,
        disabled: isBusy,
      }
    : activeRun?.course_status === "completed"
      ? {
          label: "查看复习",
          title: "这轮学习已完成",
          body: reviewPlans.length ? "后续回访已经生成，下一步是按计划复习。" : "等待新的材料或历史学习包。",
          onSelect: () => setActiveStage("review"),
        }
    : selectedLearningMode === "structure_map" && activeRun
      ? {
          label: "进入理解测验",
          title: "当前任务：看懂材料结构",
          body: "先点结构节点，看它对应的材料片段、结构角色和检查问题；看懂后进入测验验证。",
          onSelect: () => {
            setSelectedLearningMode("quiz");
            setActiveStage("study_mode");
          },
        }
    : currentActivity && selectedLearningMode
      ? {
          label: activitySubmitLabel(currentActivity.type),
          title: `当前任务：完成这一小步`,
          body: activityInstruction(currentActivity.type),
          onSelect: handleSubmitCurrentActivity,
          disabled: !canSubmitCurrentActivity,
        }
      : !analyzeResult
      ? {
          label: isBusy ? "解析中..." : "解析材料",
          title: "当前任务：让系统读材料",
          body: materialReadiness.detail,
          onSelect: handleAnalyzeMaterial,
          disabled: isBusy || !canUseMaterial,
        }
      : !activeRun
        ? {
            label: isBusy ? "生成中..." : "生成学习包",
            title: "当前任务：把材料转成学习包",
            body: `${analyzeResult.learning_representation.argument_graph.length} 个结构节点已就绪，可以生成阅读、结构图和测验。`,
            onSelect: () => handleGenerateCourse(),
            disabled: isBusy,
          }
        : !selectedLearningMode
          ? {
              label: "选择学习形态",
              title: "当前任务：选择一种学习方式",
              body: "学习包已经生成。先选沉浸阅读、结构图或理解测验，不要直接掉进一堆卡片。",
              onSelect: () => setActiveStage("learning_pack"),
            }
          : {
              label: "继续学习",
              title: "当前任务：继续当前学习形态",
              body: currentActivity ? activityInstruction(currentActivity.type) : "学习项已经完成。",
              onSelect: () => setActiveStage("study_mode"),
            };

  async function refreshDashboard(token = session?.session_token) {
    if (!token) return;
    const [nextRuns, nextReviews] = await Promise.all([listCourseRuns(token), listReviewPlans(token)]);
    setRuns(nextRuns);
    setReviewPlans(nextReviews);
  }

  async function trackProductEvent(eventName: ProductEventName, payload: Record<string, unknown> = {}, token = session?.session_token) {
    if (!token) return;
    try {
      await recordProductEvent(eventName, payload, token);
    } catch {
      // Analytics must never block the learning flow.
    }
  }

  async function completeLogin(token: string) {
    const verified = await verifyMagicLink(token);
    setSession(verified);
    setActiveStage("input");
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
          setActiveStage("input");
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
      setSelectedLearningMode(null);
      setActiveStage(run.course_status === "completed" ? "review" : "learning_pack");
      setInfoMessage(`已切换到学习包：${run.title}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取学习包失败");
    }
  }

  async function handleRequestMagicLink() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await requestMagicLink(email);
      setMagicPreview({ token: response.preview_token, link: response.preview_link });
      setInfoMessage("本地登录链接已生成。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成本地登录链接失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function createCourseFromSource(
    token: string,
    intentOverride?: LearningIntent,
    source: { text?: string; url?: string; file?: File | null } = {},
  ) {
    const prepared = await prepareMaterialFromSource(token, source);
    await createLearningPathFromPrepared(token, prepared.assetId, prepared.analyzed, intentOverride);
  }

  async function prepareMaterialFromSource(token: string, source: { text?: string; url?: string; file?: File | null } = {}) {
    const file = source.file === undefined ? selectedFile : source.file;
    const url = file ? undefined : source.url ?? (trimmedUrl ? trimmedUrl : undefined);
    const text = file || url ? undefined : source.text ?? inputText;
    const asset = await createAsset({ text, url, file: file ?? undefined }, token);
    const analyzed = await analyzeAsset(asset.asset_id, token);
    setPreparedAssetId(asset.asset_id);
    setAnalyzeResult(analyzed);
    setBlueprint(null);
    setActiveRun(null);
    setSelectedLearningMode(null);
    setActiveStage("analysis");
    setFreeTextAnswer("");
    setSelectedChoice(null);
    return { assetId: asset.asset_id, analyzed };
  }

  async function createLearningPathFromPrepared(
    token: string,
    assetId: string,
    analyzed: AnalyzeResponse,
    intentOverride?: LearningIntent,
  ) {
    const intent = intentOverride ?? analyzed.recommended_intent;
    const blueprintResponse = await createBlueprint(assetId, intent, token);
    setBlueprint(blueprintResponse.blueprint);
    const run = await createCourseRun(assetId, intent, blueprintResponse.blueprint, token);
    setActiveRun(run);
    setSelectedLearningMode(null);
    setActiveStage("learning_pack");
    setFreeTextAnswer("");
    setSelectedChoice(null);
    await refreshDashboard(token);
  }

  function clearPreparedMaterial() {
    setPreparedAssetId(null);
    setAnalyzeResult(null);
    setBlueprint(null);
    setActiveRun(null);
    setSelectedLearningMode(null);
    setActiveStage("input");
    setFreeTextAnswer("");
    setSelectedChoice(null);
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

  async function handleOpenSampleCourse() {
    setIsBusy(true);
    setError(null);
    try {
      const trialEmail = email.trim() || "learner@example.com";
      setEmail(trialEmail);
      setInputText(sampleText);
      setInputUrl("");
      setSelectedFile(null);
      const response = await requestMagicLink(trialEmail);
      const verified = await verifyMagicLink(response.preview_token);
      setSession(verified);
      setActiveStage("input");
      localStorage.setItem(sessionStorageKey, JSON.stringify(verified));
      setMagicPreview(null);
      await trackProductEvent("first_run_sample_started", { entry: "sample_course" }, verified.session_token);
      const prepared = await prepareMaterialFromSource(verified.session_token, { text: sampleText, file: null });
      setInfoMessage(
        `示例材料已解析：系统检索到 ${prepared.analyzed.learning_representation.argument_graph.length} 个结构节点。下一步你可以生成学习包。`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "打开示例材料失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerateCourse(intentOverride?: LearningIntent) {
    if (!session) return;
    setIsBusy(true);
    setError(null);
    try {
      if (preparedAssetId && analyzeResult) {
        await createLearningPathFromPrepared(session.session_token, preparedAssetId, analyzeResult, intentOverride);
      } else {
        await createCourseFromSource(session.session_token, intentOverride);
      }
      setInfoMessage("学习包已生成。请选择沉浸阅读、结构图或理解测验。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成学习包失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAnalyzeMaterial() {
    if (!session) return;
    setIsBusy(true);
    setError(null);
    try {
      const prepared = await prepareMaterialFromSource(session.session_token);
      setInfoMessage(
        `材料已解析：检索到 ${prepared.analyzed.learning_representation.argument_graph.length} 个结构节点、${prepared.analyzed.learning_representation.question_targets.length} 个可练习问题。`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "解析材料失败");
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
      if (response.course_run.course_status === "completed") {
        setActiveStage("review");
      } else {
        setActiveStage("study_mode");
      }
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
      setActiveStage("review");
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
    setInputUrl("");
    setSelectedFile(null);
    setPreparedAssetId(null);
    setAnalyzeResult(null);
    setBlueprint(null);
    setActiveRun(null);
    setSelectedLearningMode(null);
    setRuns([]);
    setReviewPlans([]);
    setActiveStage("input");
    localStorage.removeItem(sessionStorageKey);
  }

  return (
    <main className={isFocusedStudyMode ? "app-shell focus-study-shell" : "app-shell"}>
      {!session ? (
        <section className="hero-strip">
          <div>
            <p className="eyebrow">MATERIAL LEARNING CONVERTER</p>
            <h1>把 PDF、报告和长文，转换成可学习的学习包。</h1>
            <p className="hero-copy">
              这个产品的主线很简单：你输入材料，系统先检索材料内部的论点、证据和概念，再把它们变成追问、测验、复盘和复习计划。
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
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <span>最快开始</span>
              <strong>打开示例材料</strong>
            </div>
            <div className="stat-card">
              <span>也可以</span>
              <strong>粘贴自己的材料</strong>
            </div>
            <div className="stat-card">
              <span>当前下一步</span>
              <strong>{nextStep}</strong>
            </div>
          </div>
        </section>
      ) : isFocusedStudyMode ? null : (
        <section className="workspace-intro">
          <div>
            <p className="eyebrow">MATERIAL LEARNING CONVERTER</p>
            <h1>今天只做一件事：把材料变成可学习的学习包。</h1>
          </div>
          <div className="next-step-card">
            <span>当前下一步</span>
            <strong>{nextStep}</strong>
          </div>
        </section>
      )}

      {!session ? (
        <section className="login-shell panel">
          <div className="login-copy">
            <p className="eyebrow">START</p>
            <h2>先看一个完整例子</h2>
            <p>你不需要先理解所有功能。打开示例材料，先看系统如何检索结构，再亲手把它转换成阅读、结构图和测验。</p>
            <div className="trial-note">
              <strong>本地试用记录</strong>
              <span>系统会在本机保存进度，方便你退出后继续。你可以随时退出。</span>
            </div>
          </div>
          <div className="login-form">
            <button className="pixel-button primary-action" disabled={isBusy} onClick={handleOpenSampleCourse}>
              {isBusy ? "正在解析示例材料..." : "打开示例材料"}
            </button>
            <button className="secondary-button" disabled={isBusy} onClick={handleStartDemo}>
              只进入工作台
            </button>
            <details className="login-options">
              <summary>使用指定邮箱</summary>
              <label htmlFor="email">邮箱</label>
              <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              <button className="secondary-button" disabled={!email || isBusy} onClick={handleRequestMagicLink}>
                生成本地登录链接
              </button>
            </details>
            {magicPreview ? (
              <div className="magic-preview">
                <p>本地登录链接已生成。</p>
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
          {!isFocusedStudyMode ? (
            <header className="toolbar">
              <div>
                <p className="eyebrow">WELCOME BACK</p>
                <h2>{session.user.display_name} 的材料学习转换器</h2>
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
          ) : null}

          {error ? <div className="status-banner error-banner">{error}</div> : null}
          {!isFocusedStudyMode && infoMessage ? <div className="status-banner info-banner">{infoMessage}</div> : null}

          {!isFocusedStudyMode ? (
            <>
              <section className="workflow-status" aria-label="当前工作流状态">
                {workflowStatus.map((step, index) => (
                  <button
                    key={step.label}
                    className={`flow-step ${step.state} ${activeStage === step.stage ? "selected" : ""}`}
                    disabled={!stageAvailability[step.stage]}
                    onClick={() => setActiveStage(step.stage)}
                    type="button"
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step.label}</strong>
                    <p>{step.body}</p>
                    <small>意图：{step.intent}</small>
                  </button>
                ))}
              </section>

              <section className="command-bar" aria-label="当前任务">
                <div>
                  <span>当前主任务</span>
                  <strong>{primaryCommand.title}</strong>
                  <p>{primaryCommand.body}</p>
                </div>
                {primaryCommand.onSelect ? (
                  <button className="pixel-button command-button" onClick={primaryCommand.onSelect} disabled={primaryCommand.disabled}>
                    {primaryCommand.label}
                  </button>
                ) : null}
              </section>

              <section className="workflow-guide-panel" aria-label="当前步骤意图">
                <div>
                  <span>当前步骤意图</span>
                  <strong>{activeWorkflowStep.intent}</strong>
                </div>
                <div>
                  <span>用户现在要做什么</span>
                  <p>{activeWorkflowStep.action}</p>
                </div>
                <div>
                  <span>完成标准</span>
                  <p>{activeWorkflowStep.done}</p>
                </div>
                <div>
                  <span>可见证据</span>
                  <p>{activeWorkflowStep.proof}</p>
                </div>
              </section>
            </>
          ) : null}

          <div className="workspace-grid serial-workspace">
            <section className={activeStage === "input" ? "panel input-panel active-stage-panel" : "panel input-panel hidden-stage-panel"}>
              <div className="panel-head">
                <div>
                  <p className="eyebrow">1 MATERIAL INPUT</p>
                  <h3>输入你想读懂的材料</h3>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setInputText(sampleText);
                    setInputUrl("");
                    setSelectedFile(null);
                    clearPreparedMaterial();
                  }}
                >
                  加载示例
                </button>
              </div>
              <div className="next-action-card">
                <strong>这一步只做一件事</strong>
                <span>把原始材料放进来。系统下一步会先检索材料内部结构，不会直接把它伪装成一门课。</span>
              </div>
              <div className={canUseMaterial ? "material-readiness ready" : "material-readiness"}>
                <span>输入状态</span>
                <strong>{materialReadiness.title}</strong>
                <p>{materialReadiness.detail}</p>
              </div>
              <textarea
                value={inputText}
                onChange={(event) => {
                  setInputText(event.target.value);
                  if (event.target.value.trim()) setInputUrl("");
                  clearPreparedMaterial();
                }}
                placeholder="粘贴论文、长文或学习笔记..."
                disabled={Boolean(selectedFile) || hasUrl}
              />
              <label className="url-input-field" htmlFor="material-url">
                <span>或者输入网页地址</span>
                <input
                  id="material-url"
                  type="url"
                  value={inputUrl}
                  onChange={(event) => {
                    setInputUrl(event.target.value);
                    if (event.target.value.trim()) setSelectedFile(null);
                    clearPreparedMaterial();
                  }}
                  placeholder="https://example.com/article"
                  disabled={Boolean(selectedFile)}
                />
              </label>
              <label className="file-picker">
                <span>{selectedFile ? `已选择：${selectedFile.name}` : "或者上传 PDF / DOCX / TXT / MD"}</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    if (file) setInputUrl("");
                    clearPreparedMaterial();
                  }}
                />
              </label>
              {selectedFile ? (
                <button
                  className="secondary-button compact-button"
                  onClick={() => {
                    setSelectedFile(null);
                    clearPreparedMaterial();
                  }}
                  disabled={isBusy}
                >
                  清除文件，改用粘贴文本或网页
                </button>
              ) : null}
              <div className="intent-hints">
                <span>论文：拆论点和证据</span>
                <span>报告：抓结论和边界</span>
                <span>笔记：变成复习包</span>
              </div>
              <button className="pixel-button" disabled={isBusy || !canUseMaterial} onClick={handleAnalyzeMaterial}>
                {isBusy ? "解析中..." : "解析并检索这份材料"}
              </button>
              {analyzeResult ? (
                <button className="secondary-button" disabled={isBusy} onClick={() => handleGenerateCourse()}>
                  生成学习包
                </button>
              ) : null}
            </section>

            <section className={activeStage === "analysis" ? "panel studio-panel active-stage-panel" : "panel studio-panel hidden-stage-panel"}>
              <div className="panel-head">
                <div>
                  <p className="eyebrow">2 MATERIAL ANALYSIS</p>
                  <h3>系统从材料里检索到了什么</h3>
                </div>
              </div>
              {analyzeResult ? (
                <>
                  <div className="material-analysis-cover">
                    <div>
                      <span>材料标题</span>
                      <strong>{materialTitle}</strong>
                      <p>{materialSummary}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>来源</dt>
                        <dd>{materialSourceName}</dd>
                      </div>
                      <div>
                        <dt>结构</dt>
                        <dd>{analyzeResult.parsed_document.sections.length} 个段落区块</dd>
                      </div>
                      <div>
                        <dt>关键词</dt>
                        <dd>{analyzeResult.learning_representation.keywords.length} 个</dd>
                      </div>
                    </dl>
                  </div>
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
                  {analyzeResult.learning_representation.keywords.length ? (
                    <div className="source-block">
                      <h4>关键词</h4>
                      <div className="chip-row">
                        {analyzeResult.learning_representation.keywords.map((keyword) => (
                          <span key={keyword}>{keyword}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="source-block">
                    <h4>材料结构</h4>
                    <div className="source-map">
                      {analyzeResult.learning_representation.argument_graph.map((node) => {
                        const label = recordText(node, "label", "结构节点");
                        const detail = recordText(node, "detail", "等待从材料中补充细节。");
                        const kind = formatGraphKind(recordText(node, "kind", "node"));
                        return (
                          <article key={recordText(node, "id", label)} className="source-card">
                            <span>{kind}</span>
                            <strong>{label}</strong>
                            <p>{detail}</p>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                  <div className="source-block">
                    <h4>可转成的学习问题</h4>
                    <div className="question-targets">
                      {analyzeResult.learning_representation.question_targets.map((target) => (
                        <div key={recordText(target, "id", recordText(target, "prompt"))} className="question-target">
                          <strong>{recordText(target, "prompt", "待生成学习问题")}</strong>
                          <span>{recordText(target, "rubric_facets", "理解检查")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {analyzeResult.learning_representation.misconception_risks.length ? (
                    <div className="risk-box">
                      <h4>系统提醒你容易误解的地方</h4>
                      <ul>
                        {analyzeResult.learning_representation.misconception_risks.map((risk) => (
                          <li key={risk}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {analyzeResult.follow_up_question ? <p className="follow-up">{analyzeResult.follow_up_question}</p> : null}
                  <div className="format-strip">
                    <div>
                      <strong>下一步：生成学习包</strong>
                      <span>同一份材料会被转成沉浸阅读、结构图和理解测验，用户再选择一种形态进入。</span>
                    </div>
                    <button className="pixel-button compact-button" onClick={() => handleGenerateCourse()} disabled={isBusy}>
                      生成学习包
                    </button>
                  </div>
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
                <>
                  <p className="empty-state">解析材料后，这里会显示论点、证据、概念、可练习问题和误解风险。</p>
                  <div className="empty-action">
                    <button className="pixel-button compact-button" disabled={isBusy || !canUseMaterial} onClick={handleAnalyzeMaterial}>
                      解析材料
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className={activeStage === "learning_pack" ? "panel play-panel active-stage-panel" : "panel play-panel hidden-stage-panel"}>
              <div className="panel-head">
                <div>
                  <p className="eyebrow">3 LEARNING PACK</p>
                  <h3>选择这份材料的学习形态</h3>
                </div>
              </div>
              {activeRun && blueprint ? (
                <>
                  <div className="learning-pack-summary">
                    <span>学习包已生成</span>
                    <strong>{blueprint.title}</strong>
                    <p>{blueprint.cover.hook}</p>
                    <div className="chip-row">
                      <span>{blueprint.cover.chapter_count} 个章节</span>
                      <span>{blueprint.cover.activity_count} 个学习项</span>
                      <span>{blueprint.cover.estimated_minutes} 分钟</span>
                    </div>
                  </div>
                  <div className="learning-mode-grid">
                    {learningModes.map((mode) => (
                      <article key={mode.id} className={selectedLearningMode === mode.id ? "learning-mode-card selected" : "learning-mode-card"}>
                        <div>
                          <span>{mode.itemCount} 个学习项</span>
                          <strong>{mode.title}</strong>
                          <p>{mode.description}</p>
                        </div>
                        <small>{mode.sourceCoverageLabel}</small>
                        <button
                          className="pixel-button compact-button"
                          onClick={() => {
                            setSelectedLearningMode(mode.id);
                            setActiveStage("study_mode");
                          }}
                        >
                          进入{mode.title}
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="empty-state">生成学习包后，这里会显示沉浸阅读、结构图和理解测验三种形态。</p>
                  <div className="empty-action">
                    <button className="pixel-button compact-button" disabled={isBusy || !analyzeResult} onClick={() => handleGenerateCourse()}>
                      生成学习包
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className={activeStage === "study_mode" ? "panel play-panel active-stage-panel" : "panel play-panel hidden-stage-panel"}>
              {isFocusedStudyMode ? (
                <div className="focus-study-header">
                  <div>
                    <span>专注学习中</span>
                    <strong>{selectedLearningMode ? formatLearningMode(selectedLearningMode) : "学习模式"}</strong>
                    <p>
                      {selectedLearningMode === "structure_map"
                        ? "只看这份材料的结构节点、原文依据和待验证问题。"
                        : currentActivity
                          ? `当前卡片：${currentActivity.title}`
                          : blueprint?.title ?? "当前学习包"}
                    </p>
                  </div>
                  <div className="focus-study-actions">
                    {activeRun ? (
                      <span>
                        {activeRun.course_status === "completed"
                          ? "已完成"
                          : `${Math.min(activeRun.current_activity_index + 1, activities.length)} / ${activities.length}`}
                      </span>
                    ) : null}
                    <button className="secondary-button compact-button" type="button" onClick={() => setActiveStage("learning_pack")}>
                      回到学习包
                    </button>
                  </div>
                </div>
              ) : (
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">4 STUDY MODE</p>
                    <h3>{selectedLearningMode ? `正在学习：${formatLearningMode(selectedLearningMode)}` : "先选择一种学习形态"}</h3>
                  </div>
                </div>
              )}
              {activeRun && selectedLearningMode === "structure_map" && blueprint ? (
                <>
                  <div className="structure-study-panel">
                    <div className="structure-map-board">
                      <div className="structure-section-head">
                        <span>材料结构图</span>
                        <strong>先点节点，再看右侧的原文依据和检查问题</strong>
                      </div>
                      <div className="structure-node-list">
                        {structureNodes.map((node, index) => {
                          const nodeId = recordText(node, "id", recordText(node, "label", `node-${index}`));
                          const label = recordText(node, "label", "结构节点");
                          const detail = recordText(node, "detail", "系统从材料里抽出的结构说明。");
                          const kind = formatGraphKind(recordText(node, "kind", "node"));
                          const isSelected = selectedStructureNode ? node === selectedStructureNode : index === 0;

                          return (
                            <button
                              key={nodeId}
                              className={isSelected ? "structure-node selected" : "structure-node"}
                              onClick={() => setSelectedStructureNodeId(nodeId)}
                            >
                              <span>{kind}</span>
                              <strong>{label}</strong>
                              <p>{detail}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <aside className="structure-inspector">
                      <div className="activity-card-label">
                        <span>当前结构节点</span>
                        <strong>{selectedStructureNode ? recordText(selectedStructureNode, "label", "结构节点") : "等待结构节点"}</strong>
                      </div>
                      {selectedStructureNode ? (
                        <>
                          <div className="source-excerpt-box">
                            <span>节点对应的材料依据</span>
                            <p>{recordText(selectedStructureNode, "detail", "这部分来自系统对材料结构的抽取结果。")}</p>
                          </div>
                          <div className="source-reason-grid">
                            <div>
                              <span>结构角色</span>
                              <strong>{formatGraphKind(recordText(selectedStructureNode, "kind", "node"))}</strong>
                              <p>这个节点说明材料在这里承担的是问题、证据、前提、风险或结论中的一种角色。</p>
                            </div>
                            <div>
                              <span>要验证什么</span>
                              <strong>{selectedStructureQuestion ? recordText(selectedStructureQuestion, "prompt", "确认这个节点为什么重要。") : "确认这个节点为什么重要。"}</strong>
                              <p>如果说不清这个问题，后面的测验会暴露出具体卡点。</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="empty-state small">这份材料还没有生成结构节点。</p>
                      )}
                      <div className="structure-concepts">
                        <span>关键概念节点</span>
                        <div className="chip-row">
                          {conceptNodes.length
                            ? conceptNodes.slice(0, 8).map((node, index) => (
                                <span key={recordText(node, "id", recordText(node, "label", `concept-${index}`))}>
                                  {recordText(node, "label", recordText(node, "term", "概念"))}
                                </span>
                              ))
                            : blueprint.learning_representation.keywords.slice(0, 8).map((keyword) => <span key={keyword}>{keyword}</span>)}
                        </div>
                      </div>
                      <div className="structure-next-action">
                        <span>这一步完成标准</span>
                        <strong>你能说清每个节点在材料里的作用，并知道下一步要验证哪个问题。</strong>
                        <button
                          className="pixel-button"
                          onClick={() => {
                            setSelectedLearningMode("quiz");
                            setActiveStage("study_mode");
                          }}
                        >
                          我看懂结构，进入理解测验
                        </button>
                      </div>
                    </aside>
                  </div>
                  {!isFocusedStudyMode ? (
                    <div className="path-help-card">
                      <div>
                        <span className="help-kicker">结构图怎么用</span>
                        <strong>不要把它当目录。它是材料的逻辑骨架：问题、证据、概念和待验证问题要同时看。</strong>
                      </div>
                      <ol className="path-help-steps">
                        <li>
                          <span>1</span>
                          点左侧结构节点
                        </li>
                        <li>
                          <span>2</span>
                          看右侧材料依据和验证问题
                        </li>
                        <li>
                          <span>3</span>
                          进入测验，用回答检查自己是否真的理解
                        </li>
                      </ol>
                    </div>
                  ) : null}
                </>
              ) : activeRun && currentActivity && selectedLearningMode ? (
                <>
                  <div className="activity-card">
                    <div className="activity-card-label">
                      <span>当前学习卡片</span>
                      <strong>先看材料依据，再操作底部按钮</strong>
                    </div>
                    <span className="activity-type">{formatActivityType(currentActivity.type)}</span>
                    <h4>{currentActivity.title}</h4>
                    {currentActivitySource ? (
                      <div className="activity-source-card">
                        <div className="source-card-head">
                          <span>这张卡来自材料哪里</span>
                          <strong>{currentActivitySource.sectionHeading}</strong>
                        </div>
                        <div className="source-excerpt-box">
                          <span>材料原文 / 解析片段</span>
                          <p>{currentActivitySource.materialExcerpt}</p>
                        </div>
                        <div className="source-reason-grid">
                          <div>
                            <span>系统抽出的结构</span>
                            <strong>{currentActivitySource.graphLabel}</strong>
                            <p>{currentActivitySource.graphDetail}</p>
                          </div>
                          <div>
                            <span>这一步要检查什么</span>
                            <strong>{currentActivitySource.questionTarget}</strong>
                            <p>{currentActivitySource.whyThisStep}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="current-action-card">
                      <span>这张卡片要你做的是</span>
                      <strong>{activityInstruction(currentActivity.type)}</strong>
                    </div>
                    {showCurrentActivityBody ? <p>{currentActivity.body}</p> : null}
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
                          {formatConfidence(item)}
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
                      {activitySubmitLabel(currentActivity.type)}
                    </button>
                  </div>
                  <div className="progress-strip">
                    <div className="progress-bar">
                      <div style={{ width: `${Math.min(100, Math.round(progressRatio * 100))}%` }} />
                    </div>
                    <span>
                      {Math.min(activeRun.current_activity_index + 1, activities.length)} / {activities.length}
                    </span>
                    <span className="status-pill">{activeRun.course_status === "completed" ? "已完成" : "学习中"}</span>
                  </div>
                  {!isFocusedStudyMode ? (
                    <>
                      <div className="path-help-card">
                        <div>
                          <span className="help-kicker">学习卡片怎么用</span>
                          <strong>上方写着“当前学习卡片”的白色区域，就是这一轮要读和操作的地方。</strong>
                        </div>
                        <ol className="path-help-steps">
                          <li>
                            <span>1</span>
                            先看“材料原文 / 解析片段”
                          </li>
                          <li>
                            <span>2</span>
                            再看系统抽出的结构和检查目标
                          </li>
                          <li>
                            <span>3</span>
                            点卡片底部绿色按钮进入下一节点
                          </li>
                        </ol>
                      </div>
                      <div className="coach-console">
                        <div className="coach-avatar">
                          <span>PX</span>
                        </div>
                        <div>
                          <p className="coach-role">学习引导</p>
                          <p>{activeRun.latest_guide_message}</p>
                        </div>
                      </div>
                    </>
                  ) : null}
                </>
              ) : activeRun && activeRun.course_status === "completed" ? (
                <p className="empty-state">这轮学习已完成。复习页已经生成回访计划，下一步是复盘与迁移，而不是停在总结。</p>
              ) : activeRun && !selectedLearningMode ? (
                <>
                  <p className="empty-state">学习包已经生成。先回到“学习包”页选择一种学习形态，再进入具体卡片。</p>
                  <div className="empty-action">
                    <button className="pixel-button compact-button" onClick={() => setActiveStage("learning_pack")}>
                      去选择学习形态
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="empty-state">把材料分析结果生成学习包后，这里会出现第一个学习项。</p>
                  <div className="empty-action">
                    <button className="pixel-button compact-button" disabled={isBusy || !analyzeResult} onClick={() => handleGenerateCourse()}>
                      生成学习包
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className={activeStage === "review" ? "panel review-panel active-stage-panel" : "panel review-panel hidden-stage-panel"}>
              <div className="panel-head">
                <div>
                  <p className="eyebrow">5 REVIEW / HISTORY</p>
                  <h3>学习记录与后续复习</h3>
                </div>
              </div>
              <div className="review-columns">
                <div>
                  <h4>历史学习包</h4>
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
                      <p className="empty-state small">还没有历史学习包。</p>
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
                          {plan.review_reasons.length ? (
                            <div className="review-reasons">
                              <span>为什么复习这些</span>
                              {plan.review_reasons.map((reason) => (
                                <p key={reason}>{reason}</p>
                              ))}
                            </div>
                          ) : null}
                          <button className="secondary-button" onClick={() => handleCompleteReviewPlan(plan.id)} disabled={plan.status === "completed" || isBusy}>
                            {plan.status === "completed" ? "已完成" : "标记完成"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state small">完成学习后，会自动生成 D+1 / D+3 / D+7 回访。</p>
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
