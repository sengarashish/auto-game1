/**
 * QuizEngine: builds a question set from a QuizConfig, tracks answers as the
 * player progresses, and computes the final result (score + stars).
 *
 * Pure logic, no Phaser — so it is unit-testable and reusable.
 */
import { createRng, timeSeed } from '../utils/rng';
import { generateQuestion } from './QuestionFactory';
import type {
  AnswerRecord,
  GenOptions,
  Question,
  QuizConfig,
  QuizResult,
} from './types';

export class QuizEngine {
  readonly config: QuizConfig;
  readonly seed: number;
  readonly questions: Question[];
  private readonly records: AnswerRecord[];
  private current = 0;

  constructor(config: QuizConfig) {
    this.config = config;
    this.seed = config.seed ?? timeSeed();
    const rng = createRng(this.seed);
    this.questions = this.buildQuestions(rng);
    this.records = this.questions.map((question) => ({
      question,
      given: null,
      correct: false,
      attempts: 0,
    }));
  }

  /**
   * Generate `questionCount` questions, evenly cycling through the selected
   * topics (so a multi-topic quiz covers each one), retrying to avoid
   * back-to-back duplicate prompts.
   */
  private buildQuestions(rng: ReturnType<typeof createRng>): Question[] {
    const topics = this.config.topicIds.length > 0 ? this.config.topicIds : ['addition'];
    const out: Question[] = [];
    const seenPrompts = new Set<string>();
    let index = 0;
    let guard = 0;

    const makeOpts = (): GenOptions => ({
      // Round-robin across topics for even coverage.
      topicId: topics[out.length % topics.length],
      gradeBand: this.config.gradeBand,
      difficulty: this.config.difficulty,
      index: index++,
    });

    while (out.length < this.config.questionCount && guard++ < this.config.questionCount * 25) {
      const q = generateQuestion(makeOpts(), rng);
      const key = `${q.prompt}|${q.promptImage ?? ''}`;
      if (seenPrompts.has(key)) continue;
      seenPrompts.add(key);
      out.push(q);
    }
    // If the topic domain is tiny, allow repeats to reach the requested count.
    while (out.length < this.config.questionCount) {
      out.push(generateQuestion(makeOpts(), rng));
    }
    return out;
  }

  get total(): number {
    return this.questions.length;
  }

  get currentIndex(): number {
    return this.current;
  }

  get currentQuestion(): Question {
    return this.questions[this.current];
  }

  isLast(): boolean {
    return this.current >= this.questions.length - 1;
  }

  /**
   * Check whether a given answer is correct WITHOUT recording it (used to show
   * immediate feedback and allow a retry).
   */
  check(question: Question, given: string): boolean {
    if (question.inputType === 'typed') {
      return normalize(given) === normalize(question.answerText ?? '');
    }
    return given === question.answerId;
  }

  /**
   * Record the player's final answer for the current question.
   * `correctOnFirstTry` controls scoring; attempts are tracked separately.
   */
  submit(given: string | null, attempts: number): boolean {
    const q = this.currentQuestion;
    const correct = given !== null && this.check(q, given);
    const rec = this.records[this.current];
    rec.given = given;
    rec.correct = correct;
    rec.attempts = attempts;
    return correct;
  }

  /** Advance to the next question; returns false if the quiz is over. */
  advance(): boolean {
    if (this.isLast()) return false;
    this.current++;
    return true;
  }

  result(): QuizResult {
    const correctCount = this.records.filter((r) => r.correct).length;
    const total = this.records.length;
    const accuracy = total === 0 ? 0 : correctCount / total;
    return {
      config: this.config,
      records: this.records.slice(),
      correctCount,
      total,
      accuracy,
      stars: starsFor(accuracy),
    };
  }
}

export function starsFor(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  if (accuracy >= 0.5) return 1;
  return 0;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
