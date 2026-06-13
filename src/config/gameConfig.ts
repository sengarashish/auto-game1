/**
 * Phaser game configuration. Uses RESIZE scale mode so the canvas always
 * matches the real viewport (no letterboxing). Scenes read `this.scale.width/
 * height` and reflow on resize — see BaseScene. The constants below are only a
 * *design reference* used to scale font/element sizes proportionally.
 */
import Phaser from 'phaser';

/** Design-reference dimensions (used only for proportional scaling math). */
export const REF_WIDTH = 1024;
export const REF_HEIGHT = 768;

export function createGameConfig(scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1b1b3a',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    scene: scenes,
  };
}
