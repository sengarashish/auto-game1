/**
 * Celebratory / feedback effects. Bursts use Phaser's particle system with
 * procedurally-generated textures (no asset files) plus emoji flourishes.
 * Everything respects the reduced-motion setting.
 */
import Phaser from 'phaser';
import { getSettings } from '../config/settings';
import type { Theme } from '../config/themes';
import { TEX } from './textures';

const CONFETTI_COLORS = [0xffd166, 0x06d6a0, 0xef476f, 0x118ab2, 0x8338ec, 0xff7b00];

export function confetti(scene: Phaser.Scene, x: number, y: number, count = 60): void {
  if (getSettings().reducedMotion) return;
  for (let i = 0; i < count; i++) {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const piece = scene.add.rectangle(x, y, Phaser.Math.Between(6, 12), Phaser.Math.Between(8, 16), color);
    piece.setDepth(1000);
    const angle = Phaser.Math.FloatBetween(-Math.PI, 0);
    const speed = Phaser.Math.Between(200, 520);
    scene.tweens.add({
      targets: piece,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed + Phaser.Math.Between(200, 420),
      angle: Phaser.Math.Between(-360, 360),
      alpha: 0,
      duration: Phaser.Math.Between(900, 1500),
      ease: 'Quad.out',
      onComplete: () => piece.destroy(),
    });
  }
}

export function starburst(scene: Phaser.Scene, x: number, y: number): void {
  if (getSettings().reducedMotion) return;
  const rays = 10;
  for (let i = 0; i < rays; i++) {
    const star = scene.add.text(x, y, '⭐', { fontSize: '28px' }).setOrigin(0.5).setDepth(1000);
    const angle = (i / rays) * Math.PI * 2;
    const dist = Phaser.Math.Between(80, 140);
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: 0.2,
      duration: 700,
      ease: 'Quad.out',
      onComplete: () => star.destroy(),
    });
  }
}

/** A gentle shake for wrong answers (kept subtle, motion-aware). */
export function shake(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
): void {
  const obj = target as unknown as { x: number };
  if (getSettings().reducedMotion) return;
  const startX = obj.x;
  scene.tweens.add({
    targets: target,
    x: startX - 10,
    duration: 60,
    yoyo: true,
    repeat: 3,
    onComplete: () => {
      obj.x = startX;
    },
  });
}

export type CelebrationVariant = 'pop' | 'fountain' | 'spin' | 'rings';
const VARIANTS: CelebrationVariant[] = ['pop', 'fountain', 'spin', 'rings'];

/** Pick a random celebration so correct answers feel fresh each time. */
export function randomCelebration(scene: Phaser.Scene, x: number, y: number, theme: Theme): void {
  if (getSettings().reducedMotion) {
    // A small, calm tick instead of a burst.
    const ok = scene.add.text(x, y, '✅', { fontSize: '40px' }).setOrigin(0.5).setDepth(1500);
    scene.time.delayedCall(700, () => ok.destroy());
    return;
  }
  const variant = Phaser.Utils.Array.GetRandom(VARIANTS);
  const colors = [theme.accent, theme.correct, 0xffffff, 0xffd166];
  celebrate(scene, x, y, variant, colors);
  // Always toss a couple of emoji for personality.
  const flair = Phaser.Utils.Array.GetRandom([
    ['🎉', '✨'],
    ['🌟', '💫'],
    ['🥳', '⭐'],
    ['🎈', '✨'],
  ]);
  emojiPop(scene, x, y, flair);
}

function celebrate(
  scene: Phaser.Scene,
  x: number,
  y: number,
  variant: CelebrationVariant,
  colors: number[],
): void {
  const tint = Phaser.Utils.Array.GetRandom(colors);
  let emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  switch (variant) {
    case 'fountain':
      emitter = scene.add.particles(x, y + 30, TEX.dot, {
        speed: { min: 220, max: 460 },
        angle: { min: 250, max: 290 },
        gravityY: 700,
        scale: { start: 0.9, end: 0 },
        lifespan: 1000,
        quantity: 26,
        tint: colors,
        emitting: false,
      });
      emitter.explode(26);
      break;
    case 'spin':
      emitter = scene.add.particles(x, y, TEX.spark, {
        speed: { min: 120, max: 320 },
        angle: { min: 0, max: 360 },
        rotate: { start: 0, end: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 900,
        quantity: 24,
        tint: colors,
        emitting: false,
      });
      emitter.explode(24);
      break;
    case 'rings':
      emitter = scene.add.particles(x, y, TEX.ring, {
        speed: { min: 80, max: 260 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.6, end: 1.4 },
        alpha: { start: 1, end: 0 },
        lifespan: 800,
        quantity: 14,
        tint,
        emitting: false,
      });
      emitter.explode(14);
      break;
    case 'pop':
    default:
      emitter = scene.add.particles(x, y, TEX.dot, {
        speed: { min: 150, max: 420 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.1, end: 0 },
        lifespan: 750,
        quantity: 30,
        tint: colors,
        emitting: false,
      });
      emitter.explode(30);
      break;
  }
  emitter.setDepth(1400);
  scene.time.delayedCall(1300, () => emitter.destroy());
}

/** Toss a couple of emoji that arc outward and fade. */
export function emojiPop(scene: Phaser.Scene, x: number, y: number, emojis: string[]): void {
  if (getSettings().reducedMotion) return;
  emojis.forEach((e, i) => {
    const t = scene.add.text(x, y, e, { fontSize: '40px' }).setOrigin(0.5).setDepth(1500);
    const dir = i % 2 === 0 ? -1 : 1;
    scene.tweens.add({
      targets: t,
      x: x + dir * Phaser.Math.Between(60, 140),
      y: y - Phaser.Math.Between(80, 160),
      angle: dir * 30,
      alpha: 0,
      scale: 1.6,
      duration: 1000,
      ease: 'Quad.out',
      onComplete: () => t.destroy(),
    });
  });
}

/** Wrong-answer puff: a small grey burst + a wobble emoji. */
export function wrongPuff(scene: Phaser.Scene, x: number, y: number): void {
  if (getSettings().reducedMotion) return;
  const emitter = scene.add.particles(x, y, TEX.dot, {
    speed: { min: 40, max: 140 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.6, end: 0 },
    lifespan: 500,
    quantity: 10,
    tint: 0x9aa0b5,
    emitting: false,
  });
  emitter.setDepth(1400);
  emitter.explode(10);
  scene.time.delayedCall(700, () => emitter.destroy());
  emojiPop(scene, x, y, ['💨']);
}
