/**
 * AudioManager: narration (Web Speech API) + sound effects (synthesized with
 * the Web Audio API so we ship zero audio files). Honors the global sound /
 * narration settings, and is safe to call before the user has interacted
 * (audio simply no-ops until an AudioContext can start).
 */
import { getSettings } from '../config/settings';

type SfxName = 'correct' | 'wrong' | 'click' | 'win' | 'star';

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
    // Prefer a US English voice; fall back to any English, then default.
    this.voice =
      voices.find((v) => v.lang === 'en-US') ??
      voices.find((v) => v.lang.startsWith('en')) ??
      voices[0] ??
      null;
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

    switch (name) {
      case 'click':
        this.tone(ctx, [{ f: 440, t: 0, d: 0.06 }], 0.12, 'triangle');
        break;
      case 'correct':
        this.tone(
          ctx,
          [
            { f: 523, t: 0, d: 0.12 },
            { f: 659, t: 0.1, d: 0.12 },
            { f: 784, t: 0.2, d: 0.18 },
          ],
          0.18,
          'sine',
        );
        break;
      case 'wrong':
        this.tone(
          ctx,
          [
            { f: 311, t: 0, d: 0.18 },
            { f: 233, t: 0.12, d: 0.22 },
          ],
          0.16,
          'sine',
        );
        break;
      case 'star':
        this.tone(ctx, [{ f: 988, t: 0, d: 0.12 }], 0.14, 'triangle');
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
