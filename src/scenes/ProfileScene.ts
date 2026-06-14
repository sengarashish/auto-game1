import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { SceneKeys } from './keys';
import { addPanel } from '../ui/scenery';
import { getTheme } from '../config/themes';
import { Button } from '../ui/Button';
import { Audio } from '../audio/AudioManager';
import { GRADE_BANDS, type GradeBand } from '../quiz/types';
import {
  AVATARS,
  createProfile,
  deleteProfile,
  listProfiles,
  setActiveProfile,
  type Profile,
} from '../profiles/ProfileStore';

/** Pick or create a kid profile. Responsive grid. */
export class ProfileScene extends BaseScene {
  private theme = getTheme('space');
  private ui!: Phaser.GameObjects.Container;

  constructor() {
    super(SceneKeys.Profile);
  }

  create(): void {
    Audio.unlock();
    this.setBackground(this.theme);
    this.ui = this.add.container();
    this.enableResponsive();
    this.layout();
  }

  layout(): void {
    this.ui.removeAll(true);

    this.add2(
      this.add
        .text(this.cx, this.top + this.px(50), "Who's playing today?", {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(44),
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    const profiles = listProfiles();
    const cols = this.portrait ? 2 : Math.min(4, Math.max(1, Math.floor(this.W / 220)));
    const cardW = Math.min(this.px(180), (this.W - this.px(40)) / cols - this.px(16));
    const cardH = cardW * 1.05;
    const gapX = this.px(28);
    const gapY = this.px(40);
    const startY = this.top + this.px(140);

    profiles.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const totalW = cols * cardW + (cols - 1) * gapX;
      const x = this.cx - totalW / 2 + cardW / 2 + col * (cardW + gapX);
      const y = startY + cardH / 2 + row * (cardH + gapY);
      this.profileCard(p, x, y, cardW, cardH);
    });

    this.add2(
      new Button(this, this.cx, this.bottom - this.px(60), 'New Player', {
        icon: '➕',
        fill: this.theme.accent,
        textColor: 0x1b1b3a,
        width: this.px(320),
        height: this.px(76),
        fontSize: this.px(26),
        onClick: () => this.showCreatePanel(),
      }),
    );
  }

  private profileCard(p: Profile, x: number, y: number, w: number, h: number): void {
    const card = addPanel(this, x, y, w, h, this.theme.panel, 1, this.px(20));
    card.setInteractive(
      new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.add2(card);
    this.add2(this.add.text(x, y - h * 0.22, p.avatar, { fontSize: this.fs(70) }).setOrigin(0.5));
    this.add2(
      this.add
        .text(x, y + h * 0.15, p.name, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(26),
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    this.add2(
      this.add.text(x, y + h * 0.33, `⭐ ${p.totalStars}`, { fontSize: this.fs(22), color: '#ffd166' }).setOrigin(0.5),
    );

    const del = this.add
      .text(x + w / 2 - this.px(20), y - h / 2 + this.px(16), '✕', { fontSize: this.fs(22), color: '#ffffff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    del.on('pointerup', (_p: unknown, _lx: unknown, _ly: unknown, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (confirm(`Delete ${p.name}'s profile? This removes their stars and badges.`)) {
        deleteProfile(p.id);
        this.layout();
      }
    });
    this.add2(del);

    card.on('pointerup', () => {
      Audio.play('click');
      setActiveProfile(p.id);
      this.scene.start(SceneKeys.Menu);
    });
  }

  private add2<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.ui.add(o);
    return o;
  }

  private showCreatePanel(): void {
    const name = (window.prompt('Enter the player’s first name:', '') ?? '').trim();
    if (!name) return;

    const overlay = this.add.container(0, 0).setDepth(2000);
    const pw = Math.min(this.px(760), this.W - this.px(30));
    const ph = Math.min(this.px(540), this.H - this.px(30));
    const dim = this.add.rectangle(this.cx, this.cy, this.W, this.H, 0x000000, 0.55);
    const panel = addPanel(this, this.cx, this.cy, pw, ph, this.theme.panel, 1, this.px(28));
    overlay.add([dim, panel]);

    overlay.add(
      this.add
        .text(this.cx, this.cy - ph / 2 + this.px(40), `Hi ${name}! Pick your buddy:`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(30),
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    let chosenAvatar = AVATARS[0];
    const avCols = 6;
    const avSize = this.px(54);
    const avGap = Math.min(this.px(56), (pw - this.px(60)) / avCols);
    const avTop = this.cy - ph / 2 + this.px(110);
    const avatarTexts: Phaser.GameObjects.Text[] = [];
    AVATARS.forEach((a, i) => {
      const col = i % avCols;
      const rowI = Math.floor(i / avCols);
      const ax = this.cx + (col - (avCols - 1) / 2) * avGap;
      const ay = avTop + rowI * this.px(86);
      const t = this.add
        .text(ax, ay, a, { fontSize: `${avSize}px` })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerup', () => {
        chosenAvatar = a;
        avatarTexts.forEach((o) => o.setAlpha(0.45).setScale(1));
        t.setAlpha(1).setScale(1.25);
        Audio.play('click');
      });
      avatarTexts.push(t);
      overlay.add(t);
    });
    avatarTexts.forEach((o, i) => o.setAlpha(i === 0 ? 1 : 0.45));
    avatarTexts[0].setScale(1.25);

    overlay.add(
      this.add
        .text(this.cx, this.cy + this.px(40), 'Pick your grade:', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: this.fs(28),
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    let chosenBand: GradeBand = 'pk-k';
    const bandButtons: Button[] = [];
    const bandGap = Math.min(this.px(175), (pw - this.px(40)) / GRADE_BANDS.length);
    GRADE_BANDS.forEach((b, i) => {
      const bx = this.cx + (i - (GRADE_BANDS.length - 1) / 2) * bandGap;
      const btn = new Button(this, bx, this.cy + this.px(100), b.label, {
        fill: i === 0 ? this.theme.accent : 0x44507a,
        textColor: i === 0 ? 0x1b1b3a : 0xffffff,
        width: Math.min(this.px(160), bandGap - this.px(8)),
        height: this.px(64),
        fontSize: this.px(20),
        onClick: () => {
          chosenBand = b.id;
          bandButtons.forEach((bb, j) => bb.setFill(j === i ? this.theme.accent : 0x44507a));
        },
      });
      bandButtons.push(btn);
      overlay.add(btn);
    });

    overlay.add(
      new Button(this, this.cx, this.cy + ph / 2 - this.px(50), "Let's Go!", {
        icon: '🎮',
        fill: this.theme.correct,
        width: this.px(320),
        height: this.px(72),
        onClick: () => {
          createProfile(name, chosenAvatar, chosenBand);
          this.scene.start(SceneKeys.Menu);
        },
      }),
    );
  }
}
