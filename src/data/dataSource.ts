/**
 * DataSource abstraction. Today it serves bundled JSON; this interface is the
 * single swap point for a future SQLite/REST backend (implement ApiDataSource
 * against the same interface and change `getDataSource()` — nothing else moves).
 *
 * Generators receive a DataSource and must NOT import the JSON directly, so the
 * data access stays centralized and mockable in tests.
 */
import type { GradeBand } from '../quiz/types';
import sightWords from './content/sightWords.json';
import phonics from './content/phonics.json';
import wordLists from './content/wordLists.json';

export interface LetterSound {
  word: string;
  emoji: string;
  sound: string;
}

export interface DataSource {
  /** High-frequency sight words for a grade band. */
  sightWords(band: GradeBand): string[];
  /** Per-letter beginning-sound example (word + emoji + spoken sound). */
  letterSound(letter: string): LetterSound;
  /** All letters that have phonics entries, lowercased a–z. */
  phonicsLetters(): string[];
  /** CVC (consonant-vowel-consonant) words grouped by short vowel. */
  cvcWords(vowel: string): string[];
  /** Map of rime → rhyming words. */
  rhymeGroups(): Record<string, string[]>;
}

type SightWordMap = Record<GradeBand, string[]>;
type LetterSoundMap = Record<string, LetterSound>;

class JsonDataSource implements DataSource {
  sightWords(band: GradeBand): string[] {
    const map = sightWords as unknown as SightWordMap;
    return map[band] ?? [];
  }

  letterSound(letter: string): LetterSound {
    const map = phonics.letterSounds as unknown as LetterSoundMap;
    const entry = map[letter.toLowerCase()];
    if (!entry) throw new Error(`No phonics entry for letter "${letter}"`);
    return entry;
  }

  phonicsLetters(): string[] {
    return Object.keys(phonics.letterSounds);
  }

  cvcWords(vowel: string): string[] {
    const map = phonics.cvcWords as unknown as Record<string, string[]>;
    return map[vowel.toLowerCase()] ?? [];
  }

  rhymeGroups(): Record<string, string[]> {
    return wordLists.rhymeGroups as unknown as Record<string, string[]>;
  }
}

let singleton: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!singleton) singleton = new JsonDataSource();
  return singleton;
}
