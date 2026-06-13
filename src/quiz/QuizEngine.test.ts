import { describe, expect, it } from 'vitest';
import { QuizEngine, starsFor } from './QuizEngine';
import type { QuizConfig } from './types';

const baseConfig: QuizConfig = {
  subjectId: 'math',
  topicId: 'addition',
  gradeBand: '1-2',
  difficulty: 1,
  questionCount: 8,
  seed: 12345,
};

describe('QuizEngine', () => {
  it('is reproducible with the same seed', () => {
    const a = new QuizEngine(baseConfig);
    const b = new QuizEngine(baseConfig);
    expect(a.questions.map((q) => q.prompt)).toEqual(b.questions.map((q) => q.prompt));
  });

  it('builds the requested number of questions', () => {
    const e = new QuizEngine(baseConfig);
    expect(e.total).toBe(8);
  });

  it('grades a full perfect run as 3 stars', () => {
    const e = new QuizEngine(baseConfig);
    do {
      const q = e.currentQuestion;
      e.submit(q.answerId ?? null, 1);
    } while (e.advance());
    const r = e.result();
    expect(r.correctCount).toBe(r.total);
    expect(r.accuracy).toBe(1);
    expect(r.stars).toBe(3);
  });

  it('grades a fully wrong run as 0 stars', () => {
    const e = new QuizEngine(baseConfig);
    do {
      // Pick a deliberately wrong choice.
      const q = e.currentQuestion;
      const wrong = q.choices?.find((c) => c.id !== q.answerId);
      e.submit(wrong?.id ?? null, 1);
    } while (e.advance());
    const r = e.result();
    expect(r.correctCount).toBe(0);
    expect(r.stars).toBe(0);
  });

  it('starsFor thresholds', () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(0.9)).toBe(3);
    expect(starsFor(0.7)).toBe(2);
    expect(starsFor(0.5)).toBe(1);
    expect(starsFor(0.4)).toBe(0);
  });
});
