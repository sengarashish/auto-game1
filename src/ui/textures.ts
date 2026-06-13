/**
 * Procedurally-generated particle textures (no asset files). Generated once and
 * cached on the global texture manager, then tinted per theme at emit time.
 */
import Phaser from 'phaser';

export const TEX = {
  dot: 'p_dot',
  spark: 'p_spark',
  ring: 'p_ring',
} as const;

export function ensureParticleTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.dot)) return;

  // Soft filled circle.
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture(TEX.dot, 16, 16);
  g.clear();

  // 4-point sparkle/star.
  g.fillStyle(0xffffff, 1);
  const cx = 12;
  const cy = 12;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    const r = i % 2 === 0 ? 12 : 4;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
  }
  g.fillPoints(pts, true);
  g.generateTexture(TEX.spark, 24, 24);
  g.clear();

  // Hollow ring (bubble).
  g.lineStyle(3, 0xffffff, 1);
  g.strokeCircle(11, 11, 9);
  g.generateTexture(TEX.ring, 22, 22);

  g.destroy();
}
