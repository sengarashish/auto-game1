/**
 * Global, accessibility-focused settings persisted in localStorage. These are
 * app-wide (not per-profile) so a shared device can be tuned for a child once.
 */
export interface Settings {
  /** Narrate prompts/answers with text-to-speech. */
  narration: boolean;
  /** Use the high-quality Piper neural voice (falls back to the OS voice). */
  naturalVoice: boolean;
  /** Play sound effects. */
  sound: boolean;
  /** Reduce/disable non-essential animation. */
  reducedMotion: boolean;
  /** Use a dyslexia-friendly font stack. */
  dyslexiaFont: boolean;
}

const KEY = 'quizquest.settings.v1';

const DEFAULTS: Settings = {
  narration: true,
  naturalVoice: true,
  sound: true,
  reducedMotion: false,
  dyslexiaFont: false,
};

let cache: Settings | null = null;

export function getSettings(): Settings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULTS };
  } catch {
    cache = { ...DEFAULTS };
  }
  // Respect the OS reduced-motion preference on first run.
  if (cache && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cache.reducedMotion = true;
  }
  return cache;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
