/**
 * Shared scene-dressing helpers: a vertical gradient background and a rounded
 * panel. Centralized so every scene themes itself consistently.
 */
import Phaser from 'phaser';
import type { Theme } from '../config/themes';

/** Draw a full-screen vertical gradient using a texture, return the image. */
export function addGradientBackground(scene: Phaser.Scene, theme: Theme): Phaser.GameObjects.Image {
  const { width, height } = scene.scale;
  const key = `bg-${theme.id}-${width}x${height}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, width, height);
    const ctx = tex?.getContext();
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, hex(theme.bgTop));
      grad.addColorStop(1, hex(theme.bgBottom));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      tex?.refresh();
    }
  }
  return scene.add.image(width / 2, height / 2, key).setDepth(-10);
}

/** A rounded rectangle panel/card. */
export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  alpha = 1,
  radius = 24,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
