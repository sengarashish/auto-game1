/**
 * Core domain types. This is the single source of truth for the shape of a
 * question, a quiz config, and the curriculum catalog. Every generator — math
 * or ELA — produces the same `Question` shape so `QuizScene` stays generic.
 */

/** US grade bands used to organize and scale content. */
export type GradeBand = 'pk-k' | '1-2' | '3-5' | '6-8';

export const GRADE_BANDS: { id: GradeBand; label: string }[] = [
  { id: 'pk-k', label: 'PK–K' },
  { id: '1-2', label: 'Grades 1–2' },
  { id: '3-5', label: 'Grades 3–5' },
  { id: '6-8', label: 'Grades 6–8' },
];

/** 1 = easy, 2 = medium, 3 = hard. Scales number ranges and distractors. */
export type Difficulty = 1 | 2 | 3;

export type SubjectId = 'math' | 'ela';

/** A single selectable answer. */
export interface Choice {
  id: string;
  /** Text label (also used for narration when `speak` is absent). */
  label: string;
  /** Optional asset key to render an image/emoji instead of/with text. */
  image?: string;
}

/**
 * A fully-formed, auto-gradable question. Generators always set `answerId` to
 * the id of the correct choice (or, for typed input, `answerText`).
 */
export interface Question {
  id: string;
  topicId: string;
  subjectId: SubjectId;
  difficulty: Difficulty;
  /** The question text shown to the player and read aloud. */
  prompt: string;
  /** Optional override of what TTS narrates (e.g. a phoneme like "buh"). */
  speak?: string;
  /** Optional visual shown with the prompt (emoji string or asset key). */
  promptImage?: string;
  inputType: 'choice' | 'typed';
  /** Present when inputType === 'choice'. 2–4 options. */
  choices?: Choice[];
  /** The correct choice id (inputType 'choice'). */
  answerId?: string;
  /** The correct text answer (inputType 'typed'); compared case-insensitively. */
  answerText?: string;
  /** Optional short explanation shown after answering. */
  explanation?: string;
}

/** Options every generator receives. */
export interface GenOptions {
  topicId: string;
  gradeBand: GradeBand;
  difficulty: Difficulty;
  /** Monotonic index within the quiz, used to build stable ids. */
  index: number;
}

/** Configuration assembled by MenuScene and consumed by QuizEngine. */
export interface QuizConfig {
  subjectId: SubjectId;
  /** One or more topics; the engine mixes questions evenly across them. */
  topicIds: string[];
  gradeBand: GradeBand;
  difficulty: Difficulty;
  questionCount: number;
  /** Seed for reproducibility; random when omitted. */
  seed?: number;
}

/** Per-question record kept by the engine while playing. */
export interface AnswerRecord {
  question: Question;
  /** Choice id or typed string the player submitted; null if skipped. */
  given: string | null;
  correct: boolean;
  /** Attempts used (we allow a gentle retry). */
  attempts: number;
}

/** Final summary produced by the engine. */
export interface QuizResult {
  config: QuizConfig;
  records: AnswerRecord[];
  correctCount: number;
  total: number;
  accuracy: number; // 0..1
  stars: 0 | 1 | 2 | 3;
}

/** A curriculum topic shown in the menu. */
export interface Topic {
  id: string;
  subjectId: SubjectId;
  title: string;
  /** Kid-facing icon (emoji). */
  icon: string;
  gradeBands: GradeBand[];
  /** Common Core codes. */
  ccss: string[];
  /** Florida B.E.S.T. codes. */
  flBest: string[];
  /** Whether typed input is allowed (older grades); defaults to choice-only. */
  allowTyped?: boolean;
}

export interface Subject {
  id: SubjectId;
  title: string;
  icon: string;
  color: number;
}
