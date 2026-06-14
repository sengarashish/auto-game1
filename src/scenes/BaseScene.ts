/**
 * BaseScene: shared responsive plumbing for every scene.
 *
 * With RESIZE scale mode the canvas equals the viewport, so scenes must lay out
 * from the live width/height and reflow when it changes. Subclasses implement
 * `layout()` (build positioned UI) — it's called on create and on every resize.
 * Sizing helpers scale fonts/elements proportionally (clamped) so the UI is
 * readable on a phone and not gigantic on a desktop.
 */
import Phaser from 'phaser';
import type { Theme } from '../config/themes';
import { REF_WIDTH, REF_HEIGHT } from '../config/gameConfig';
import { drawGradient } from '../ui/scenery';

/**
 * Read a CSS `env(safe-area-inset-*)` value via a hidden probe element. Cached
 * element, re-read on each call so it stays correct across orientation changes.
 */
let insetProbe: HTMLDivElement | null = null;
function safeAreaInset(side: 'top' | 'bottom'): number {
  if (typeof document === 'undefined') return 0;
  if (!insetProbe) {
    insetProbe = document.createElement('div');
    insetProbe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);';
    document.body.appendChild(insetProbe);
  }
  const cs = getComputedStyle(insetProbe);
  return parseFloat(side === 'top' ? cs.paddingTop : cs.paddingBottom) || 0;
}

export abstract class BaseScene extends Phaser.Scene {
  private bgGfx?: Phaser.GameObjects.Graphics;
  private bgTheme?: Theme;

  get W(): number {
    return this.scale.width;
  }
  get H(): number {
    return this.scale.height;
  }
  get cx(): number {
    return this.W / 2;
  }
  get cy(): number {
    return this.H / 2;
  }
  /** Treat clearly tall viewports as portrait (phones held upright). */
  get portrait(): boolean {
    return this.H > this.W * 1.05;
  }
  /** The smaller side — handy for square-ish sizing. */
  get vmin(): number {
    return Math.min(this.W, this.H);
  }
  /** Clamped proportional scale vs. the design reference. */
  get u(): number {
    return Phaser.Math.Clamp(Math.min(this.W / REF_WIDTH, this.H / REF_HEIGHT), 0.6, 1.4);
  }

  /** Scaled font size string, e.g. `fs(28)` → "24px" on a small screen. */
  fs(base: number): string {
    return `${Math.round(base * this.u)}px`;
  }
  /** Scaled pixel value. */
  px(base: number): number {
    return Math.round(base * this.u);
  }

  /**
   * Safe-area insets so content never sits flush against the viewport edge or
   * (on phones) behind the notch / home indicator / browser address-tool bar.
   * Combines the device `env(safe-area-inset-*)` with a base breathing pad.
   */
  get insetTop(): number {
    return safeAreaInset('top') + this.px(10);
  }
  get insetBottom(): number {
    return safeAreaInset('bottom') + this.px(18);
  }
  /** Y of the first usable row (just below the top inset). */
  get top(): number {
    return this.insetTop;
  }
  /** Y just above the bottom inset (anchor bottom UI here, not at `H`). */
  get bottom(): number {
    return this.H - this.insetBottom;
  }

  /** Create/redraw the gradient background to fill the viewport. */
  protected setBackground(theme: Theme): void {
    this.bgTheme = theme;
    if (!this.bgGfx) this.bgGfx = this.add.graphics().setDepth(-10);
    drawGradient(this.bgGfx, this.W, this.H, theme);
  }

  /** Wire up automatic relayout on viewport resize/orientation change. */
  protected enableResponsive(): void {
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
  }

  private handleResize(): void {
    if (this.bgGfx && this.bgTheme) drawGradient(this.bgGfx, this.W, this.H, this.bgTheme);
    this.layout();
  }

  /** Build all positioned UI. Called on create and on every resize. */
  abstract layout(): void;
}
