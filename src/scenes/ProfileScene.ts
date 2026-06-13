import Phaser from 'phaser';
import { SceneKeys } from './keys';
import { addGradientBackground, addPanel } from '../ui/scenery';
import { getTheme } from '../config/themes';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
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

/** Pick or create a kid profile. */
export class ProfileScene extends Phaser.Scene {
  private theme = getTheme('space');

  constructor() {
    super(SceneKeys.Profile);
  }

  create(): void {
    Audio.unlock();
    addGradientBackground(this, this.theme);
    this.add
      .text(GAME_WIDTH / 2, 70, "Who's playing today?", {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.renderProfiles();
  }

  private renderProfiles(): void {
    const profiles = listProfiles();
    const startY = 200;
    const perRow = 4;
    const spacingX = 220;
    const spacingY = 230;

    profiles.forEach((p, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = GAME_WIDTH / 2 + (col - (perRow - 1) / 2) * spacingX;
      const y = startY + row * spacingY;
      this.profileCard(p, x, y);
    });

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 90, 'New Player', {
      icon: '➕',
      fill: this.theme.accent,
      textColor: 0x1b1b3a,
      width: 320,
      onClick: () => this.showCreatePanel(),
    });
  }

  private profileCard(p: Profile, x: number, y: number): void {
    const card = addPanel(this, x, y, 180, 190, this.theme.panel, 1, 20);
    card.setInteractive(
      new Phaser.Geom.Rectangle(x - 90, y - 95, 180, 190),
      Phaser.Geom.Rectangle.Contains,
    );
    this.add.text(x, y - 45, p.avatar, { fontSize: '70px' }).setOrigin(0.5);
    this.add
      .text(x, y + 30, p.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 62, `⭐ ${p.totalStars}`, { fontSize: '22px', color: '#ffd166' })
      .setOrigin(0.5);

    // Small delete affordance.
    const del = this.add
      .text(x + 70, y - 80, '✕', { fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    del.on('pointerup', (_p: unknown, _lx: unknown, _ly: unknown, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (confirm(`Delete ${p.name}'s profile? This removes their stars and badges.`)) {
        deleteProfile(p.id);
        this.scene.restart();
      }
    });

    card.on('pointerup', () => {
      Audio.play('click');
      setActiveProfile(p.id);
      this.scene.start(SceneKeys.Menu);
    });
  }

  private showCreatePanel(): void {
    const name = (window.prompt('Enter the player’s first name:', '') ?? '').trim();
    if (!name) return;

    // Overlay to choose an avatar and grade band.
    const overlay = this.add.container(0, 0).setDepth(2000);
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);
    const panel = addPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 540, this.theme.panel, 1, 28);
    overlay.add([dim, panel]);

    overlay.add(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 230, `Hi ${name}! Pick your buddy:`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '30px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    let chosenAvatar = AVATARS[0];
    const avatarTexts: Phaser.GameObjects.Text[] = [];
    AVATARS.forEach((a, i) => {
      const col = i % 6;
      const rowI = Math.floor(i / 6);
      const ax = GAME_WIDTH / 2 + (col - 2.5) * 110;
      const ay = GAME_HEIGHT / 2 - 150 + rowI * 100;
      const t = this.add
        .text(ax, ay, a, { fontSize: '54px' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerup', () => {
        chosenAvatar = a;
        avatarTexts.forEach((o) => o.setAlpha(0.45));
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
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'Pick your grade:', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    let chosenBand: GradeBand = 'pk-k';
    const bandButtons: Button[] = [];
    GRADE_BANDS.forEach((b, i) => {
      const bx = GAME_WIDTH / 2 + (i - (GRADE_BANDS.length - 1) / 2) * 175;
      const btn = new Button(this, bx, GAME_HEIGHT / 2 + 100, b.label, {
        fill: i === 0 ? this.theme.accent : 0x44507a,
        textColor: i === 0 ? 0x1b1b3a : 0xffffff,
        width: 160,
        height: 64,
        fontSize: 22,
        onClick: () => {
          chosenBand = b.id;
          bandButtons.forEach((bb, j) => {
            bb.setFill(j === i ? this.theme.accent : 0x44507a);
          });
        },
      });
      bandButtons.push(btn);
      overlay.add(btn);
    });

    overlay.add(
      new Button(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 210, "Let's Go!", {
        icon: '🎮',
        fill: this.theme.correct,
        width: 320,
        onClick: () => {
          createProfile(name, chosenAvatar, chosenBand);
          this.scene.start(SceneKeys.Menu);
        },
      }),
    );
  }
}
