export type LearningIntent = "deep_read" | "logic_breakdown" | "course_learning";
export type ActivityType = "scene" | "explain" | "probe" | "challenge" | "reflect";

export interface UserSummary {
  id: string;
  email: string;
  display_name: string;
}

export interface SessionResponse {
  session_token: string;
  user: UserSummary;
}

export interface MagicLinkResponse {
  email: string;
  preview_token: string;
  preview_link: string;
  expires_at: string;
}

export interface AssetCreateResponse {
  asset_id: string;
  source_type: string;
  original_name: string;
}

export interface ParsedSection {
  heading: string;
  paragraphs: string[];
}

export interface ParsedDocument {
  metadata: Record<string, unknown>;
  sections: ParsedSection[];
  paragraphs: string[];
  citations: string[];
  tables: string[];
  formulas: string[];
  language: string;
  doc_type_guess: "paper" | "argument_text" | "notes_or_textbook";
  parse_strategy: string;
}

export interface AnalyzeResponse {
  asset_id: string;
  parsed_document: ParsedDocument;
  recommended_intent: LearningIntent;
  doc_type_scores: Record<string, number>;
  follow_up_question: string | null;
  learning_representation: {
    argument_graph: Array<Record<string, unknown>>;
    concept_map: Array<Record<string, unknown>>;
    question_targets: Array<Record<string, unknown>>;
    misconception_risks: string[];
    keywords: string[];
  };
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  body: string;
  skill_ids: string[];
  key_points?: string[];
  expected_keywords?: string[];
  rubric?: {
    required_facets?: string[];
    expected_keywords?: string[];
    passing_note?: string;
  };
  challenge_type?: string;
  choices?: string[];
  correct_index?: number;
}

export interface Chapter {
  id: string;
  title: string;
  theme: string;
  activities: Activity[];
}

export interface Skill {
  id: string;
  label: string;
  current_mastery: number;
  confidence: number;
  evidence_count: number;
  last_seen_at: string | null;
  review_due_at: string | null;
  misconceptions?: string[];
}

export interface CourseBlueprint {
  title: string;
  doc_type: string;
  intent: LearningIntent;
  cover: {
    hook: string;
    estimated_minutes: number;
    chapter_count: number;
    activity_count: number;
    language: string;
  };
  chapters: Chapter[];
  skills: Skill[];
  guide_character: {
    name: string;
    role: string;
    stance: string;
  };
  learning_representation: AnalyzeResponse["learning_representation"];
}

export interface CourseRun {
  id: string;
  asset_id: string;
  title: string;
  intent: LearningIntent;
  blueprint: CourseBlueprint;
  current_activity_index: number;
  course_status: string;
  mastery_state: {
    skills: Skill[];
    last_result?: { is_correct: boolean; feedback: string } | null;
    completed_activity_ids?: string[];
  };
  latest_guide_message: string;
}

export interface CourseRunSummary {
  id: string;
  title: string;
  intent: LearningIntent;
  course_status: string;
  current_activity_index: number;
  updated_at: string;
}

export interface AssessmentEventResponse {
  message: string;
  result: {
    is_correct: boolean;
    score: number;
    feedback: string;
  };
  course_run: CourseRun;
}

export interface ReviewPlanItem {
  id: string;
  course_run_id: string;
  title: string;
  stage_label: string;
  due_at: string;
  status: string;
  guide_message: string;
}

export type ProductEventName = "first_run_sample_started" | "material_parsed" | "path_generated" | "first_activity_completed" | "d1_review_completed";

export interface ProductEventResponse {
  id: string;
  event_name: ProductEventName;
  created_at: string;
}

export interface ProductFunnelResponse {
  steps: Array<{
    event_name: ProductEventName;
    label: string;
    count: number;
    reached: boolean;
  }>;
  completed_steps: number;
  total_steps: number;
}
