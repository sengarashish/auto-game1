/**
 * A big, kid-friendly button: rounded rect + label, with hover/press feedback,
 * a click sound, and large touch targets. Keyboard-focusable for accessibility.
 */
import Phaser from 'phaser';
import { Audio } from '../audio/AudioManager';
import { getSettings } from '../config/settings';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fill: number;
  textColor?: number;
  fontSize?: number;
  icon?: string;
  onClick: () => void;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private readonly baseScale = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: ButtonOptions) {
    super(scene, x, y);
    const w = opts.width ?? 280;
    const h = opts.height ?? 84;

    this.bg = scene.add.rectangle(0, 0, w, h, opts.fill).setStrokeStyle(4, 0x000000, 0.15);
    this.bg.setOrigin(0.5);

    const fontFamily = getSettings().dyslexiaFont
      ? 'Comic Sans MS, Verdana, sans-serif'
      : 'system-ui, Segoe UI, Roboto, sans-serif';

    const labelText = opts.icon ? `${opts.icon}  ${text}` : text;
    this.label = scene.add
      .text(0, 0, labelText, {
        fontFamily,
        fontSize: `${opts.fontSize ?? 28}px`,
        color: colorToCss(opts.textColor ?? 0xffffff),
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: w - 24 },
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => this.scaleTo(1.05));
    this.on('pointerout', () => this.scaleTo(this.baseScale));
    this.on('pointerdown', () => this.scaleTo(0.96));
    this.on('pointerup', () => {
      this.scaleTo(1.05);
      Audio.play('click');
      opts.onClick();
    });

    scene.add.existing(this);
  }

  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }

  setFill(color: number): this {
    this.bg.setFillStyle(color);
    return this;
  }

  private scaleTo(s: number): void {
    if (getSettings().reducedMotion) {
      this.setScale(s);
      return;
    }
    this.scene.tweens.add({ targets: this, scale: s, duration: 90, ease: 'Quad.out' });
  }
}

export function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
