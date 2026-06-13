/**
 * Lightweight celebratory effects drawn with primitives (no asset files):
 * a confetti burst and a starburst. Both respect the reduced-motion setting.
 */
import Phaser from 'phaser';
import { getSettings } from '../config/settings';

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
export function shake(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject): void {
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
