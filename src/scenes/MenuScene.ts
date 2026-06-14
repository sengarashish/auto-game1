import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { SceneKeys, type QuizSceneData } from './keys';
import { addPanel, primaryText, accentText, mutedText, textOn } from '../ui/scenery';
import { getTheme, THEMES } from '../config/themes';
import { Button } from '../ui/Button';
import { Audio } from '../audio/AudioManager';
import { Piper } from '../audio/piper';
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

/** Build-your-quiz wizard. Fully responsive: everything reflows in layout(). */
export class MenuScene extends BaseScene {
  private profile!: Profile;
  private theme = getTheme('space');
  private ambiance?: Ambiance;
  private ui!: Phaser.GameObjects.Container;

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

    this.setBackground(this.theme);
    this.ambiance = new Ambiance(this, this.theme).start();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapSparkle(p));
    this.ui = this.add.container();
    this.enableResponsive();
    this.layout();
  }

  private applyTheme(): void {
    this.setBackground(this.theme);
    this.ambiance?.stop();
    this.ambiance = new Ambiance(this, this.theme).start();
    this.layout();
  }

  // --- Layout ---------------------------------------------------------------

  layout(): void {
    if (!this.ui) return;
    this.ui.removeAll(true);
    this.header();
    this.footer();

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

  private get contentTop(): number {
    return this.top + this.px(122);
  }
  private get contentBottom(): number {
    return this.bottom - this.px(98);
  }

  private add2<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.ui.add(o);
    return o;
  }

  private header(): void {
    const t = this.top;
    this.add2(this.add.text(this.px(16), t + this.px(4), this.profile.avatar, { fontSize: this.fs(40) }));
    this.add2(
      this.add.text(this.px(64), t + this.px(6), this.profile.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: this.fs(22),
        color: primaryText(this.theme),
        fontStyle: 'bold',
      }),
    );
    this.add2(
      this.add.text(this.px(64), t + this.px(34), `⭐ ${this.profile.totalStars}  🏅 ${this.profile.badges.length}`, {
        fontSize: this.fs(16),
        color: accentText(this.theme),
      }),
    );

    this.iconBtn(this.W - this.px(36), t + this.px(24), '⚙️', () => this.showSettings());
    this.iconBtn(this.W - this.px(82), t + this.px(24), '🔄', () => this.scene.start(SceneKeys.Profile));

    this.add2(
      this.add
        .text(this.cx, t + this.px(68), STEP_TITLES[this.step], {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(36),
          color: primaryText(this.theme),
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    STEP_TITLES.forEach((_t, i) => {
      this.add2(
        this.add.circle(
          this.cx + (i - (STEP_TITLES.length - 1) / 2) * this.px(30),
          t + this.px(102),
          this.px(6),
          i === this.step ? this.theme.accent : 0xffffff,
          i === this.step ? 1 : 0.4,
        ),
      );
    });
  }

  private footer(): void {
    const y = this.bottom - this.px(40);
    if (this.step > 0) {
      this.add2(
        new Button(this, this.px(110), y, 'Back', {
          icon: '◀',
          fill: 0x44507a,
          width: this.px(180),
          height: this.px(72),
          fontSize: this.px(24),
          onClick: () => this.goBack(),
        }),
      );
    }
    const isLast = this.step === STEP_TITLES.length - 1;
    this.add2(
      new Button(this, this.W - this.px(130), y, isLast ? 'Start!' : 'Next', {
        icon: isLast ? '🎮' : '▶',
        fill: isLast ? this.theme.correct : this.theme.accent,
        textColor: isLast ? 0xffffff : 0x1b1b3a,
        width: this.px(210),
        height: this.px(72),
        fontSize: this.px(26),
        onClick: () => this.goNext(),
      }),
    );
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
    this.layout();
  }

  private goBack(): void {
    if (this.step === 0) return;
    this.step--;
    this.layout();
  }

  // --- Step 0 ---------------------------------------------------------------

  private stepSubjectGrade(): void {
    const top = this.contentTop;
    this.sectionLabel('What do you want to practice?', this.cx, top + this.px(10), true);

    const cardW = this.portrait ? Math.min(this.px(300), this.W - this.px(60)) : this.px(280);
    const cardH = this.px(150);
    const gap = this.px(40);
    SUBJECTS.forEach((s, i) => {
      let x: number;
      let y: number;
      if (this.portrait) {
        x = this.cx;
        y = top + this.px(70) + cardH / 2 + i * (cardH + gap);
      } else {
        x = this.cx + (i - (SUBJECTS.length - 1) / 2) * (cardW + gap);
        y = top + this.px(110) + cardH / 2;
      }
      const selected = this.subjectId === s.id;
      this.add2(addPanel(this, x, y, cardW, cardH, selected ? this.theme.accent : this.theme.panel, 1, this.px(22)));
      this.add2(this.add.text(x, y - cardH * 0.18, s.icon, { fontSize: this.fs(64) }).setOrigin(0.5));
      this.add2(
        this.add
          .text(x, y + cardH * 0.26, s.title, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: this.fs(26),
            color: textOn(selected ? this.theme.accent : this.theme.panel),
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: cardW - this.px(20) },
          })
          .setOrigin(0.5),
      );
      this.hitArea(x, y, cardW, cardH, () => {
        this.subjectId = s.id;
        this.selectedTopics.clear();
        Audio.speak(s.title);
        this.layout();
      });
    });

    // Grade picker near the bottom of the content area.
    const gradeY = this.contentBottom - this.px(70);
    this.sectionLabel('Grade level', this.cx, gradeY - this.px(50), true);
    const gradeCols = this.portrait ? 2 : 4;
    const gw = Math.min(this.px(180), (this.W - this.px(40)) / gradeCols - this.px(10));
    GRADE_BANDS.forEach((b, i) => {
      const col = i % gradeCols;
      const row = Math.floor(i / gradeCols);
      const totalW = gradeCols * gw + (gradeCols - 1) * this.px(16);
      const x = this.cx - totalW / 2 + gw / 2 + col * (gw + this.px(16));
      const y = gradeY + row * this.px(64);
      const selected = this.gradeBand === b.id;
      this.add2(
        new Button(this, x, y, b.label, {
          fill: selected ? this.theme.accent : 0x44507a,
          textColor: selected ? 0x1b1b3a : 0xffffff,
          width: gw,
          height: this.px(56),
          fontSize: this.px(20),
          onClick: () => {
            this.gradeBand = b.id;
            this.selectedTopics.clear();
            this.layout();
          },
        }),
      );
    });
  }

  // --- Step 1 ---------------------------------------------------------------

  private stepTopics(): void {
    const all = topicsFor(this.subjectId);
    const inBand = all.filter((t) => t.gradeBands.includes(this.gradeBand));
    const topics = inBand.length > 0 ? inBand : all;
    const top = this.contentTop;

    this.sectionLabel(
      `Tap to pick one or more  •  ${this.selectedTopics.size} selected`,
      this.cx,
      top,
      true,
    );

    const btnY = top + this.px(40);
    this.add2(
      new Button(this, this.cx - this.px(110), btnY, 'Select All', {
        fill: 0x44507a,
        width: this.px(200),
        height: this.px(46),
        fontSize: this.px(18),
        onClick: () => {
          topics.forEach((t) => this.selectedTopics.add(t.id));
          this.layout();
        },
      }),
    );
    this.add2(
      new Button(this, this.cx + this.px(110), btnY, 'Clear', {
        fill: 0x44507a,
        width: this.px(200),
        height: this.px(46),
        fontSize: this.px(18),
        onClick: () => {
          this.selectedTopics.clear();
          this.layout();
        },
      }),
    );

    const gridTop = btnY + this.px(40);
    const gridH = this.contentBottom - gridTop;
    const cols = this.portrait ? 2 : this.W < 900 ? 2 : 3;
    const rows = Math.ceil(topics.length / cols);
    const gapX = this.px(16);
    const gapY = this.px(12);
    const cardW = Math.min(this.px(300), (this.W - this.px(40) - (cols - 1) * gapX) / cols);
    const cardH = Math.max(this.px(60), Math.min(this.px(96), (gridH - (rows - 1) * gapY) / rows));

    topics.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const totalW = cols * cardW + (cols - 1) * gapX;
      const x = this.cx - totalW / 2 + cardW / 2 + col * (cardW + gapX);
      const y = gridTop + cardH / 2 + row * (cardH + gapY);
      const selected = this.selectedTopics.has(t.id);

      this.add2(addPanel(this, x, y, cardW, cardH, selected ? this.theme.correct : this.theme.panel, 1, this.px(16)));
      this.add2(this.add.text(x - cardW / 2 + this.px(34), y, t.icon, { fontSize: this.fs(34) }).setOrigin(0.5));
      this.add2(
        this.add
          .text(x - cardW / 2 + this.px(66), y, t.title, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: this.fs(20),
            color: textOn(selected ? this.theme.correct : this.theme.panel),
            fontStyle: 'bold',
            wordWrap: { width: cardW - this.px(100) },
          })
          .setOrigin(0, 0.5),
      );
      if (selected) {
        this.add2(
          this.add
            .text(x + cardW / 2 - this.px(24), y, '✓', { fontSize: this.fs(28), color: textOn(this.theme.correct) })
            .setOrigin(0.5),
        );
      }

      this.hitArea(x, y, cardW, cardH, () => {
        if (this.selectedTopics.has(t.id)) this.selectedTopics.delete(t.id);
        else {
          this.selectedTopics.add(t.id);
          Audio.speak(t.title);
        }
        Audio.play('pop');
        this.layout();
      });

      const info = this.add
        .text(x + cardW / 2 - this.px(20), y - cardH / 2 + this.px(14), 'ⓘ', {
          fontSize: this.fs(16),
          color: mutedText(this.theme),
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      info.on('pointerup', (_p: unknown, _lx: unknown, _ly: unknown, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.showStandards(t.id);
      });
      this.add2(info);
    });
  }

  // --- Step 2 ---------------------------------------------------------------

  private stepOptions(): void {
    const top = this.contentTop;
    this.sectionLabel('How tricky?', this.cx, top + this.px(20), true);
    const dW = Math.min(this.px(210), (this.W - this.px(60)) / 3 - this.px(10));
    DIFFICULTIES.forEach((d, i) => {
      const x = this.cx + (i - 1) * (dW + this.px(16));
      this.add2(
        new Button(this, x, top + this.px(90), d.label, {
          icon: d.icon,
          fill: this.difficulty === d.id ? this.theme.accent : 0x44507a,
          textColor: this.difficulty === d.id ? 0x1b1b3a : 0xffffff,
          width: dW,
          height: this.px(84),
          fontSize: this.px(26),
          onClick: () => {
            this.difficulty = d.id;
            this.layout();
          },
        }),
      );
    });

    this.sectionLabel('How many questions?', this.cx, top + this.px(180), true);
    const qW = Math.min(this.px(150), (this.W - this.px(60)) / 4 - this.px(10));
    QUESTION_COUNTS.forEach((c, i) => {
      const x = this.cx + (i - (QUESTION_COUNTS.length - 1) / 2) * (qW + this.px(16));
      this.add2(
        new Button(this, x, top + this.px(250), String(c), {
          fill: this.questionCount === c ? this.theme.accent : 0x44507a,
          textColor: this.questionCount === c ? 0x1b1b3a : 0xffffff,
          width: qW,
          height: this.px(84),
          fontSize: this.px(32),
          onClick: () => {
            this.questionCount = c;
            this.layout();
          },
        }),
      );
    });

    const topicNames = [...this.selectedTopics]
      .map((id) => getTopic(id)?.title)
      .filter(Boolean)
      .join(', ');
    this.add2(
      this.add
        .text(this.cx, this.contentBottom - this.px(20), `Topics: ${topicNames}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(18),
          color: mutedText(this.theme),
          align: 'center',
          wordWrap: { width: this.W - this.px(80) },
        })
        .setOrigin(0.5),
    );
  }

  // --- Step 3 ---------------------------------------------------------------

  private stepTheme(): void {
    const top = this.contentTop;
    this.sectionLabel('Tap a theme — watch it come alive!', this.cx, top + this.px(6), true);

    const gridTop = top + this.px(40);
    const gridH = this.contentBottom - gridTop;
    const cols = this.portrait ? 1 : 2;
    const rows = Math.ceil(THEMES.length / cols);
    const gapX = this.px(24);
    const gapY = this.px(20);
    const cardW = Math.min(this.px(380), (this.W - this.px(50) - (cols - 1) * gapX) / cols);
    const cardH = Math.max(this.px(110), Math.min(this.px(190), (gridH - (rows - 1) * gapY) / rows));

    THEMES.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const totalW = cols * cardW + (cols - 1) * gapX;
      const x = this.cx - totalW / 2 + cardW / 2 + col * (cardW + gapX);
      const y = gridTop + cardH / 2 + row * (cardH + gapY);
      const selected = this.profile.theme === t.id;

      const swatchKey = `swatch-${t.id}`;
      if (!this.textures.exists(swatchKey)) {
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillGradientStyle(t.bgTop, t.bgTop, t.bgBottom, t.bgBottom, 1);
        g.fillRect(0, 0, 380, 190);
        g.generateTexture(swatchKey, 380, 190);
        g.destroy();
      }
      const swatch = this.add.image(x, y, swatchKey);
      swatch.setDisplaySize(cardW, cardH);
      this.add2(swatch);

      const border = this.add.graphics();
      border.lineStyle(selected ? this.px(8) : this.px(3), selected ? this.theme.accent : 0xffffff, selected ? 1 : 0.5);
      border.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, this.px(18));
      this.add2(border);

      const mascot = this.add.text(x - cardW * 0.28, y, t.mascot, { fontSize: this.fs(64) }).setOrigin(0.5);
      this.add2(mascot);
      this.tweens.add({ targets: mascot, y: y - this.px(12), duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

      this.add2(
        this.add
          .text(x + cardW * 0.1, y - this.px(18), `${t.icon} ${t.name}`, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: this.fs(28),
            color: primaryText(t),
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      if (selected) {
        this.add2(
          this.add.text(x + cardW * 0.1, y + this.px(26), '✓ Selected', { fontSize: this.fs(20), color: primaryText(t) }).setOrigin(0.5),
        );
      }

      this.hitArea(x, y, cardW, cardH, () => {
        this.profile = updateProfile(this.profile.id, { theme: t.id }) ?? this.profile;
        this.theme = getTheme(t.id);
        Audio.play('whoosh');
        this.applyTheme();
      });
    });
  }

  // --- Launch + helpers -----------------------------------------------------

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

  private sectionLabel(text: string, x: number, y: number, center = false): void {
    this.add2(
      this.add
        .text(x, y, text, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(22),
          color: accentText(this.theme),
        })
        .setOrigin(center ? 0.5 : 0, 0.5),
    );
  }

  private hitArea(x: number, y: number, w: number, h: number, onClick: () => void): void {
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      Audio.play('click');
      onClick();
    });
    this.add2(zone);
  }

  private iconBtn(x: number, y: number, icon: string, onClick: () => void): void {
    const t = this.add.text(x, y, icon, { fontSize: this.fs(32) }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerup', () => {
      Audio.play('click');
      onClick();
    });
    this.add2(t);
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
      .text(this.cx, this.bottom - this.px(110), msg, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: this.fs(22),
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
    const pw = Math.min(this.px(720), this.W - this.px(30));
    const ph = Math.min(this.px(420), this.H - this.px(30));
    const dim = this.add.rectangle(this.cx, this.cy, this.W, this.H, 0x000000, 0.6);
    dim.setInteractive().on('pointerup', () => overlay.destroy());
    const panel = addPanel(this, this.cx, this.cy, pw, ph, this.theme.panel, 1, this.px(24));
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
        .text(this.cx, this.cy, text, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(20),
          color: textOn(this.theme.panel),
          align: 'left',
          lineSpacing: 6,
        })
        .setOrigin(0.5),
      this.add
        .text(this.cx + pw / 2 - this.px(28), this.cy - ph / 2 + this.px(24), '✕', {
          fontSize: this.fs(26),
          color: textOn(this.theme.panel),
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => overlay.destroy()),
    ]);
  }

  private showSettings(): void {
    const overlay = this.add.container(0, 0).setDepth(3000);
    const pw = Math.min(this.px(640), this.W - this.px(30));
    const ph = Math.min(this.px(480), this.H - this.px(30));
    const dim = this.add.rectangle(this.cx, this.cy, this.W, this.H, 0x000000, 0.6);
    dim.setInteractive().on('pointerup', () => overlay.destroy());
    const panel = addPanel(this, this.cx, this.cy, pw, ph, this.theme.panel, 1, this.px(24));
    overlay.add([dim, panel]);
    overlay.add(
      this.add
        .text(this.cx, this.cy - ph / 2 + this.px(40), '⚙️ Settings', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(32),
          color: textOn(this.theme.panel),
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    const toggles: { key: keyof ReturnType<typeof getSettings>; label: string }[] = [
      { key: 'narration', label: '🔊 Read aloud' },
      { key: 'naturalVoice', label: '🎙️ Natural voice' },
      { key: 'sound', label: '🎵 Sound effects' },
      { key: 'reducedMotion', label: '🐢 Reduce motion' },
      { key: 'dyslexiaFont', label: '🔡 Easy-read font' },
    ];
    const rowGap = Math.min(this.px(80), (ph - this.px(150)) / toggles.length);
    toggles.forEach((t, i) => {
      const y = this.cy - ph / 2 + this.px(110) + i * rowGap;
      overlay.add(
        this.add
          .text(this.cx - pw / 2 + this.px(40), y, t.label, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: this.fs(26),
            color: textOn(this.theme.panel),
          })
          .setOrigin(0, 0.5),
      );
      const makeBtn = (): Button => {
        const on = getSettings()[t.key];
        const btn = new Button(this, this.cx + pw / 2 - this.px(90), y, on ? 'ON' : 'OFF', {
          fill: on ? this.theme.correct : 0x666666,
          width: this.px(120),
          height: this.px(54),
          fontSize: this.px(22),
          onClick: () => {
            const next = !getSettings()[t.key];
            updateSettings({ [t.key]: next });
            // Start downloading the neural voice as soon as it's switched on.
            if (t.key === 'naturalVoice' && next) void Piper.init();
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
