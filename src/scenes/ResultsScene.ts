import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { SceneKeys, type QuizSceneData, type ResultsSceneData } from './keys';
import { addPanel, primaryText, accentText } from '../ui/scenery';
import { getTheme, type Theme } from '../config/themes';
import { Button } from '../ui/Button';
import { Audio } from '../audio/AudioManager';
import { getSettings } from '../config/settings';
import { confetti } from '../ui/effects';
import { Ambiance } from '../ui/ambiance';
import { ensureParticleTextures } from '../ui/textures';
import { BADGE_INFO } from '../profiles/ProfileStore';
import { getTopic } from '../data/catalog';

/** Celebration + summary, with retry / new quiz. Responsive. */
export class ResultsScene extends BaseScene {
  private resultsData!: ResultsSceneData;
  private theme!: Theme;
  private ui!: Phaser.GameObjects.Container;
  private celebrated = false;

  constructor() {
    super(SceneKeys.Results);
  }

  init(data: ResultsSceneData): void {
    this.resultsData = data;
    this.theme = getTheme(data.themeId);
    this.celebrated = false;
  }

  create(): void {
    ensureParticleTextures(this);
    this.setBackground(this.theme);
    new Ambiance(this, this.theme).start();
    this.ui = this.add.container();
    this.enableResponsive();
    this.layout();
  }

  layout(): void {
    this.ui.removeAll(true);
    const { result } = this.resultsData;
    const topicIds = result.config.topicIds;

    let heading: string;
    if (topicIds.length === 1) {
      const topic = getTopic(topicIds[0]);
      heading = `${topic?.icon ?? ''} ${topic?.title ?? 'Quiz'} Complete!`;
    } else {
      heading = `🎲 Mixed Quiz Complete!`;
    }

    this.add2(
      this.add
        .text(this.cx, this.px(60), heading, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(38),
          color: primaryText(this.theme),
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: this.W - this.px(40) },
        })
        .setOrigin(0.5),
    );

    // Stars.
    const starY = this.px(170);
    const starGap = this.px(110);
    for (let i = 0; i < 3; i++) {
      const earned = i < result.stars;
      const star = this.add2(
        this.add
          .text(this.cx + (i - 1) * starGap, starY, earned ? '⭐' : '☆', {
            fontSize: this.fs(90),
            color: earned ? '#ffd166' : '#888888',
          })
          .setOrigin(0.5),
      );
      if (earned && !getSettings().reducedMotion && !this.celebrated) {
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

    this.add2(
      this.add
        .text(this.cx, this.px(265), `${result.correctCount} / ${result.total} correct`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(34),
          color: primaryText(this.theme),
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    this.add2(
      this.add
        .text(this.cx, this.px(308), this.encouragement(result.accuracy), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(24),
          color: accentText(this.theme),
          align: 'center',
          wordWrap: { width: this.W - this.px(40) },
        })
        .setOrigin(0.5),
    );

    // New badges.
    if (this.resultsData.newBadges.length > 0) {
      const badgeY = this.px(380);
      this.add2(
        this.add
          .text(this.cx, badgeY - this.px(34), 'New Badges!', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: this.fs(24),
            color: primaryText(this.theme),
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      const bw = this.px(180);
      const gap = this.px(20);
      this.resultsData.newBadges.forEach((b, i) => {
        const info = BADGE_INFO[b];
        if (!info) return;
        const total = this.resultsData.newBadges.length;
        const x = this.cx + (i - (total - 1) / 2) * (bw + gap);
        this.add2(addPanel(this, x, badgeY + this.px(30), bw, this.px(90), this.theme.panel, 1, this.px(16)));
        this.add2(this.add.text(x - this.px(60), badgeY + this.px(30), info.icon, { fontSize: this.fs(44) }).setOrigin(0.5));
        this.add2(
          this.add
            .text(x + this.px(20), badgeY + this.px(30), info.label, {
              fontFamily: 'system-ui, sans-serif',
              fontSize: this.fs(18),
              color: primaryText(this.theme),
              align: 'center',
              wordWrap: { width: this.px(110) },
            })
            .setOrigin(0.5),
        );
      });
    }

    // Actions (stack on narrow screens).
    const by = this.H - this.px(70);
    if (this.portrait || this.W < 700) {
      this.actionButton(this.cx, by - this.px(50), 'Play Again', '🔁', this.theme.correct, 0xffffff, () => this.playAgain());
      this.actionButton(this.cx, by + this.px(30), 'New Quiz', '🏠', this.theme.accent, 0x1b1b3a, () =>
        this.scene.start(SceneKeys.Menu),
      );
    } else {
      this.actionButton(this.cx - this.px(170), by, 'Play Again', '🔁', this.theme.correct, 0xffffff, () => this.playAgain());
      this.actionButton(this.cx + this.px(170), by, 'New Quiz', '🏠', this.theme.accent, 0x1b1b3a, () =>
        this.scene.start(SceneKeys.Menu),
      );
    }

    if (result.stars >= 2 && !this.celebrated) {
      confetti(this, this.cx, this.px(110), 90);
      Audio.speak(this.encouragement(result.accuracy));
    }
    this.celebrated = true;
  }

  private actionButton(
    x: number,
    y: number,
    label: string,
    icon: string,
    fill: number,
    textColor: number,
    onClick: () => void,
  ): void {
    this.add2(
      new Button(this, x, y, label, {
        icon,
        fill,
        textColor,
        width: this.px(300),
        height: this.px(76),
        fontSize: this.px(26),
        onClick,
      }),
    );
  }

  private playAgain(): void {
    const data: QuizSceneData = {
      config: { ...this.resultsData.result.config, seed: undefined },
      themeId: this.resultsData.themeId,
    };
    this.scene.start(SceneKeys.Quiz, data);
  }

  private add2<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.ui.add(o);
    return o;
  }

  private encouragement(accuracy: number): string {
    if (accuracy >= 0.9) return 'Amazing! You are a superstar! 🌟';
    if (accuracy >= 0.7) return 'Great work! Keep it up! 💪';
    if (accuracy >= 0.5) return 'Good try! Practice makes perfect! 😊';
    return "Nice effort! Let's try again! 🚀";
  }
}
