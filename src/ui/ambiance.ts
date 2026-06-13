/**
 * Theme-relevant ambient animation + tap interactivity. Built from Phaser
 * tweens/particles and themed emoji "drifters" — no external asset downloads,
 * works offline. Honors the reduced-motion setting (becomes a calm static
 * scene when reduced motion is on).
 *
 * For a richer look later you can drop in free CC0 sprite sheets from
 * kenney.nl (load them in PreloadScene and swap the emoji drifters for sprites);
 * the API here stays the same.
 */
import Phaser from 'phaser';
import type { Theme } from '../config/themes';
import { getSettings } from '../config/settings';
import { TEX } from './textures';

interface DrifterStyle {
  emojis: string[];
  /** 'up' = rise from bottom (bubbles), 'down' = fall from top (leaves). */
  direction: 'up' | 'down' | 'float';
  spawnMs: number;
}

const DRIFTERS: Record<string, DrifterStyle> = {
  space: { emojis: ['✨', '⭐', '🌟', '💫'], direction: 'up', spawnMs: 900 },
  ocean: { emojis: ['🫧', '🐠', '🐡', '🐚', '🌊'], direction: 'up', spawnMs: 750 },
  jungle: { emojis: ['🍃', '🌿', '🦜', '🦋', '🌸'], direction: 'down', spawnMs: 850 },
  candy: { emojis: ['🍬', '🍭', '🧁', '🌈', '🍩'], direction: 'float', spawnMs: 800 },
};

export class Ambiance {
  private scene: Phaser.Scene;
  private theme: Theme;
  private timer?: Phaser.Time.TimerEvent;
  private spawned: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, theme: Theme) {
    this.scene = scene;
    this.theme = theme;
  }

  start(): this {
    if (getSettings().reducedMotion) return this; // calm: no ambient motion
    const style = DRIFTERS[this.theme.id] ?? DRIFTERS.space;
    this.timer = this.scene.time.addEvent({
      delay: style.spawnMs,
      loop: true,
      callback: () => this.spawnDrifter(style),
    });
    // Occasional special: a shooting star in Space.
    if (this.theme.id === 'space') {
      this.scene.time.addEvent({
        delay: 3500,
        loop: true,
        callback: () => this.shootingStar(),
      });
    }
    // Clean up everything when the scene shuts down.
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stop());
    return this;
  }

  stop(): void {
    this.timer?.remove();
    this.spawned.forEach((o) => o.destroy());
    this.spawned = [];
  }

  private spawnDrifter(style: DrifterStyle): void {
    const { width, height } = this.scene.scale;
    const emoji = Phaser.Utils.Array.GetRandom(style.emojis);
    const size = Phaser.Math.Between(22, 42);
    const x = Phaser.Math.Between(40, width - 40);
    const startY = style.direction === 'down' ? -30 : height + 30;
    const endY = style.direction === 'down' ? height + 30 : -30;

    const t = this.scene.add
      .text(x, startY, emoji, { fontSize: `${size}px` })
      .setOrigin(0.5)
      .setDepth(-5)
      .setAlpha(0.85);
    this.spawned.push(t);

    const duration = Phaser.Math.Between(7000, 12000);
    this.scene.tweens.add({
      targets: t,
      y: endY,
      x: x + Phaser.Math.Between(-60, 60),
      angle: style.direction === 'float' ? Phaser.Math.Between(-25, 25) : 0,
      duration,
      ease: 'Sine.inOut',
      onComplete: () => {
        this.spawned = this.spawned.filter((o) => o !== t);
        t.destroy();
      },
    });
    // Gentle twinkle.
    this.scene.tweens.add({
      targets: t,
      alpha: 0.35,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
  }

  private shootingStar(): void {
    const { width } = this.scene.scale;
    const y = Phaser.Math.Between(40, 220);
    const star = this.scene.add
      .text(-40, y, '☄️', { fontSize: '34px' })
      .setOrigin(0.5)
      .setDepth(-4);
    this.spawned.push(star);
    this.scene.tweens.add({
      targets: star,
      x: width + 60,
      y: y + 120,
      duration: 1400,
      ease: 'Quad.in',
      onComplete: () => {
        this.spawned = this.spawned.filter((o) => o !== star);
        star.destroy();
      },
    });
  }
}

/**
 * Make every tap/click on the scene spray a few themed sparkles — simple,
 * delightful "the screen reacts to me" feedback for kids.
 */
export function enableTapSparkles(scene: Phaser.Scene, theme: Theme): void {
  scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (getSettings().reducedMotion) return;
    const colors = [theme.accent, theme.correct, 0xffffff];
    const emitter = scene.add.particles(pointer.x, pointer.y, TEX.spark, {
      speed: { min: 60, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      lifespan: 500,
      quantity: 6,
      tint: Phaser.Utils.Array.GetRandom(colors),
      emitting: false,
    });
    emitter.setDepth(2000);
    emitter.explode(6);
    scene.time.delayedCall(600, () => emitter.destroy());
  });
}
