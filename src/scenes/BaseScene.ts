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
