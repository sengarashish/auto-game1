import Phaser from 'phaser';
import { SceneKeys, type QuizSceneData, type ResultsSceneData } from './keys';
import { addGradientBackground, addPanel, primaryText, accentText } from '../ui/scenery';
import { getTheme, type Theme } from '../config/themes';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { Button } from '../ui/Button';
import { Audio } from '../audio/AudioManager';
import { getSettings } from '../config/settings';
import { confetti } from '../ui/effects';
import { Ambiance } from '../ui/ambiance';
import { ensureParticleTextures } from '../ui/textures';
import { BADGE_INFO } from '../profiles/ProfileStore';
import { getTopic } from '../data/catalog';

/** Celebration + summary, with retry / new quiz. */
export class ResultsScene extends Phaser.Scene {
  private resultsData!: ResultsSceneData;
  private theme!: Theme;

  constructor() {
    super(SceneKeys.Results);
  }

  init(data: ResultsSceneData): void {
    this.resultsData = data;
    this.theme = getTheme(data.themeId);
  }

  create(): void {
    const { result } = this.resultsData;
    ensureParticleTextures(this);
    addGradientBackground(this, this.theme);
    new Ambiance(this, this.theme).start();

    const topicIds = result.config.topicIds;
    let heading: string;
    if (topicIds.length === 1) {
      const topic = getTopic(topicIds[0]);
      heading = `${topic?.icon ?? ''} ${topic?.title ?? 'Quiz'} Complete!`;
    } else {
      heading = `🎲 Mixed Quiz Complete!`;
    }
    this.add
      .text(GAME_WIDTH / 2, 70, heading, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: primaryText(this.theme),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Stars (animated pop-in).
    const starY = 200;
    for (let i = 0; i < 3; i++) {
      const earned = i < result.stars;
      const star = this.add
        .text(GAME_WIDTH / 2 + (i - 1) * 110, starY, earned ? '⭐' : '☆', {
          fontSize: '90px',
          color: earned ? '#ffd166' : '#888888',
        })
        .setOrigin(0.5);
      if (earned && !getSettings().reducedMotion) {
        star.setScale(0);
        this.tweens.add({
          targets: star,
          scale: 1,
          duration: 350,
          delay: 250 * i,
          ease: 'Back.out',
          onStart: () => Audio.play('star'),
        });
      }
    }

    // Score line.
    this.add
      .text(GAME_WIDTH / 2, 310, `${result.correctCount} / ${result.total} correct`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        color: primaryText(this.theme),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 354, this.encouragement(result.accuracy), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: accentText(this.theme),
      })
      .setOrigin(0.5);

    // New badges.
    if (this.resultsData.newBadges.length > 0) {
      const badgeY = 430;
      this.add
        .text(GAME_WIDTH / 2, badgeY - 36, 'New Badges!', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          color: primaryText(this.theme),
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.resultsData.newBadges.forEach((b, i) => {
        const info = BADGE_INFO[b];
        if (!info) return;
        const x = GAME_WIDTH / 2 + (i - (this.resultsData.newBadges.length - 1) / 2) * 200;
        addPanel(this, x, badgeY + 30, 180, 90, this.theme.panel, 1, 16);
        this.add.text(x - 60, badgeY + 30, info.icon, { fontSize: '44px' }).setOrigin(0.5);
        this.add
          .text(x + 20, badgeY + 30, info.label, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            color: primaryText(this.theme),
            align: 'center',
            wordWrap: { width: 110 },
          })
          .setOrigin(0.5);
      });
    }

    // Actions.
    new Button(this, GAME_WIDTH / 2 - 200, GAME_HEIGHT - 90, 'Play Again', {
      icon: '🔁',
      fill: this.theme.correct,
      width: 300,
      onClick: () => {
        const data: QuizSceneData = { config: { ...result.config, seed: undefined }, themeId: this.resultsData.themeId };
        this.scene.start(SceneKeys.Quiz, data);
      },
    });
    new Button(this, GAME_WIDTH / 2 + 200, GAME_HEIGHT - 90, 'New Quiz', {
      icon: '🏠',
      fill: this.theme.accent,
      textColor: 0x1b1b3a,
      width: 300,
      onClick: () => this.scene.start(SceneKeys.Menu),
    });

    if (result.stars >= 2) {
      confetti(this, GAME_WIDTH / 2, 120, 90);
    }
    Audio.speak(this.encouragement(result.accuracy));
  }

  private encouragement(accuracy: number): string {
    if (accuracy >= 0.9) return 'Amazing! You are a superstar! 🌟';
    if (accuracy >= 0.7) return 'Great work! Keep it up! 💪';
    if (accuracy >= 0.5) return 'Good try! Practice makes perfect! 😊';
    return "Nice effort! Let's try again! 🚀";
  }
}
