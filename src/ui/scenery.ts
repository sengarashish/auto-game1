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

/** Relative luminance (0 = black, 1 = white) using sRGB weights. */
export function luminance(color: number): number {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  const lin = (c: number): number => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function mix(a: number, b: number): number {
  const r = (((a >> 16) & 0xff) + ((b >> 16) & 0xff)) >> 1;
  const g = (((a >> 8) & 0xff) + ((b >> 8) & 0xff)) >> 1;
  const bl = ((a & 0xff) + (b & 0xff)) >> 1;
  return (r << 16) | (g << 8) | bl;
}

/** Is this theme's background light overall? (drives readable text choices) */
export function isLightTheme(t: Theme): boolean {
  return luminance(mix(t.bgTop, t.bgBottom)) > 0.5;
}

/**
 * Readable text colors derived from the theme. On the three dark themes these
 * return exactly the previous hard-coded values (so they are visually
 * unchanged); on a light theme (Candy) they flip to dark, fixing contrast.
 */
export function primaryText(t: Theme): string {
  // The theme's own `text` color is authored to contrast its panels/background.
  return hex(t.text);
}
export function accentText(t: Theme): string {
  return isLightTheme(t) ? '#8a4b00' : '#ffd166';
}
export function mutedText(t: Theme): string {
  return isLightTheme(t) ? '#3c3c5a' : '#cfd6ff';
}
/** Readable text for a given panel/fill color specifically. */
export function textOn(color: number): string {
  return luminance(color) > 0.5 ? '#1b1b3a' : '#ffffff';
}
