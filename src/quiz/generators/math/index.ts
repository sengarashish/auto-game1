/**
 * Math question generators. Each is a pure function:
 *   (opts: GenOptions, rng: Rng) => Question
 * It always sets the correct answer, so grading is automatic. Difficulty and
 * grade band scale the number ranges. Generators never touch Phaser/DOM.
 */
import type { GenOptions, GradeBand, Question } from '../../types';
import type { Rng } from '../../../utils/rng';
import {
  buildChoiceQuestion,
  choiceCount,
  numericDistractors,
} from '../../genHelpers';

export type MathGenerator = (opts: GenOptions, rng: Rng) => Question;

/** Operand ceiling per grade band + difficulty for additive operations. */
function additiveRange(band: GradeBand, difficulty: number): number {
  const base: Record<GradeBand, number> = { 'pk-k': 5, '1-2': 20, '3-5': 100, '6-8': 1000 };
  const mult = difficulty === 1 ? 0.5 : difficulty === 2 ? 1 : 1.5;
  return Math.max(5, Math.round(base[band] * mult));
}

const COUNT_EMOJI = ['🍎', '⭐', '🐶', '🌸', '🐟', '🎈', '🍓', '🐝', '🚗', '🦋'];

function mathChoice(
  opts: GenOptions,
  rng: Rng,
  prompt: string,
  answer: number,
  distractorOpts: { spread?: number; allowNegative?: boolean } = {},
  extra: { speak?: string; promptImage?: string; explanation?: string } = {},
): Question {
  const n = choiceCount(opts.difficulty) - 1;
  const distractors = numericDistractors(answer, n, rng, distractorOpts).map((v) => ({
    label: String(v),
  }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'math',
    prompt,
    correct: { label: String(answer) },
    distractors,
    rng,
    ...extra,
  });
}

/** Count the objects (PK–K). */
export const counting: MathGenerator = (opts, rng) => {
  const max = opts.difficulty === 1 ? 5 : opts.difficulty === 2 ? 10 : 20;
  const count = rng.int(1, max);
  const emoji = rng.pick(COUNT_EMOJI);
  return mathChoice(
    opts,
    rng,
    'How many do you see?',
    count,
    { spread: 3 },
    { promptImage: emoji.repeat(count), speak: 'How many do you see?' },
  );
};

export const addition: MathGenerator = (opts, rng) => {
  const max = additiveRange(opts.gradeBand, opts.difficulty);
  const a = rng.int(0, max);
  const b = rng.int(0, max);
  const answer = a + b;
  return mathChoice(opts, rng, `${a} + ${b} = ?`, answer, { spread: Math.max(2, Math.round(max * 0.2)) });
};

export const subtraction: MathGenerator = (opts, rng) => {
  const max = additiveRange(opts.gradeBand, opts.difficulty);
  const a = rng.int(0, max);
  const b = rng.int(0, a); // keep non-negative for kids
  const answer = a - b;
  return mathChoice(opts, rng, `${a} − ${b} = ?`, answer, { spread: Math.max(2, Math.round(max * 0.2)) });
};

export const multiplication: MathGenerator = (opts, rng) => {
  const cap = opts.difficulty === 1 ? 5 : opts.difficulty === 2 ? 10 : 12;
  const a = rng.int(1, cap);
  const b = rng.int(1, cap);
  const answer = a * b;
  return mathChoice(opts, rng, `${a} × ${b} = ?`, answer, { spread: Math.max(3, a + b) });
};

export const division: MathGenerator = (opts, rng) => {
  const cap = opts.difficulty === 1 ? 5 : opts.difficulty === 2 ? 10 : 12;
  const b = rng.int(1, cap);
  const answer = rng.int(1, cap);
  const a = b * answer; // ensures whole-number division
  return mathChoice(opts, rng, `${a} ÷ ${b} = ?`, answer, { spread: Math.max(2, cap) });
};

/** Greater / less / equal comparison. */
export const comparison: MathGenerator = (opts, rng) => {
  const max = additiveRange(opts.gradeBand, opts.difficulty);
  const a = rng.int(0, max);
  const b = rng.int(0, max);
  const answer = a > b ? 'greater than' : a < b ? 'less than' : 'equal to';
  const options = ['greater than', 'less than', 'equal to'];
  const distractors = options.filter((o) => o !== answer).map((label) => ({ label }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'math',
    prompt: `${a} is ___ ${b}`,
    speak: `${a} is what compared to ${b}?`,
    correct: { label: answer },
    distractors,
    rng,
    explanation: `${a} ${a > b ? '>' : a < b ? '<' : '='} ${b}`,
  });
};

/** Place value: which digit is in a named place (3–5). */
export const placeValue: MathGenerator = (opts, rng) => {
  const places =
    opts.difficulty >= 3
      ? ['ones', 'tens', 'hundreds', 'thousands']
      : opts.difficulty === 2
        ? ['ones', 'tens', 'hundreds']
        : ['ones', 'tens'];
  const digits = places.length;
  const num = rng.int(10 ** (digits - 1), 10 ** digits - 1);
  const placeIndex = rng.int(0, digits - 1);
  const placeName = places[placeIndex];
  const answer = Math.floor(num / 10 ** placeIndex) % 10;
  const distractors = numericDistractors(answer, choiceCount(opts.difficulty) - 1, rng, {
    spread: 9,
  }).map((v) => ({ label: String(v) }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'math',
    prompt: `What digit is in the ${placeName} place of ${num}?`,
    correct: { label: String(answer) },
    distractors,
    rng,
  });
};

const FRACTION_PIES = ['🥧', '🍕', '🍫'];

/** Identify the fraction shown (simple unit fractions). */
export const fractions: MathGenerator = (opts, rng) => {
  const denom = opts.difficulty === 1 ? rng.int(2, 4) : opts.difficulty === 2 ? rng.int(2, 6) : rng.int(2, 10);
  const numer = rng.int(1, denom - 1);
  const filled = '🟩'.repeat(numer);
  const empty = '⬜'.repeat(denom - numer);
  const answer = `${numer}/${denom}`;
  const distractorSet = new Set<string>();
  let guard = 0;
  while (distractorSet.size < choiceCount(opts.difficulty) - 1 && guard++ < 50) {
    const d = rng.int(2, denom + 2);
    const n = rng.int(1, Math.max(1, d - 1));
    const cand = `${n}/${d}`;
    if (cand !== answer) distractorSet.add(cand);
  }
  return buildChoiceQuestion({
    opts,
    subjectId: 'math',
    prompt: 'What fraction is shaded?',
    speak: 'What fraction is shaded?',
    promptImage: `${FRACTION_PIES[0]} ${filled}${empty}`,
    correct: { label: answer },
    distractors: [...distractorSet].map((label) => ({ label })),
    rng,
  });
};

/** Money: total value of coins (counting cents). */
export const money: MathGenerator = (opts, rng) => {
  const coins = [
    { name: 'penny', value: 1, emoji: '🟤' },
    { name: 'nickel', value: 5, emoji: '⚪' },
    { name: 'dime', value: 10, emoji: '🔵' },
    { name: 'quarter', value: 25, emoji: '🟡' },
  ];
  const pool = opts.difficulty === 1 ? coins.slice(0, 2) : opts.difficulty === 2 ? coins.slice(0, 3) : coins;
  const n = rng.int(2, opts.difficulty + 2);
  let total = 0;
  const picked: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = rng.pick(pool);
    total += c.value;
    picked.push(c.emoji);
  }
  const distractors = numericDistractors(total, choiceCount(opts.difficulty) - 1, rng, {
    spread: 10,
  }).map((v) => ({ label: `${v}¢` }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'math',
    prompt: 'How many cents in all?',
    speak: 'How many cents in all?',
    promptImage: picked.join(' '),
    correct: { label: `${total}¢` },
    distractors,
    rng,
  });
};

/** Telling time on a (described) clock. */
export const time: MathGenerator = (opts, rng) => {
  const hour = rng.int(1, 12);
  const minuteStep = opts.difficulty === 1 ? 60 : opts.difficulty === 2 ? 30 : 15;
  const minute = (rng.int(0, Math.floor(59 / minuteStep)) * minuteStep) % 60;
  const mm = minute.toString().padStart(2, '0');
  const answer = `${hour}:${mm}`;
  const distractorSet = new Set<string>();
  let guard = 0;
  while (distractorSet.size < choiceCount(opts.difficulty) - 1 && guard++ < 50) {
    const h = rng.int(1, 12);
    const m = (rng.int(0, Math.floor(59 / minuteStep)) * minuteStep) % 60;
    const cand = `${h}:${m.toString().padStart(2, '0')}`;
    if (cand !== answer) distractorSet.add(cand);
  }
  return buildChoiceQuestion({
    opts,
    subjectId: 'math',
    prompt: `The clock shows ${hour} o'clock and ${minute} minutes. What time is it?`,
    speak: `What time is it?`,
    promptImage: '🕐',
    correct: { label: answer },
    distractors: [...distractorSet].map((label) => ({ label })),
    rng,
  });
};

const SHAPES = [
  { name: 'circle', emoji: '⭕' },
  { name: 'square', emoji: '🟥' },
  { name: 'triangle', emoji: '🔺' },
  { name: 'star', emoji: '⭐' },
  { name: 'heart', emoji: '❤️' },
  { name: 'diamond', emoji: '🔷' },
];

/** Shape recognition (PK–K / 1–2). */
export const shapes: MathGenerator = (opts, rng) => {
  const target = rng.pick(SHAPES);
  const distractors = rng
    .shuffle(SHAPES.filter((s) => s.name !== target.name))
    .slice(0, choiceCount(opts.difficulty) - 1)
    .map((s) => ({ label: s.name }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'math',
    prompt: 'What shape is this?',
    speak: 'What shape is this?',
    promptImage: target.emoji,
    correct: { label: target.name },
    distractors,
    rng,
  });
};

/** Templated word problems (story → arithmetic). */
export const wordProblem: MathGenerator = (opts, rng) => {
  const max = additiveRange(opts.gradeBand, opts.difficulty);
  const names = ['Mia', 'Liam', 'Ava', 'Noah', 'Sofia', 'Ethan', 'Zoe', 'Lucas'];
  const items = [
    { s: 'apple', p: 'apples', e: '🍎' },
    { s: 'sticker', p: 'stickers', e: '⭐' },
    { s: 'marble', p: 'marbles', e: '🔵' },
    { s: 'cookie', p: 'cookies', e: '🍪' },
  ];
  const name = rng.pick(names);
  const item = rng.pick(items);
  const isAdd = rng.chance(0.5);
  const a = rng.int(1, max);
  let prompt: string;
  let answer: number;
  if (isAdd) {
    const b = rng.int(1, max);
    answer = a + b;
    prompt = `${name} has ${a} ${item.p}. ${name} gets ${b} more. How many ${item.p} now?`;
  } else {
    const b = rng.int(1, a);
    answer = a - b;
    prompt = `${name} has ${a} ${item.p} and gives away ${b}. How many ${item.p} are left?`;
  }
  return mathChoice(opts, rng, prompt, answer, { spread: Math.max(2, Math.round(max * 0.3)) }, {
    promptImage: item.e,
  });
};

export const mathGenerators: Record<string, MathGenerator> = {
  counting,
  addition,
  subtraction,
  multiplication,
  division,
  comparison,
  'place-value': placeValue,
  fractions,
  money,
  time,
  shapes,
  'word-problem': wordProblem,
};
