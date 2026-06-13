import Phaser from 'phaser';
import { SceneKeys } from './keys';
import { addGradientBackground } from '../ui/scenery';
import { getTheme } from '../config/themes';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { ensureParticleTextures } from '../ui/textures';

/**
 * Preload scene. We render with emoji + synthesized audio, so there are no
 * binary assets to fetch — this shows a brief themed splash with a progress
 * bar (also the place to load real assets later via this.load.*).
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    // Progress bar wiring (ready for future asset loading).
    const barBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 400, 24, 0x000000, 0.3);
    const bar = this.add
      .rectangle(barBg.x - 196, barBg.y, 8, 16, 0xffd166)
      .setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => bar.setSize(8 + 376 * p, 16));
  }

  create(): void {
    ensureParticleTextures(this);
    addGradientBackground(this, getTheme('space'));
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '🚀  Quiz Quest', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '56px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'Learning Adventure', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.time.delayedCall(700, () => this.scene.start(SceneKeys.Profile));
  }
}
