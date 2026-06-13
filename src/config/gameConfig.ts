/**
 * Phaser game configuration. Uses a responsive FIT scale so the game looks
 * right on tablets, phones, and desktops — the primary devices for kids.
 */
import Phaser from 'phaser';

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;

export function createGameConfig(scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1b1b3a',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    scale: {
      mode: Phaser.Scale.FIT,
      // Center horizontally but anchor to the TOP. On tall/portrait phones this
      // keeps the game pinned to the top of the screen instead of floating in
      // the vertical middle with a big empty band above it.
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    scene: scenes,
  };
}
