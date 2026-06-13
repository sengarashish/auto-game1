import Phaser from 'phaser';
import { SceneKeys } from './keys';

/** Minimal boot: nothing to load yet, hand off to Preload. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.scene.start(SceneKeys.Preload);
  }
}
