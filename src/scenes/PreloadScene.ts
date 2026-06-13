import { BaseScene } from './BaseScene';
import { SceneKeys } from './keys';
import { getTheme } from '../config/themes';
import { ensureParticleTextures } from '../ui/textures';

/**
 * Preload scene. We render with emoji + synthesized audio, so there are no
 * binary assets to fetch — a brief themed splash, then on to profile select.
 * (Real asset loading would go in preload() with a progress bar.)
 */
export class PreloadScene extends BaseScene {
  private ui!: Phaser.GameObjects.Container;

  constructor() {
    super(SceneKeys.Preload);
  }

  create(): void {
    ensureParticleTextures(this);
    this.setBackground(getTheme('space'));
    this.ui = this.add.container();
    this.enableResponsive();
    this.layout();
    this.time.delayedCall(700, () => this.scene.start(SceneKeys.Profile));
  }

  layout(): void {
    this.ui.removeAll(true);
    this.ui.add(
      this.add
        .text(this.cx, this.cy - this.px(40), '🚀  Quiz Quest', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(56),
          color: '#ffd166',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    this.ui.add(
      this.add
        .text(this.cx, this.cy + this.px(20), 'Learning Adventure', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(26),
          color: '#ffffff',
        })
        .setOrigin(0.5),
    );
  }
}
