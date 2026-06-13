/**
 * Entry point: builds the Phaser game and registers scenes in flow order.
 */
import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { ProfileScene } from './scenes/ProfileScene';
import { MenuScene } from './scenes/MenuScene';
import { QuizScene } from './scenes/QuizScene';
import { ResultsScene } from './scenes/ResultsScene';

const game = new Phaser.Game(
  createGameConfig([BootScene, PreloadScene, ProfileScene, MenuScene, QuizScene, ResultsScene]),
);

// Remove the HTML loading placeholder once the game canvas is up.
game.events.once(Phaser.Core.Events.READY, () => {
  document.getElementById('loading')?.remove();
});
