import Phaser from 'phaser';
import { SceneKeys, type QuizSceneData } from './keys';
import { addGradientBackground, addPanel } from '../ui/scenery';
import { getTheme, THEMES } from '../config/themes';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { Button } from '../ui/Button';
import { Audio } from '../audio/AudioManager';
import { getSettings, updateSettings } from '../config/settings';
import { GRADE_BANDS, type Difficulty, type GradeBand, type SubjectId } from '../quiz/types';
import { SUBJECTS, getTopic, topicsFor } from '../data/catalog';
import { getActiveProfile, updateProfile, type Profile } from '../profiles/ProfileStore';

const QUESTION_COUNTS = [5, 10, 15, 20];
const DIFFICULTIES: { id: Difficulty; label: string; icon: string }[] = [
  { id: 1, label: 'Easy', icon: '🟢' },
  { id: 2, label: 'Medium', icon: '🟡' },
  { id: 3, label: 'Hard', icon: '🔴' },
];

/** Builds a QuizConfig: subject → topic → grade → difficulty → count → theme. */
export class MenuScene extends Phaser.Scene {
  private profile!: Profile;
  private theme = getTheme('space');

  // Selection state
  private subjectId: SubjectId = 'math';
  private topicId: string | null = null;
  private gradeBand: GradeBand = 'pk-k';
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

    this.render();
  }

  private render(): void {
    this.children.removeAll();
    addGradientBackground(this, this.theme);

    // Header with profile + settings.
    this.add.text(40, 30, this.profile.avatar, { fontSize: '48px' });
    this.add.text(110, 38, this.profile.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.add.text(110, 76, `⭐ ${this.profile.totalStars}   🏅 ${this.profile.badges.length}`, {
      fontSize: '20px',
      color: '#ffd166',
    });

    this.iconToggle(GAME_WIDTH - 60, 50, '⚙️', () => this.showSettings());
    this.iconToggle(GAME_WIDTH - 130, 50, '🔄', () => this.scene.start(SceneKeys.Profile));

    this.add
      .text(GAME_WIDTH / 2, 130, 'Build Your Quiz', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    let y = 200;
    this.sectionLabel('1. Subject', y - 30);
    this.subjectRow(y + 10);
    y += 90;

    this.sectionLabel('2. Topic', y);
    this.topicGrid(y + 40);
    y += 230;

    this.sectionLabel('3. Grade', y);
    this.gradeRow(y + 40);
    y += 100;

    this.sectionLabel('4. Difficulty', y);
    this.difficultyRow(y + 40);
    y += 100;

    this.sectionLabel('5. Questions', y);
    this.countRow(y + 40);

    // Theme + Start
    this.themeRow(GAME_HEIGHT - 150);
    this.renderStart();
  }

  private sectionLabel(text: string, y: number): void {
    this.add.text(60, y, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#ffd166',
      fontStyle: 'bold',
    });
  }

  private subjectRow(y: number): void {
    SUBJECTS.forEach((s, i) => {
      const x = 200 + i * 240;
      new Button(this, x, y, s.title, {
        icon: s.icon,
        fill: this.subjectId === s.id ? this.theme.accent : 0x44507a,
        textColor: this.subjectId === s.id ? 0x1b1b3a : 0xffffff,
        width: 220,
        height: 60,
        fontSize: 24,
        onClick: () => {
          this.subjectId = s.id;
          this.topicId = null;
          this.render();
        },
      });
    });
  }

  private topicGrid(y: number): void {
    const topics = topicsFor(this.subjectId).filter((t) => t.gradeBands.includes(this.gradeBand));
    const list = topics.length > 0 ? topics : topicsFor(this.subjectId);
    const perRow = 6;
    list.forEach((t, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = GAME_WIDTH / 2 + (col - (perRow - 1) / 2) * 158;
      const ty = y + row * 80;
      const selected = this.topicId === t.id;
      new Button(this, x, ty, t.title, {
        icon: t.icon,
        fill: selected ? this.theme.correct : 0x2f3a63,
        width: 148,
        height: 66,
        fontSize: 17,
        onClick: () => {
          this.topicId = t.id;
          Audio.speak(t.title);
          this.render();
        },
      });
    });
  }

  private gradeRow(y: number): void {
    GRADE_BANDS.forEach((b, i) => {
      const x = GAME_WIDTH / 2 + (i - (GRADE_BANDS.length - 1) / 2) * 180;
      new Button(this, x, y, b.label, {
        fill: this.gradeBand === b.id ? this.theme.accent : 0x44507a,
        textColor: this.gradeBand === b.id ? 0x1b1b3a : 0xffffff,
        width: 165,
        height: 56,
        fontSize: 20,
        onClick: () => {
          this.gradeBand = b.id;
          this.topicId = null;
          this.render();
        },
      });
    });
  }

  private difficultyRow(y: number): void {
    DIFFICULTIES.forEach((d, i) => {
      const x = GAME_WIDTH / 2 + (i - 1) * 200;
      new Button(this, x, y, d.label, {
        icon: d.icon,
        fill: this.difficulty === d.id ? this.theme.accent : 0x44507a,
        textColor: this.difficulty === d.id ? 0x1b1b3a : 0xffffff,
        width: 185,
        height: 56,
        fontSize: 22,
        onClick: () => {
          this.difficulty = d.id;
          this.render();
        },
      });
    });
  }

  private countRow(y: number): void {
    QUESTION_COUNTS.forEach((c, i) => {
      const x = GAME_WIDTH / 2 + (i - (QUESTION_COUNTS.length - 1) / 2) * 130;
      new Button(this, x, y, String(c), {
        fill: this.questionCount === c ? this.theme.accent : 0x44507a,
        textColor: this.questionCount === c ? 0x1b1b3a : 0xffffff,
        width: 110,
        height: 56,
        fontSize: 24,
        onClick: () => {
          this.questionCount = c;
          this.render();
        },
      });
    });
  }

  private themeRow(y: number): void {
    this.add.text(60, y - 28, 'Theme', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffd166',
      fontStyle: 'bold',
    });
    THEMES.forEach((t, i) => {
      const x = 120 + i * 90;
      const selected = this.profile.theme === t.id;
      const chip = this.add
        .text(x, y + 6, t.icon, { fontSize: selected ? '44px' : '34px' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      chip.on('pointerup', () => {
        this.profile = updateProfile(this.profile.id, { theme: t.id }) ?? this.profile;
        this.theme = getTheme(t.id);
        Audio.play('click');
        this.render();
      });
    });
  }

  private renderStart(): void {
    const ready = this.topicId !== null;
    new Button(this, GAME_WIDTH - 180, GAME_HEIGHT - 90, 'Start!', {
      icon: '▶️',
      fill: ready ? this.theme.correct : 0x555555,
      width: 280,
      height: 84,
      fontSize: 32,
      onClick: () => {
        if (!this.topicId) {
          Audio.speak('Please pick a topic first');
          return;
        }
        this.launch();
      },
    });

    // Parent/teacher standards info for the selected topic.
    if (this.topicId) {
      const info = this.add
        .text(60, GAME_HEIGHT - 60, 'ⓘ standards', { fontSize: '18px', color: '#cfd6ff' })
        .setInteractive({ useHandCursor: true });
      info.on('pointerup', () => this.showStandards());
    }
  }

  private launch(): void {
    const topic = getTopic(this.topicId as string);
    if (!topic) return;
    const data: QuizSceneData = {
      config: {
        subjectId: this.subjectId,
        topicId: topic.id,
        gradeBand: this.gradeBand,
        difficulty: this.difficulty,
        questionCount: this.questionCount,
      },
      themeId: this.profile.theme,
    };
    this.scene.start(SceneKeys.Quiz, data);
  }

  private iconToggle(x: number, y: number, icon: string, onClick: () => void): void {
    const t = this.add
      .text(x, y, icon, { fontSize: '36px' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    t.on('pointerup', () => {
      Audio.play('click');
      onClick();
    });
  }

  private showStandards(): void {
    const topic = getTopic(this.topicId as string);
    if (!topic) return;
    const overlay = this.add.container(0, 0).setDepth(3000);
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
    const panel = addPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 720, 420, this.theme.panel, 1, 24);
    dim.setInteractive().on('pointerup', () => overlay.destroy());
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
          color: '#ffffff',
          align: 'left',
          lineSpacing: 6,
        })
        .setOrigin(0.5),
      this.add
        .text(GAME_WIDTH / 2 + 330, GAME_HEIGHT / 2 - 190, '✕', { fontSize: '28px', color: '#ffffff' })
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
          color: '#ffffff',
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
            color: '#ffffff',
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
