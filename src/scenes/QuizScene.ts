import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { SceneKeys, type QuizSceneData, type ResultsSceneData } from './keys';
import { addPanel, primaryText, mutedText } from '../ui/scenery';
import { getTheme, type Theme } from '../config/themes';
import { Button } from '../ui/Button';
import { Audio } from '../audio/AudioManager';
import { getSettings } from '../config/settings';
import { randomCelebration, shake, wrongPuff } from '../ui/effects';
import { Ambiance, enableTapSparkles } from '../ui/ambiance';
import { ensureParticleTextures } from '../ui/textures';
import { QuizEngine } from '../quiz/QuizEngine';
import type { Choice, Question } from '../quiz/types';
import { getActiveProfile, recordResult } from '../profiles/ProfileStore';

/** The gameplay scene: shows a question, grades the answer, gives feedback. */
export class QuizScene extends BaseScene {
  private quizData!: QuizSceneData;
  private theme!: Theme;
  private engine!: QuizEngine;
  private attempts = 0;
  private locked = false;
  private streak = 0;

  private hud!: Phaser.GameObjects.Container;
  private board!: Phaser.GameObjects.Container;
  private mascot!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private progressBg!: Phaser.GameObjects.Rectangle;
  private starText!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
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
    this.streak = 0;
  }

  create(): void {
    Audio.unlock();
    ensureParticleTextures(this);
    this.setBackground(this.theme);
    new Ambiance(this, this.theme).start();
    enableTapSparkles(this, this.theme);

    this.hud = this.add.container();
    this.board = this.add.container();
    this.enableResponsive();
    this.layout();
    this.showQuestion();
  }

  /** Rebuild the persistent HUD (top bar + mascot) for the current size. */
  layout(): void {
    this.hud.removeAll(true);

    const rowY = this.top + this.px(26);
    this.hud.add(
      new Button(this, this.px(60), rowY, 'Quit', {
        icon: '🚪',
        fill: 0x44507a,
        width: this.px(110),
        height: this.px(52),
        fontSize: this.px(18),
        onClick: () => this.scene.start(SceneKeys.Menu),
      }),
    );

    const barW = Math.min(this.px(460), this.W - this.px(280));
    this.progressBg = this.add.rectangle(this.cx, rowY, barW, this.px(24), 0x000000, 0.3).setOrigin(0.5);
    this.progressFill = this.add
      .rectangle(this.cx - barW / 2, rowY, this.px(4), this.px(18), this.theme.accent)
      .setOrigin(0, 0.5);
    this.hud.add([this.progressBg, this.progressFill]);

    this.starText = this.add
      .text(this.W - this.px(60), this.top + this.px(18), '⭐ 0', { fontSize: this.fs(24), color: '#ffd166' })
      .setOrigin(0.5);
    this.streakText = this.add
      .text(this.W - this.px(60), this.top + this.px(48), '', { fontSize: this.fs(20), color: '#ff7b00', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.hud.add([this.starText, this.streakText]);

    this.mascot = this.add
      .text(this.px(70), this.bottom - this.px(70), this.theme.mascot, { fontSize: this.fs(80) })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.mascot.on('pointerup', () => {
      Audio.play('pop');
      this.cheer(true);
      this.tweens.add({ targets: this.mascot, scale: 1.2, angle: 8, duration: 120, yoyo: true });
    });
    if (!getSettings().reducedMotion) {
      this.tweens.add({
        targets: this.mascot,
        scaleY: 1.06,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
    this.hud.add(this.mascot);

    // Rebuild the question board for the new size (keep current question).
    if (this.engine) this.renderBoard();
  }

  /** Y where the question board (prompt panel) begins, below the HUD + inset. */
  private get boardTop(): number {
    return this.top + this.px(110);
  }

  private showQuestion(): void {
    this.attempts = 0;
    this.locked = false;
    this.renderBoard();
    Audio.speak(this.engine.currentQuestion.speak ?? this.engine.currentQuestion.prompt);
  }

  /** Draw the prompt + choices for the current question at the current size. */
  private renderBoard(): void {
    this.board.removeAll(true);
    this.choiceButtons = [];
    const q = this.engine.currentQuestion;
    this.updateProgress();

    this.board.add(
      this.add
        .text(this.cx, this.top + this.px(72), `Question ${this.engine.currentIndex + 1} of ${this.engine.total}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(20),
          color: mutedText(this.theme),
        })
        .setOrigin(0.5),
    );

    this.renderPrompt(q);
    this.renderChoices(q);
  }

  private renderPrompt(q: Question): void {
    const panelW = Math.min(this.px(820), this.W - this.px(40));
    const panelH = this.portrait ? this.px(180) : this.px(190);
    const panelY = this.boardTop + panelH / 2;

    this.board.add(addPanel(this, this.cx, panelY, panelW, panelH, this.theme.panel, 1, this.px(24)));

    let textY = panelY;
    if (q.promptImage) {
      this.board.add(
        this.add
          .text(this.cx, panelY - panelH * 0.22, q.promptImage, {
            fontSize: q.promptImage.length > 6 ? this.fs(44) : this.fs(72),
            align: 'center',
            wordWrap: { width: panelW - this.px(60) },
          })
          .setOrigin(0.5),
      );
      textY = panelY + panelH * 0.22;
    }

    const speaker = this.add
      .text(this.cx + panelW / 2 - this.px(34), panelY - panelH / 2 + this.px(28), '🔊', { fontSize: this.fs(32) })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    speaker.on('pointerup', () => Audio.speak(q.speak ?? q.prompt, { force: true }));
    this.board.add(speaker);

    this.board.add(
      this.add
        .text(this.cx, textY, q.prompt, {
          fontFamily: getSettings().dyslexiaFont ? 'Comic Sans MS, Verdana, sans-serif' : 'system-ui, sans-serif',
          fontSize: this.fs(30),
          color: primaryText(this.theme),
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: panelW - this.px(60) },
        })
        .setOrigin(0.5),
    );
  }

  private renderChoices(q: Question): void {
    const choices = q.choices ?? [];
    const n = choices.length;
    // One column on narrow/portrait screens, two when there's room.
    const cols = this.portrait || this.W < 720 ? 1 : 2;
    const rows = Math.ceil(n / cols);

    const areaTop = this.boardTop + (this.portrait ? this.px(180) : this.px(190)) + this.px(30);
    const areaBottom = this.bottom - this.px(100);
    const areaH = areaBottom - areaTop;
    const gapX = this.px(24);
    const gapY = this.px(14);

    const btnW = Math.min(this.px(420), (this.W - this.px(40) - (cols - 1) * gapX) / cols);
    const btnH = Math.max(this.px(58), Math.min(this.px(92), (areaH - (rows - 1) * gapY) / rows));

    const reduced = getSettings().reducedMotion;
    choices.forEach((choice, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const totalW = cols * btnW + (cols - 1) * gapX;
      const x = this.cx - totalW / 2 + btnW / 2 + col * (btnW + gapX);
      const y = areaTop + btnH / 2 + row * (btnH + gapY);
      const label = choice.image ? `${choice.image}  ${choice.label}` : choice.label;
      const btn = new Button(this, x, y, label, {
        fill: 0x2f3a63,
        width: btnW,
        height: btnH,
        fontSize: this.px(28),
        speak: choice.label,
        onClick: () => this.onAnswer(choice, btn),
      });
      this.board.add(btn);
      this.choiceButtons.push(btn);

      if (!reduced) {
        btn.setScale(0);
        this.tweens.add({
          targets: btn,
          scale: 1,
          duration: 300,
          delay: 90 * i,
          ease: 'Back.out',
          onComplete: () => {
            this.tweens.add({
              targets: btn,
              y: y - this.px(5),
              duration: 1100 + i * 120,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.inOut',
            });
          },
        });
      }
    });
  }

  private onAnswer(choice: Choice, btn: Button): void {
    if (this.locked) return;
    const q = this.engine.currentQuestion;
    this.attempts++;
    const correct = this.engine.check(q, choice.id);

    if (correct) {
      this.locked = true;
      this.tweens.killTweensOf(btn);
      btn.setFill(this.theme.correct);
      this.engine.submit(choice.id, this.attempts);
      Audio.play('correct');
      if (!getSettings().reducedMotion) this.tweens.add({ targets: btn, scale: 1.15, duration: 140, yoyo: true });
      randomCelebration(this, btn.x, btn.y, this.theme);
      this.showCheck(btn.x + btn.width / 2 - this.px(10), btn.y - btn.height / 2 + this.px(10), true);
      this.cheer(true);
      this.bumpStreak();
      this.dimOthers(btn);
      this.time.delayedCall(getSettings().reducedMotion ? 450 : 1200, () => this.next());
    } else {
      this.tweens.killTweensOf(btn);
      btn.setFill(this.theme.wrong);
      this.showCheck(btn.x + btn.width / 2 - this.px(10), btn.y - btn.height / 2 + this.px(10), false);
      Audio.play('wrong');
      shake(this, btn);
      wrongPuff(this, btn.x, btn.y);
      this.cheer(false);
      this.resetStreak();
      if (this.attempts >= 2) {
        this.locked = true;
        this.engine.submit(choice.id, this.attempts);
        this.revealCorrect();
        this.time.delayedCall(1400, () => this.next());
      }
    }
  }

  private bumpStreak(): void {
    this.streak++;
    if (this.streak >= 2) {
      this.streakText.setText(`🔥 ${this.streak} streak!`);
      if (!getSettings().reducedMotion) {
        this.streakText.setScale(1.5);
        this.tweens.add({ targets: this.streakText, scale: 1, duration: 300, ease: 'Back.out' });
      }
      if (this.streak >= 3) Audio.play('streak');
    }
  }

  private resetStreak(): void {
    this.streak = 0;
    this.streakText.setText('');
  }

  private dimOthers(chosen: Button): void {
    this.choiceButtons.forEach((b) => {
      if (b !== chosen) {
        this.tweens.killTweensOf(b);
        this.tweens.add({ targets: b, alpha: 0.4, duration: 250 });
      }
    });
  }

  private revealCorrect(): void {
    const q = this.engine.currentQuestion;
    this.choiceButtons.forEach((btn, i) => {
      this.tweens.killTweensOf(btn);
      if (q.choices?.[i]?.id === q.answerId) {
        btn.setFill(this.theme.correct);
        randomCelebration(this, btn.x, btn.y, this.theme);
      }
    });
    if (q.explanation) Audio.speak(q.explanation);
  }

  private showCheck(x: number, y: number, ok: boolean): void {
    const t = this.add.text(x, y, ok ? '✅' : '❌', { fontSize: this.fs(40) }).setOrigin(0.5).setDepth(900);
    if (!getSettings().reducedMotion) {
      t.setScale(0);
      this.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.out' });
    }
    this.time.delayedCall(1200, () => t.destroy());
  }

  private cheer(ok: boolean): void {
    const phrases = ok
      ? ['Great job!', 'Awesome!', 'You got it!', 'Super!', 'Nice work!']
      : ['Try again!', 'Almost!', 'Keep going!', 'You can do it!'];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.cleanupTag('bubble');
    const bubble = this.add
      .text(this.px(150), this.bottom - this.px(140), phrase, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: this.fs(22),
        color: '#1b1b3a',
        backgroundColor: '#ffffff',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setData('tag', 'bubble')
      .setDepth(800);
    if (!getSettings().reducedMotion) {
      this.tweens.add({ targets: this.mascot, y: this.mascot.y - this.px(20), duration: 150, yoyo: true });
    }
    this.time.delayedCall(1200, () => bubble.destroy());
  }

  private next(): void {
    if (this.engine.advance()) this.showQuestion();
    else this.finish();
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
    const barW = this.progressBg.width;
    this.progressFill.setSize(this.px(4) + (barW - this.px(8)) * frac, this.px(18));
    const correctSoFar = this.engine.result().records.filter((r) => r.correct).length;
    this.starText.setText(`⭐ ${correctSoFar}`);
  }

  private cleanupTag(tag: string): void {
    this.children.list.filter((c) => c.getData && c.getData('tag') === tag).forEach((c) => c.destroy());
  }
}
