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
  /**
   * When set, a small 🔊 badge is shown on the left of the button. Tapping it
   * reads this text aloud (for pre-/early readers) without triggering onClick.
   */
  speak?: string;
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

    const fontSize = opts.fontSize ?? 28;
    // A read-aloud badge (if requested) sits on the left; nudge the label right
    // and narrow its wrap so the two never overlap.
    const speakPad = opts.speak ? Math.round(fontSize * 1.4) : 0;
    const labelText = opts.icon ? `${opts.icon}  ${text}` : text;
    this.label = scene.add
      .text(speakPad / 2, 0, labelText, {
        fontFamily,
        fontSize: `${fontSize}px`,
        color: colorToCss(opts.textColor ?? 0xffffff),
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: w - 24 - speakPad },
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);

    if (opts.speak) {
      const badge = scene.add
        .text(-w / 2 + Math.round(fontSize * 0.8), 0, '🔊', { fontSize: `${Math.round(fontSize * 0.82)}px` })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      badge.on('pointerup', (_p: unknown, _lx: unknown, _ly: unknown, ev?: Phaser.Types.Input.EventData) => {
        ev?.stopPropagation();
        Audio.play('click');
        Audio.speak(opts.speak!, { force: true });
      });
      this.add(badge);
    }
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
