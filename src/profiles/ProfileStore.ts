/**
 * Local kid profiles persisted in localStorage. No accounts, no PII beyond a
 * first name + emoji avatar the child/parent chooses — COPPA-friendly.
 *
 * Stores per-topic best stars, total stars, earned badges, and last theme.
 */
import type { GradeBand, QuizResult } from '../quiz/types';

export interface Profile {
  id: string;
  name: string;
  avatar: string; // emoji
  gradeBand: GradeBand;
  totalStars: number;
  /** topicId -> best star count (0..3). */
  bestStars: Record<string, number>;
  /** topicId -> times played. */
  played: Record<string, number>;
  badges: string[];
  theme: string;
  createdAt: number;
}

const KEY = 'quizquest.profiles.v1';
const ACTIVE_KEY = 'quizquest.activeProfile.v1';

export const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🦄', '🐙', '🐵', '🐧', '🦖', '🐝', '🐬', '🦋'];

function load(): Profile[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile[]) : [];
  } catch {
    return [];
  }
}

function save(profiles: Profile[]): void {
  localStorage.setItem(KEY, JSON.stringify(profiles));
}

export function listProfiles(): Profile[] {
  return load();
}

export function createProfile(name: string, avatar: string, gradeBand: GradeBand): Profile {
  const profiles = load();
  const profile: Profile = {
    id: `p_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`,
    name: name.trim().slice(0, 16) || 'Player',
    avatar,
    gradeBand,
    totalStars: 0,
    bestStars: {},
    played: {},
    badges: [],
    theme: 'space',
    createdAt: Date.now(),
  };
  profiles.push(profile);
  save(profiles);
  setActiveProfile(profile.id);
  return profile;
}

export function deleteProfile(id: string): void {
  save(load().filter((p) => p.id !== id));
  if (getActiveProfileId() === id) localStorage.removeItem(ACTIVE_KEY);
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveProfile(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return load().find((p) => p.id === id) ?? null;
}

export function updateProfile(id: string, patch: Partial<Profile>): Profile | null {
  const profiles = load();
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  profiles[idx] = { ...profiles[idx], ...patch };
  save(profiles);
  return profiles[idx];
}

/**
 * Apply a finished quiz to a profile: update best stars, total stars (only the
 * improvement counts toward the running total), play count, and award badges.
 * Returns the list of newly-earned badge ids for celebration UI.
 */
export function recordResult(id: string, result: QuizResult): string[] {
  const profiles = load();
  const p = profiles.find((x) => x.id === id);
  if (!p) return [];

  // Credit every topic that appeared in this (possibly multi-topic) quiz.
  for (const topicId of result.config.topicIds) {
    const prevBest = p.bestStars[topicId] ?? 0;
    if (result.stars > prevBest) {
      p.totalStars += result.stars - prevBest;
      p.bestStars[topicId] = result.stars;
    }
    p.played[topicId] = (p.played[topicId] ?? 0) + 1;
  }

  const newBadges = evaluateBadges(p, result).filter((b) => !p.badges.includes(b));
  p.badges.push(...newBadges);

  save(profiles);
  return newBadges;
}

/** Simple, encouraging badge rules. */
function evaluateBadges(p: Profile, result: QuizResult): string[] {
  const earned: string[] = [];
  if (Object.values(p.played).reduce((a, b) => a + b, 0) >= 1) earned.push('first-quiz');
  if (result.stars === 3) earned.push('perfect-3-stars');
  if (p.totalStars >= 10) earned.push('star-collector');
  if (p.totalStars >= 30) earned.push('star-master');
  const topicsWith3 = Object.values(p.bestStars).filter((s) => s === 3).length;
  if (topicsWith3 >= 5) earned.push('topic-champion');
  const distinctSubjectsPlayed = new Set(Object.keys(p.played)).size;
  if (distinctSubjectsPlayed >= 5) earned.push('explorer');
  return earned;
}

export const BADGE_INFO: Record<string, { label: string; icon: string }> = {
  'first-quiz': { label: 'First Quiz!', icon: '🎉' },
  'perfect-3-stars': { label: 'Perfect Score', icon: '🌟' },
  'star-collector': { label: 'Star Collector', icon: '⭐' },
  'star-master': { label: 'Star Master', icon: '🏆' },
  'topic-champion': { label: 'Topic Champion', icon: '👑' },
  explorer: { label: 'Explorer', icon: '🧭' },
};
