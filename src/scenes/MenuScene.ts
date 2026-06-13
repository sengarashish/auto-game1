import Phaser from 'phaser';
import { SceneKeys, type QuizSceneData } from './keys';
import {
  addGradientBackground,
  addPanel,
  primaryText,
  accentText,
  mutedText,
  textOn,
} from '../ui/scenery';
import { getTheme, THEMES } from '../config/themes';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { Button } from '../ui/Button';
import { Audio } from '../audio/AudioManager';
import { getSettings, updateSettings } from '../config/settings';
import { Ambiance } from '../ui/ambiance';
import { GRADE_BANDS, type Difficulty, type GradeBand, type SubjectId } from '../quiz/types';
import { SUBJECTS, getTopic, topicsFor } from '../data/catalog';
import { getActiveProfile, updateProfile, type Profile } from '../profiles/ProfileStore';

const QUESTION_COUNTS = [5, 10, 15, 20];
const DIFFICULTIES: { id: Difficulty; label: string; icon: string }[] = [
  { id: 1, label: 'Easy', icon: '🟢' },
  { id: 2, label: 'Medium', icon: '🟡' },
  { id: 3, label: 'Hard', icon: '🔴' },
];

const STEP_TITLES = ['Pick a Subject', 'Choose Topics', 'Set It Up', 'Pick a Theme'];

/**
 * Build-your-quiz wizard. One decision per step keeps the layout clean and
 * readable (no squeezing, no overlap), with a persistent footer for Back/Next.
 */
export class MenuScene extends Phaser.Scene {
  private profile!: Profile;
  private theme = getTheme('space');
  private ambiance?: Ambiance;
  private bg?: Phaser.GameObjects.Image;
  private content!: Phaser.GameObjects.Container;
  private headerTitle!: Phaser.GameObjects.Text;
  private profileNameText!: Phaser.GameObjects.Text;
  private profileStatsText!: Phaser.GameObjects.Text;
  private stepDots: Phaser.GameObjects.Arc[] = [];
  private backBtn!: Button;
  private nextBtn!: Button;

  // Wizard state
  private step = 0;
  private subjectId: SubjectId = 'math';
  private gradeBand: GradeBand = 'pk-k';
  private selectedTopics = new Set<string>();
  private difficulty: Difficulty = 1;
  private questionCount = 10;

  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    Audio.unlock();
    const profile = getActiveProfile();
    if (!profile) {
      this.scene.start(SceneKeys.Profile);
      return;
    }
    this.profile = profile;
    this.gradeBand = profile.gradeBand;
    this.theme = getTheme(profile.theme);

    this.buildStatic();
    this.applyTheme();
    this.renderStep();
  }

  // --- Persistent chrome (built once) ---------------------------------------

  private buildStatic(): void {
    this.content = this.add.container(0, 0);

    // Tap-to-sparkle interactivity (reads current theme each tap).
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapSparkle(p));

    // Header.
    this.headerTitle = this.add
      .text(GAME_WIDTH / 2, 56, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Step dots.
    STEP_TITLES.forEach((_t, i) => {
      const dot = this.add
        .circle(GAME_WIDTH / 2 + (i - (STEP_TITLES.length - 1) / 2) * 34, 100, 7, 0xffffff, 0.4)
        .setDepth(5);
      this.stepDots.push(dot);
    });

    // Profile chip + controls (top-left / top-right).
    this.add.text(30, 28, this.profile.avatar, { fontSize: '40px' }).setDepth(5);
    this.profileNameText = this.add
      .text(80, 30, this.profile.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setDepth(5);
    this.profileStatsText = this.add
      .text(80, 60, `⭐ ${this.profile.totalStars}  🏅 ${this.profile.badges.length}`, {
        fontSize: '18px',
        color: '#ffd166',
      })
      .setDepth(5);

    this.iconButton(GAME_WIDTH - 50, 44, '⚙️', () => this.showSettings());
    this.iconButton(GAME_WIDTH - 110, 44, '🔄', () => this.scene.start(SceneKeys.Profile));

    // Footer buttons (persistent, updated per step).
    this.backBtn = new Button(this, 150, GAME_HEIGHT - 56, 'Back', {
      icon: '◀',
      fill: 0x44507a,
      width: 200,
      height: 76,
      fontSize: 26,
      onClick: () => this.goBack(),
    });
    this.backBtn.setDepth(5);

    this.nextBtn = new Button(this, GAME_WIDTH - 170, GAME_HEIGHT - 56, 'Next', {
      icon: '▶',
      fill: this.theme.accent,
      textColor: 0x1b1b3a,
      width: 240,
      height: 76,
      fontSize: 28,
      onClick: () => this.goNext(),
    });
    this.nextBtn.setDepth(5);
  }

  private applyTheme(): void {
    this.bg?.destroy();
    this.bg = addGradientBackground(this, this.theme);
    this.ambiance?.stop();
    this.ambiance = new Ambiance(this, this.theme).start();
    this.nextBtn.setFill(this.theme.accent);

    // Keep persistent chrome readable when the theme changes mid-flow.
    this.headerTitle.setColor(primaryText(this.theme));
    this.profileNameText.setColor(primaryText(this.theme));
    this.profileStatsText.setColor(accentText(this.theme));
  }

  // --- Step routing ----------------------------------------------------------

  private renderStep(): void {
    this.content.removeAll(true);
    this.headerTitle.setText(STEP_TITLES[this.step]);
    this.stepDots.forEach((d, i) =>
      d.setFillStyle(i === this.step ? this.theme.accent : 0xffffff, i === this.step ? 1 : 0.4),
    );
    this.backBtn.setVisible(this.step > 0);
    this.nextBtn.setLabel(this.step === STEP_TITLES.length - 1 ? 'Start!' : 'Next');

    switch (this.step) {
      case 0:
        this.stepSubjectGrade();
        break;
      case 1:
        this.stepTopics();
        break;
      case 2:
        this.stepOptions();
        break;
      case 3:
        this.stepTheme();
        break;
    }
  }

  private goNext(): void {
    if (this.step === 1 && this.selectedTopics.size === 0) {
      Audio.speak('Please pick at least one topic');
      this.flashHint('Pick at least one topic to continue!');
      return;
    }
    if (this.step === STEP_TITLES.length - 1) {
      this.launch();
      return;
    }
    this.step++;
    this.renderStep();
  }

  private goBack(): void {
    if (this.step === 0) return;
    this.step--;
    this.renderStep();
  }

  // --- Step 0: subject + grade ----------------------------------------------

  private stepSubjectGrade(): void {
    this.track(
      this.add
        .text(GAME_WIDTH / 2, 160, 'What do you want to practice?', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          color: accentText(this.theme),
        })
        .setOrigin(0.5),
    );

    SUBJECTS.forEach((s, i) => {
      const x = GAME_WIDTH / 2 + (i - (SUBJECTS.length - 1) / 2) * 340;
      const selected = this.subjectId === s.id;
      const card = addPanel(this, x, 290, 300, 180, selected ? this.theme.accent : this.theme.panel, 1, 24);
      this.track(card);
      this.track(this.add.text(x, 260, s.icon, { fontSize: '70px' }).setOrigin(0.5));
      this.track(
        this.add
          .text(x, 350, s.title, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '28px',
            color: textOn(selected ? this.theme.accent : this.theme.panel),
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 280 },
          })
          .setOrigin(0.5),
      );
      this.hitArea(x, 290, 300, 180, () => {
        this.subjectId = s.id;
        this.selectedTopics.clear();
        Audio.speak(s.title);
        this.renderStep();
      });
    });

    this.track(
      this.add
        .text(GAME_WIDTH / 2, 440, 'Grade level', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          color: accentText(this.theme),
        })
        .setOrigin(0.5),
    );
    GRADE_BANDS.forEach((b, i) => {
      const x = GAME_WIDTH / 2 + (i - (GRADE_BANDS.length - 1) / 2) * 200;
      const selected = this.gradeBand === b.id;
      this.track(
        new Button(this, x, 510, b.label, {
          fill: selected ? this.theme.accent : 0x44507a,
          textColor: selected ? 0x1b1b3a : 0xffffff,
          width: 185,
          height: 66,
          fontSize: 22,
          onClick: () => {
            this.gradeBand = b.id;
            this.selectedTopics.clear();
            this.renderStep();
          },
        }),
      );
    });
  }

  // --- Step 1: topics (multi-select) ----------------------------------------

  private stepTopics(): void {
    const all = topicsFor(this.subjectId);
    const inBand = all.filter((t) => t.gradeBands.includes(this.gradeBand));
    const topics = inBand.length > 0 ? inBand : all;

    this.track(
      this.add
        .text(GAME_WIDTH / 2, 150, `Tap to pick one or more  •  ${this.selectedTopics.size} selected`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          color: accentText(this.theme),
        })
        .setOrigin(0.5),
    );

    // Select all / clear.
    this.track(
      new Button(this, GAME_WIDTH / 2 - 110, 198, 'Select All', {
        fill: 0x44507a,
        width: 200,
        height: 50,
        fontSize: 20,
        onClick: () => {
          topics.forEach((t) => this.selectedTopics.add(t.id));
          this.renderStep();
        },
      }),
    );
    this.track(
      new Button(this, GAME_WIDTH / 2 + 110, 198, 'Clear', {
        fill: 0x44507a,
        width: 200,
        height: 50,
        fontSize: 20,
        onClick: () => {
          this.selectedTopics.clear();
          this.renderStep();
        },
      }),
    );

    const perRow = 3;
    const startY = 270;
    const cardW = 290;
    const cardH = 96;
    topics.forEach((t, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = GAME_WIDTH / 2 + (col - (perRow - 1) / 2) * (cardW + 16);
      const y = startY + row * (cardH + 14);
      const selected = this.selectedTopics.has(t.id);

      const card = addPanel(this, x, y, cardW, cardH, selected ? this.theme.correct : this.theme.panel, 1, 18);
      this.track(card);
      this.track(this.add.text(x - cardW / 2 + 36, y, t.icon, { fontSize: '38px' }).setOrigin(0.5));
      this.track(
        this.add
          .text(x - cardW / 2 + 70, y, t.title, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '21px',
            color: textOn(selected ? this.theme.correct : this.theme.panel),
            fontStyle: 'bold',
            wordWrap: { width: cardW - 110 },
          })
          .setOrigin(0, 0.5),
      );
      if (selected) {
        this.track(
          this.add
            .text(x + cardW / 2 - 28, y, '✓', { fontSize: '30px', color: textOn(this.theme.correct) })
            .setOrigin(0.5),
        );
      }

      // Card tap zone first...
      this.hitArea(x, y, cardW, cardH, () => {
        if (this.selectedTopics.has(t.id)) this.selectedTopics.delete(t.id);
        else {
          this.selectedTopics.add(t.id);
          Audio.speak(t.title);
        }
        Audio.play('pop');
        this.renderStep();
      });

      // ...then the standards ⓘ on top so it stays tappable.
      const info = this.add
        .text(x + cardW / 2 - 22, y - cardH / 2 + 16, 'ⓘ', { fontSize: '18px', color: mutedText(this.theme) })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      info.on('pointerup', (_p: unknown, _lx: unknown, _ly: unknown, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.showStandards(t.id);
      });
      this.track(info);
    });
  }

  // --- Step 2: difficulty + count -------------------------------------------

  private stepOptions(): void {
    this.track(
      this.add
        .text(GAME_WIDTH / 2, 180, 'How tricky?', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '26px',
          color: accentText(this.theme),
        })
        .setOrigin(0.5),
    );
    DIFFICULTIES.forEach((d, i) => {
      const x = GAME_WIDTH / 2 + (i - 1) * 230;
      const selected = this.difficulty === d.id;
      this.track(
        new Button(this, x, 260, d.label, {
          icon: d.icon,
          fill: selected ? this.theme.accent : 0x44507a,
          textColor: selected ? 0x1b1b3a : 0xffffff,
          width: 210,
          height: 90,
          fontSize: 28,
          onClick: () => {
            this.difficulty = d.id;
            this.renderStep();
          },
        }),
      );
    });

    this.track(
      this.add
        .text(GAME_WIDTH / 2, 380, 'How many questions?', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '26px',
          color: accentText(this.theme),
        })
        .setOrigin(0.5),
    );
    QUESTION_COUNTS.forEach((c, i) => {
      const x = GAME_WIDTH / 2 + (i - (QUESTION_COUNTS.length - 1) / 2) * 180;
      const selected = this.questionCount === c;
      this.track(
        new Button(this, x, 460, String(c), {
          fill: selected ? this.theme.accent : 0x44507a,
          textColor: selected ? 0x1b1b3a : 0xffffff,
          width: 150,
          height: 90,
          fontSize: 34,
          onClick: () => {
            this.questionCount = c;
            this.renderStep();
          },
        }),
      );
    });

    // Quick recap of what they picked.
    const topicNames = [...this.selectedTopics]
      .map((id) => getTopic(id)?.title)
      .filter(Boolean)
      .join(', ');
    this.track(
      this.add
        .text(GAME_WIDTH / 2, 580, `Topics: ${topicNames}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          color: mutedText(this.theme),
          align: 'center',
          wordWrap: { width: 800 },
        })
        .setOrigin(0.5),
    );
  }

  // --- Step 3: theme picker with live preview -------------------------------

  private stepTheme(): void {
    this.track(
      this.add
        .text(GAME_WIDTH / 2, 160, 'Tap a theme — watch it come alive!', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          color: accentText(this.theme),
        })
        .setOrigin(0.5),
    );

    const perRow = 2;
    const cardW = 380;
    const cardH = 200;
    THEMES.forEach((t, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = GAME_WIDTH / 2 + (col - (perRow - 1) / 2) * (cardW + 30);
      const y = 300 + row * (cardH + 30);
      const selected = this.profile.theme === t.id;

      // Mini gradient swatch as a live preview.
      const swatchKey = `swatch-${t.id}`;
      if (!this.textures.exists(swatchKey)) {
        const tex = this.textures.createCanvas(swatchKey, cardW, cardH);
        const ctx = tex?.getContext();
        if (ctx) {
          const grad = ctx.createLinearGradient(0, 0, 0, cardH);
          grad.addColorStop(0, `#${t.bgTop.toString(16).padStart(6, '0')}`);
          grad.addColorStop(1, `#${t.bgBottom.toString(16).padStart(6, '0')}`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, cardW, cardH);
          tex?.refresh();
        }
      }
      const swatch = this.add.image(x, y, swatchKey);
      this.track(swatch);

      const border = this.add.graphics();
      border.lineStyle(selected ? 8 : 3, selected ? this.theme.accent : 0xffffff, selected ? 1 : 0.5);
      border.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 18);
      this.track(border);

      // Live preview: mascot + a couple of animated drifters inside the card.
      const mascot = this.add.text(x - 110, y, t.mascot, { fontSize: '70px' }).setOrigin(0.5);
      this.track(mascot);
      this.tweens.add({ targets: mascot, y: y - 14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

      this.track(
        this.add
          .text(x + 40, y - 20, `${t.icon} ${t.name}`, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '30px',
            color: `#${t.text.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      if (selected) {
        this.track(
          this.add.text(x + 40, y + 30, '✓ Selected', { fontSize: '22px', color: primaryText(t) }).setOrigin(0.5),
        );
      }

      this.hitArea(x, y, cardW, cardH, () => {
        this.profile = updateProfile(this.profile.id, { theme: t.id }) ?? this.profile;
        this.theme = getTheme(t.id);
        Audio.play('whoosh');
        this.applyTheme(); // background + ambiance change instantly
        this.renderStep();
      });
    });
  }

  // --- Launch ----------------------------------------------------------------

  private launch(): void {
    const data: QuizSceneData = {
      config: {
        subjectId: this.subjectId,
        topicIds: [...this.selectedTopics],
        gradeBand: this.gradeBand,
        difficulty: this.difficulty,
        questionCount: this.questionCount,
      },
      themeId: this.profile.theme,
    };
    this.scene.start(SceneKeys.Quiz, data);
  }

  // --- Helpers ---------------------------------------------------------------

  /** Add an object to the per-step content container so it is cleared on nav. */
  private track<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.content.add(o);
    return o;
  }

  /** Invisible interactive zone over a card (added to content). */
  private hitArea(x: number, y: number, w: number, h: number, onClick: () => void): void {
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      Audio.play('click');
      onClick();
    });
    this.track(zone);
  }

  private iconButton(x: number, y: number, icon: string, onClick: () => void): void {
    const t = this.add
      .text(x, y, icon, { fontSize: '34px' })
      .setOrigin(0.5)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });
    t.on('pointerup', () => {
      Audio.play('click');
      onClick();
    });
  }

  private tapSparkle(p: Phaser.Input.Pointer): void {
    if (getSettings().reducedMotion || !this.textures.exists('p_spark')) return;
    const emitter = this.add.particles(p.x, p.y, 'p_spark', {
      speed: { min: 60, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 450,
      quantity: 5,
      tint: [this.theme.accent, this.theme.correct, 0xffffff],
      emitting: false,
    });
    emitter.setDepth(3000);
    emitter.explode(5);
    this.time.delayedCall(550, () => emitter.destroy());
  }

  private flashHint(msg: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 130, msg, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#1b1b3a',
        backgroundColor: '#ffd166',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 500, onComplete: () => t.destroy() });
  }

  private showStandards(topicId: string): void {
    const topic = getTopic(topicId);
    if (!topic) return;
    const overlay = this.add.container(0, 0).setDepth(3000);
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
    dim.setInteractive().on('pointerup', () => overlay.destroy());
    const panel = addPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 720, 420, this.theme.panel, 1, 24);
    const text = [
      `${topic.icon}  ${topic.title}`,
      '',
      'Common Core (CCSS):',
      ...(topic.ccss.length ? topic.ccss.map((c) => `  • ${c}`) : ['  • —']),
      '',
      'Florida B.E.S.T.:',
      ...(topic.flBest.length ? topic.flBest.map((c) => `  • ${c}`) : ['  • —']),
    ].join('\n');
    overlay.add([
      dim,
      panel,
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, text, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          color: textOn(this.theme.panel),
          align: 'left',
          lineSpacing: 6,
        })
        .setOrigin(0.5),
      this.add
        .text(GAME_WIDTH / 2 + 330, GAME_HEIGHT / 2 - 190, '✕', { fontSize: '28px', color: textOn(this.theme.panel) })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => overlay.destroy()),
    ]);
  }

  private showSettings(): void {
    const overlay = this.add.container(0, 0).setDepth(3000);
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
    dim.setInteractive().on('pointerup', () => overlay.destroy());
    const panel = addPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 640, 480, this.theme.panel, 1, 24);
    overlay.add([dim, panel]);
    overlay.add(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, '⚙️ Settings', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '32px',
          color: textOn(this.theme.panel),
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    const toggles: { key: keyof ReturnType<typeof getSettings>; label: string }[] = [
      { key: 'narration', label: '🔊 Read aloud' },
      { key: 'sound', label: '🎵 Sound effects' },
      { key: 'reducedMotion', label: '🐢 Reduce motion' },
      { key: 'dyslexiaFont', label: '🔡 Easy-read font' },
    ];
    toggles.forEach((t, i) => {
      const y = GAME_HEIGHT / 2 - 110 + i * 80;
      overlay.add(
        this.add
          .text(GAME_WIDTH / 2 - 230, y, t.label, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '26px',
            color: textOn(this.theme.panel),
          })
          .setOrigin(0, 0.5),
      );
      const makeBtn = (): Button => {
        const on = getSettings()[t.key];
        const btn = new Button(this, GAME_WIDTH / 2 + 200, y, on ? 'ON' : 'OFF', {
          fill: on ? this.theme.correct : 0x666666,
          width: 120,
          height: 56,
          fontSize: 22,
          onClick: () => {
            updateSettings({ [t.key]: !getSettings()[t.key] });
            btn.destroy();
            overlay.add(makeBtn());
          },
        });
        return btn;
      };
      overlay.add(makeBtn());
    });
  }
}
