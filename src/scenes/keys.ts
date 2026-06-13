/** Scene keys + the data shapes passed between scenes. */
import type { QuizConfig, QuizResult } from '../quiz/types';

export const SceneKeys = {
  Boot: 'Boot',
  Preload: 'Preload',
  Profile: 'Profile',
  Menu: 'Menu',
  Quiz: 'Quiz',
  Results: 'Results',
} as const;

export interface QuizSceneData {
  config: QuizConfig;
  themeId: string;
}

export interface ResultsSceneData {
  result: QuizResult;
  themeId: string;
  newBadges: string[];
}
