/**
 * Piper (VITS) neural text-to-speech, running fully in the browser.
 *
 * We use the `en_US-hfc_female-medium` voice — a warm, clear female voice that
 * sounds far more natural than most built-in OS voices. The model (~tens of MB)
 * and the onnxruntime/phonemizer WASM are fetched from CDNs on first use and
 * cached in the browser's Origin Private File System, so later loads are
 * instant and work offline.
 *
 * Everything here is best-effort: if the package, WASM, or model fails to load
 * (no network, unsupported browser), {@link Piper.ready} stays false and the
 * AudioManager falls back to the Web Speech API. The heavy import is dynamic so
 * it never bloats the initial bundle.
 */

export const PIPER_VOICE = 'en_US-hfc_female-medium';

type Status = 'idle' | 'loading' | 'ready' | 'error';

class PiperTTSImpl {
  private session: { predict(text: string): Promise<Blob> } | null = null;
  private status: Status = 'idle';
  private loadPromise: Promise<void> | null = null;
  /** Download progress 0..1 (model fetch), for an optional UI indicator. */
  progress = 0;

  get ready(): boolean {
    return this.status === 'ready';
  }
  get loading(): boolean {
    return this.status === 'loading';
  }
  get failed(): boolean {
    return this.status === 'error';
  }

  /**
   * Begin downloading the voice + WASM and warming the inference session in the
   * background. Idempotent — safe to call from every scene's `unlock()`.
   */
  init(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    if (typeof window === 'undefined') return Promise.resolve();

    this.status = 'loading';
    this.loadPromise = (async () => {
      try {
        const tts = await import('@mintplex-labs/piper-tts-web');
        const session = await tts.TtsSession.create({
          voiceId: PIPER_VOICE,
          progress: (p) => {
            if (p.total > 0) this.progress = Math.min(1, p.loaded / p.total);
          },
        });
        this.session = session;
        this.status = 'ready';
      } catch (err) {
        console.warn('[piper] unavailable, using system voice instead:', err);
        this.status = 'error';
      }
    })();
    return this.loadPromise;
  }

  /** Synthesize a chunk to a WAV blob, or null if Piper isn't usable. */
  async synthesize(text: string): Promise<Blob | null> {
    if (!this.session) return null;
    try {
      return await this.session.predict(text);
    } catch (err) {
      console.warn('[piper] synthesis failed, falling back:', err);
      this.status = 'error';
      return null;
    }
  }
}

export const Piper = new PiperTTSImpl();
