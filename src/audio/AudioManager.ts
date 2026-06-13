/**
 * AudioManager: narration (Web Speech API) + sound effects (synthesized with
 * the Web Audio API so we ship zero audio files). Honors the global sound /
 * narration settings, and is safe to call before the user has interacted
 * (audio simply no-ops until an AudioContext can start).
 */
import { getSettings } from '../config/settings';

type SfxName = 'correct' | 'wrong' | 'click' | 'win' | 'star' | 'pop' | 'whoosh' | 'streak';

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private voice: SpeechSynthesisVoice | null = null;

  /** Call from a user-gesture handler to unlock audio on mobile/Safari. */
  unlock(): void {
    this.ensureCtx();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    // Prime speech synthesis voice list.
    this.pickVoice();
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  private pickVoice(): void {
    if (this.voice || typeof speechSynthesis === 'undefined') return;
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return;

    // Prefer high-quality neural/natural OS voices (these sound great and cost
    // zero download — the OS already ships them). We rank en-US voices by name.
    const PREFERRED = [
      'natural',
      'premium',
      'enhanced',
      'neural',
      'google us english',
      'samantha',
      'aaron',
      'ava',
      'allison',
      'zira',
    ];
    const enUS = voices.filter((v) => v.lang === 'en-US');
    const enAny = voices.filter((v) => v.lang.startsWith('en'));
    const pool = enUS.length ? enUS : enAny.length ? enAny : voices;

    const ranked = [...pool].sort((a, b) => this.voiceScore(b, PREFERRED) - this.voiceScore(a, PREFERRED));
    this.voice = ranked[0] ?? null;
  }

  private voiceScore(v: SpeechSynthesisVoice, preferred: string[]): number {
    const name = v.name.toLowerCase();
    let score = 0;
    preferred.forEach((p, i) => {
      if (name.includes(p)) score += preferred.length - i;
    });
    if (v.localService) score += 1; // local = no network latency
    return score;
  }

  /** Speak text aloud (kid-paced) if narration is enabled. */
  speak(text: string, opts: { rate?: number; force?: boolean } = {}): void {
    if (!opts.force && !getSettings().narration) return;
    if (typeof speechSynthesis === 'undefined' || !text) return;
    this.pickVoice();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.lang = 'en-US';
    u.rate = opts.rate ?? 0.95;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }

  stopSpeech(): void {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  /** Play a short synthesized sound effect. */
  play(name: SfxName): void {
    if (!getSettings().sound) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    switch (name) {
      case 'click':
        this.tone(ctx, [{ f: 440, t: 0, d: 0.06 }], 0.12, 'triangle');
        break;
      case 'pop':
        this.tone(ctx, [{ f: pick([660, 720, 784, 880]), t: 0, d: 0.08 }], 0.14, 'sine');
        break;
      case 'whoosh':
        this.tone(ctx, [{ f: 300, t: 0, d: 0.18 }], 0.08, 'sawtooth');
        break;
      case 'correct': {
        // Randomized happy arpeggios so it doesn't get repetitive.
        const sets = [
          [523, 659, 784],
          [587, 740, 880],
          [659, 784, 988],
          [523, 698, 880],
        ];
        const notes = pick(sets).map((f, i) => ({ f, t: i * 0.1, d: 0.16 }));
        this.tone(ctx, notes, 0.18, pick<OscillatorType>(['sine', 'triangle']));
        break;
      }
      case 'wrong': {
        const sets = [
          [311, 233],
          [349, 262],
          [294, 220],
        ];
        const notes = pick(sets).map((f, i) => ({ f, t: i * 0.12, d: 0.2 }));
        this.tone(ctx, notes, 0.16, 'sine');
        break;
      }
      case 'streak':
        this.tone(
          ctx,
          [
            { f: 784, t: 0, d: 0.1 },
            { f: 988, t: 0.08, d: 0.1 },
            { f: 1319, t: 0.16, d: 0.16 },
          ],
          0.18,
          'triangle',
        );
        break;
      case 'star':
        this.tone(ctx, [{ f: pick([880, 988, 1047]), t: 0, d: 0.12 }], 0.14, 'triangle');
        break;
      case 'win':
        this.tone(
          ctx,
          [
            { f: 523, t: 0, d: 0.14 },
            { f: 659, t: 0.13, d: 0.14 },
            { f: 784, t: 0.26, d: 0.14 },
            { f: 1047, t: 0.39, d: 0.3 },
          ],
          0.2,
          'sine',
        );
        break;
    }
  }

  private tone(
    ctx: AudioContext,
    notes: { f: number; t: number; d: number }[],
    gainPeak: number,
    type: OscillatorType,
  ): void {
    const now = ctx.currentTime;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = n.f;
      const start = now + n.t;
      const end = start + n.d;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(gainPeak, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }
}

export const Audio = new AudioManagerImpl();

// Voices load asynchronously in some browsers.
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = () => Audio.unlock();
}
