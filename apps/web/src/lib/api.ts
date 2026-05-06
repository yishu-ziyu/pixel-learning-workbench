import type {
  AnalyzeResponse,
  AssessmentEventResponse,
  AssetCreateResponse,
  CourseBlueprint,
  CourseRun,
  CourseRunSummary,
  LearningIntent,
  MagicLinkResponse,
  ProductEventName,
  ProductEventResponse,
  ProductFunnelResponse,
  ReviewPlanItem,
  SessionResponse,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000/api";

async function request<T>(path: string, init?: RequestInit, sessionToken?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
  });

  if (!response.ok) {
    let detail = "请求失败";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? detail;
    } catch {
      // noop
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export function requestMagicLink(email: string): Promise<MagicLinkResponse> {
  return request<MagicLinkResponse>("/auth/request-magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function verifyMagicLink(token: string): Promise<SessionResponse> {
  return request<SessionResponse>("/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export function createAsset(input: { text?: string; url?: string; file?: File }, sessionToken: string): Promise<AssetCreateResponse> {
  const formData = new FormData();
  if (input.text) formData.append("text", input.text);
  if (input.url) formData.append("url", input.url);
  if (input.file) formData.append("file", input.file);
  return request<AssetCreateResponse>("/assets", { method: "POST", body: formData }, sessionToken);
}

export function analyzeAsset(assetId: string, sessionToken: string): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>(`/assets/${assetId}/analyze`, { method: "POST" }, sessionToken);
}

export function createBlueprint(assetId: string, intent: LearningIntent, sessionToken: string): Promise<{ asset_id: string; intent: LearningIntent; blueprint: CourseBlueprint }> {
  return request<{ asset_id: string; intent: LearningIntent; blueprint: CourseBlueprint }>(
    `/assets/${assetId}/course-blueprint?intent=${intent}`,
    { method: "POST" },
    sessionToken,
  );
}

export function createCourseRun(assetId: string, intent: LearningIntent, blueprint: CourseBlueprint, sessionToken: string): Promise<CourseRun> {
  return request<CourseRun>(
    "/course-runs",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: assetId, intent, blueprint }),
    },
    sessionToken,
  );
}

export function listCourseRuns(sessionToken: string): Promise<CourseRunSummary[]> {
  return request<CourseRunSummary[]>("/course-runs", undefined, sessionToken);
}

export function getCourseRun(id: string, sessionToken: string): Promise<CourseRun> {
  return request<CourseRun>(`/course-runs/${id}`, undefined, sessionToken);
}

export function submitEvent(
  courseRunId: string,
  payload: {
    activity_id: string;
    activity_type: string;
    answer: Record<string, unknown>;
    confidence: "low" | "medium" | "high";
    duration_seconds: number;
  },
  sessionToken: string,
): Promise<AssessmentEventResponse> {
  return request<AssessmentEventResponse>(
    `/course-runs/${courseRunId}/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    sessionToken,
  );
}

export function listReviewPlans(sessionToken: string): Promise<ReviewPlanItem[]> {
  return request<ReviewPlanItem[]>("/review-plans", undefined, sessionToken);
}

export function completeReviewPlan(reviewId: string, sessionToken: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/review-plans/${reviewId}/complete`, { method: "POST" }, sessionToken);
}

export function recordProductEvent(
  eventName: ProductEventName,
  payload: Record<string, unknown>,
  sessionToken: string,
): Promise<ProductEventResponse> {
  return request<ProductEventResponse>(
    "/analytics/events",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_name: eventName, payload, source: "web" }),
    },
    sessionToken,
  );
}

export function getProductFunnel(sessionToken: string): Promise<ProductFunnelResponse> {
  return request<ProductFunnelResponse>("/analytics/funnel", undefined, sessionToken);
}
