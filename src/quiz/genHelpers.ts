/**
 * Shared helpers for generators: building unique distractors and assembling a
 * choice-based Question with the correct answer flagged. Keeps every generator
 * short and consistent.
 */
import type { Rng } from '../utils/rng';
import type { Choice, GenOptions, Question, SubjectId } from './types';

/**
 * Build a set of `count` unique numeric distractors near `answer` (never equal
 * to it and never negative unless allowed). Used by math generators.
 */
export function numericDistractors(
  answer: number,
  count: number,
  rng: Rng,
  opts: { spread?: number; allowNegative?: boolean } = {},
): number[] {
  const spread = opts.spread ?? Math.max(3, Math.ceil(Math.abs(answer) * 0.5));
  const used = new Set<number>([answer]);
  const out: number[] = [];
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const delta = rng.int(1, spread) * (rng.chance(0.5) ? 1 : -1);
    const candidate = answer + delta;
    if (used.has(candidate)) continue;
    if (!opts.allowNegative && candidate < 0) continue;
    used.add(candidate);
    out.push(candidate);
  }
  // Fallback if we couldn't find enough nearby: walk outward.
  let n = answer + spread + 1;
  while (out.length < count) {
    if (!used.has(n) && (opts.allowNegative || n >= 0)) {
      used.add(n);
      out.push(n);
    }
    n++;
  }
  return out;
}

/**
 * Pick `count` unique distractor strings from `pool`, excluding `answer`
 * (and anything in `exclude`).
 */
export function stringDistractors(
  answer: string,
  pool: readonly string[],
  count: number,
  rng: Rng,
  exclude: readonly string[] = [],
): string[] {
  const blocked = new Set([answer.toLowerCase(), ...exclude.map((e) => e.toLowerCase())]);
  const candidates = rng.shuffle(pool.filter((p) => !blocked.has(p.toLowerCase())));
  return candidates.slice(0, count);
}

let choiceCounter = 0;
function choiceId(): string {
  return `c${(choiceCounter++).toString(36)}`;
}

/**
 * Assemble a choice-based Question. Pass the correct label/image and a list of
 * distractor labels/images; choices are shuffled and the correct one flagged.
 */
export function buildChoiceQuestion(args: {
  opts: GenOptions;
  subjectId: SubjectId;
  prompt: string;
  speak?: string;
  promptImage?: string;
  correct: { label: string; image?: string };
  distractors: { label: string; image?: string }[];
  explanation?: string;
  rng: Rng;
}): Question {
  const correctChoice: Choice = {
    id: choiceId(),
    label: args.correct.label,
    image: args.correct.image,
  };
  const distractorChoices: Choice[] = args.distractors.map((d) => ({
    id: choiceId(),
    label: d.label,
    image: d.image,
  }));
  const choices = args.rng.shuffle([correctChoice, ...distractorChoices]);

  return {
    id: `${args.opts.topicId}-${args.opts.index}`,
    topicId: args.opts.topicId,
    subjectId: args.subjectId,
    difficulty: args.opts.difficulty,
    prompt: args.prompt,
    speak: args.speak,
    promptImage: args.promptImage,
    inputType: 'choice',
    choices,
    answerId: correctChoice.id,
    explanation: args.explanation,
  };
}

/** Number of choices to present at a given difficulty (more = harder). */
export function choiceCount(difficulty: number): number {
  return difficulty >= 3 ? 4 : difficulty === 2 ? 4 : 3;
}
