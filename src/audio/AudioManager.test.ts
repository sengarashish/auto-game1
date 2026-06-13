import { describe, expect, it } from 'vitest';
import { stripForSpeech, chunkText } from './AudioManager';

describe('stripForSpeech', () => {
  it('removes emojis but keeps the words', () => {
    expect(stripForSpeech('Great job! 🎉⭐')).toBe('Great job!');
    expect(stripForSpeech('🍎🍎🍎 How many?')).toBe('How many?');
  });

  it('speaks math symbols as words (× → times, − → minus, etc.)', () => {
    expect(stripForSpeech('3 × 4 = ?')).toBe('3 times 4 equals ?');
    expect(stripForSpeech('12 − 5 = ?')).toBe('12 minus 5 equals ?');
    expect(stripForSpeech('20 ÷ 4 = ?')).toBe('20 divided by 4 equals ?');
    expect(stripForSpeech('2 + 6 = ?')).toBe('2 plus 6 equals ?');
  });

  it('keeps plain digits intact', () => {
    expect(stripForSpeech('Count to 100')).toBe('Count to 100');
  });

  it('strips emoji that use variation selectors', () => {
    expect(stripForSpeech('Sun ☀️ shines')).toBe('Sun shines');
    expect(stripForSpeech('🦊 Fox')).toBe('Fox');
  });

  it('returns empty string for emoji-only input', () => {
    expect(stripForSpeech('⭐✅🎈')).toBe('');
  });
});

describe('chunkText', () => {
  it('keeps short text as a single chunk', () => {
    expect(chunkText('What time is it?')).toEqual(['What time is it?']);
  });

  it('splits long text into <=180 char chunks on word boundaries', () => {
    const long = Array.from({ length: 60 }, () => 'word').join(' ');
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(180));
    expect(chunks.join(' ')).toBe(long);
  });
});
