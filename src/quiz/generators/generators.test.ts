/**
 * Generator correctness tests. The core promise of auto-grading is that the
 * choice flagged as the answer is actually correct. We assert that across many
 * seeds, grade bands, and difficulties for every registered topic.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../utils/rng';
import { generateQuestion } from '../QuestionFactory';
import { mathGenerators } from './math';
import { elaGenerators } from './ela';
import type { Difficulty, GradeBand } from '../types';

const BANDS: GradeBand[] = ['pk-k', '1-2', '3-5', '6-8'];
const DIFFS: Difficulty[] = [1, 2, 3];
const ALL_TOPICS = [...Object.keys(mathGenerators), ...Object.keys(elaGenerators)];

/** Independently verify the marked answer for math topics by parsing prompts. */
function mathAnswerIsConsistent(prompt: string, answerLabel: string): boolean | null {
  const m = prompt.match(/(-?\d+)\s*([+−\-×x÷])\s*(-?\d+)\s*=/);
  if (!m) return null; // not a basic binary expression — skip independent check
  const a = Number(m[1]);
  const op = m[2];
  const b = Number(m[3]);
  let expected: number;
  switch (op) {
    case '+':
      expected = a + b;
      break;
    case '−':
    case '-':
      expected = a - b;
      break;
    case '×':
    case 'x':
      expected = a * b;
      break;
    case '÷':
      expected = a / b;
      break;
    default:
      return null;
  }
  return Number(answerLabel) === expected;
}

describe('generators', () => {
  it('registers a generator for every topic', () => {
    expect(ALL_TOPICS.length).toBeGreaterThan(15);
  });

  for (const topicId of ALL_TOPICS) {
    it(`"${topicId}" always flags a valid, unique correct choice`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const rng = createRng(seed * 7919);
        const band = BANDS[seed % BANDS.length];
        const difficulty = DIFFS[seed % DIFFS.length];
        const q = generateQuestion({ topicId, gradeBand: band, difficulty, index: seed }, rng);

        // Structural guarantees.
        expect(q.choices, `${topicId} should have choices`).toBeTruthy();
        const choices = q.choices ?? [];
        expect(choices.length).toBeGreaterThanOrEqual(2);

        // The flagged answer exists exactly once.
        const matching = choices.filter((c) => c.id === q.answerId);
        expect(matching.length, `${topicId}: answerId must match exactly one choice`).toBe(1);

        // Choice labels are unique (no duplicate distractors == answer).
        const labels = choices.map((c) => c.label);
        expect(new Set(labels).size, `${topicId}: choices must be distinct (${labels.join(',')})`).toBe(
          labels.length,
        );

        // Independent math check where parseable.
        const consistent = mathAnswerIsConsistent(q.prompt, matching[0].label);
        if (consistent !== null) {
          expect(consistent, `${topicId}: ${q.prompt} -> ${matching[0].label}`).toBe(true);
        }
      }
    });
  }
});
