import Phaser from 'phaser';
import { SceneKeys, type QuizSceneData, type ResultsSceneData } from './keys';
import { addGradientBackground, addPanel } from '../ui/scenery';
import { getTheme, type Theme } from '../config/themes';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { Button } from '../ui/Button';
import { Audio } from '../audio/AudioManager';
import { getSettings } from '../config/settings';
import { shake, starburst } from '../ui/effects';
import { QuizEngine } from '../quiz/QuizEngine';
import type { Choice, Question } from '../quiz/types';
import { getActiveProfile, recordResult } from '../profiles/ProfileStore';

/** The gameplay scene: shows a question, grades the answer, gives feedback. */
export class QuizScene extends Phaser.Scene {
  private quizData!: QuizSceneData;
  private theme!: Theme;
  private engine!: QuizEngine;
  private attempts = 0;
  private locked = false;

  private mascot!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private starText!: Phaser.GameObjects.Text;
  private choiceButtons: Button[] = [];

  constructor() {
    super(SceneKeys.Quiz);
  }

  init(data: QuizSceneData): void {
    this.quizData = data;
    this.theme = getTheme(data.themeId);
    this.engine = new QuizEngine(data.config);
    this.attempts = 0;
    this.locked = false;
  }

  create(): void {
    Audio.unlock();
    addGradientBackground(this, this.theme);

    // Top bar: quit, progress, stars-so-far.
    new Button(this, 70, 44, 'Quit', {
      icon: '🚪',
      fill: 0x44507a,
      width: 120,
      height: 56,
      fontSize: 20,
      onClick: () => this.scene.start(SceneKeys.Menu),
    });

    const barBg = this.add.rectangle(GAME_WIDTH / 2, 44, 460, 26, 0x000000, 0.3).setOrigin(0.5);
    this.progressFill = this.add
      .rectangle(barBg.x - 228, 44, 4, 18, this.theme.accent)
      .setOrigin(0, 0.5);

    this.starText = this.add
      .text(GAME_WIDTH - 70, 44, '⭐ 0', { fontSize: '26px', color: '#ffd166' })
      .setOrigin(0.5);

    // Mascot in the corner.
    this.mascot = this.add.text(90, GAME_HEIGHT - 110, this.theme.mascot, { fontSize: '90px' }).setOrigin(0.5);

    this.showQuestion();
  }

  private showQuestion(): void {
    this.attempts = 0;
    this.locked = false;
    this.choiceButtons.forEach((b) => b.destroy());
    this.choiceButtons = [];

    const q = this.engine.currentQuestion;
    this.updateProgress();

    // Question number.
    this.cleanupTag('qnum');
    this.add
      .text(GAME_WIDTH / 2, 90, `Question ${this.engine.currentIndex + 1} of ${this.engine.total}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#cfd6ff',
      })
      .setOrigin(0.5)
      .setData('tag', 'qnum');

    this.renderPrompt(q);
    this.renderChoices(q);

    // Narrate the prompt automatically (for pre-readers / read-to-me).
    Audio.speak(q.speak ?? q.prompt);
  }

  private renderPrompt(q: Question): void {
    this.cleanupTag('prompt');
    const panel = addPanel(this, GAME_WIDTH / 2, 230, 820, 200, this.theme.panel, 1, 24);
    panel.setData('tag', 'prompt');

    if (q.promptImage) {
      this.add
        .text(GAME_WIDTH / 2, 190, q.promptImage, {
          fontSize: q.promptImage.length > 6 ? '44px' : '72px',
          align: 'center',
          wordWrap: { width: 760 },
        })
        .setOrigin(0.5)
        .setData('tag', 'prompt');
    }

    const speaker = this.add
      .text(GAME_WIDTH / 2 + 360, 160, '🔊', { fontSize: '34px' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setData('tag', 'prompt');
    speaker.on('pointerup', () => Audio.speak(q.speak ?? q.prompt, { force: true }));

    this.add
      .text(GAME_WIDTH / 2, q.promptImage ? 270 : 230, q.prompt, {
        fontFamily: getSettings().dyslexiaFont
          ? 'Comic Sans MS, Verdana, sans-serif'
          : 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 760 },
      })
      .setOrigin(0.5)
      .setData('tag', 'prompt');
  }

  private renderChoices(q: Question): void {
    const choices = q.choices ?? [];
    const n = choices.length;
    const cols = n <= 2 ? n : 2;
    const startY = 430;
    const spacingX = 420;
    const spacingY = 110;

    choices.forEach((choice, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = GAME_WIDTH / 2 + (col - (cols - 1) / 2) * spacingX;
      const y = startY + row * spacingY;
      const label = choice.image ? `${choice.image}  ${choice.label}` : choice.label;
      const btn = new Button(this, x, y, label, {
        fill: 0x2f3a63,
        width: 380,
        height: 90,
        fontSize: 30,
        onClick: () => this.onAnswer(choice, btn),
      });
      this.choiceButtons.push(btn);
    });
  }

  private onAnswer(choice: Choice, btn: Button): void {
    if (this.locked) return;
    const q = this.engine.currentQuestion;
    this.attempts++;
    const correct = this.engine.check(q, choice.id);

    if (correct) {
      this.locked = true;
      btn.setFill(this.theme.correct);
      this.engine.submit(choice.id, this.attempts);
      Audio.play('correct');
      this.cheer(true);
      starburst(this, btn.x, btn.y);
      this.showCheck(btn.x + 150, btn.y, true);
      this.time.delayedCall(getSettings().reducedMotion ? 400 : 1100, () => this.next());
    } else {
      // Gentle: mark wrong, allow another try. After 1 wrong attempt, reveal.
      btn.setFill(this.theme.wrong);
      this.showCheck(btn.x + 150, btn.y, false);
      Audio.play('wrong');
      shake(this, btn);
      this.cheer(false);
      if (this.attempts >= 2) {
        this.locked = true;
        this.engine.submit(choice.id, this.attempts);
        this.revealCorrect();
        this.time.delayedCall(1300, () => this.next());
      }
    }
  }

  private revealCorrect(): void {
    const q = this.engine.currentQuestion;
    this.choiceButtons.forEach((btn, i) => {
      if (q.choices?.[i]?.id === q.answerId) {
        btn.setFill(this.theme.correct);
        starburst(this, btn.x, btn.y);
      }
    });
    if (q.explanation) {
      Audio.speak(q.explanation);
    }
  }

  private showCheck(x: number, y: number, ok: boolean): void {
    // Icon paired with color so feedback never relies on color alone (a11y).
    const t = this.add.text(x, y, ok ? '✅' : '❌', { fontSize: '40px' }).setOrigin(0.5).setDepth(900);
    this.time.delayedCall(1200, () => t.destroy());
  }

  private cheer(ok: boolean): void {
    const phrases = ok
      ? ['Great job!', 'Awesome!', 'You got it!', 'Super!', 'Nice work!']
      : ['Try again!', 'Almost!', 'Keep going!', 'You can do it!'];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.cleanupTag('bubble');
    const bubble = this.add
      .text(200, GAME_HEIGHT - 190, phrase, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#1b1b3a',
        backgroundColor: '#ffffff',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setData('tag', 'bubble');
    if (!getSettings().reducedMotion) {
      this.tweens.add({ targets: this.mascot, y: this.mascot.y - 20, duration: 150, yoyo: true });
    }
    this.time.delayedCall(1200, () => bubble.destroy());
  }

  private next(): void {
    if (this.engine.advance()) {
      this.showQuestion();
    } else {
      this.finish();
    }
  }

  private finish(): void {
    const result = this.engine.result();
    const profile = getActiveProfile();
    let newBadges: string[] = [];
    if (profile) newBadges = recordResult(profile.id, result);
    Audio.play('win');
    const data: ResultsSceneData = { result, themeId: this.quizData.themeId, newBadges };
    this.scene.start(SceneKeys.Results, data);
  }

  private updateProgress(): void {
    const frac = this.engine.total === 0 ? 0 : this.engine.currentIndex / this.engine.total;
    this.progressFill.setSize(4 + 452 * frac, 18);
    const correctSoFar = this.engine
      .result()
      .records.filter((r) => r.correct).length;
    this.starText.setText(`⭐ ${correctSoFar}`);
  }

  private cleanupTag(tag: string): void {
    this.children.list
      .filter((c) => c.getData && c.getData('tag') === tag)
      .forEach((c) => c.destroy());
  }
}
