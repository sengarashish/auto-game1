/**
 * Selectable visual themes. Each swaps the background gradient, palette, and
 * mascot. Colors are Phaser numeric hex. Kept data-only so scenes can theme
 * themselves without conditionals.
 */
export interface Theme {
  id: string;
  name: string;
  icon: string;
  mascot: string; // emoji mascot
  /** Background gradient stops (top, bottom). */
  bgTop: number;
  bgBottom: number;
  /** Primary panel / card color. */
  panel: number;
  /** Accent for buttons/highlights. */
  accent: number;
  /** Text color on panels. */
  text: number;
  /** Correct / wrong feedback colors (also paired with icons for a11y). */
  correct: number;
  wrong: number;
}

export const THEMES: Theme[] = [
  {
    id: 'space',
    name: 'Space',
    icon: '🚀',
    mascot: '👽',
    bgTop: 0x0b1026,
    bgBottom: 0x2a1a5e,
    panel: 0x1f2b54,
    accent: 0xffd166,
    text: 0xffffff,
    correct: 0x06d6a0,
    wrong: 0xef476f,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    icon: '🌊',
    mascot: '🐠',
    bgTop: 0x023e8a,
    bgBottom: 0x00b4d8,
    panel: 0x0353a4,
    accent: 0xffd166,
    text: 0xffffff,
    correct: 0x06d6a0,
    wrong: 0xef476f,
  },
  {
    id: 'jungle',
    name: 'Jungle',
    icon: '🌴',
    mascot: '🐵',
    bgTop: 0x1b4332,
    bgBottom: 0x40916c,
    panel: 0x2d6a4f,
    accent: 0xffd166,
    text: 0xffffff,
    correct: 0xb7e4c7,
    wrong: 0xef476f,
  },
  {
    id: 'candy',
    name: 'Candy',
    icon: '🍭',
    mascot: '🦄',
    bgTop: 0xff99c8,
    bgBottom: 0xfcf6bd,
    panel: 0xffffff,
    accent: 0xff5d8f,
    text: 0x5a189a,
    correct: 0x06d6a0,
    wrong: 0xd00000,
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
