/**
 * Maps a topicId to its generator and produces a Question. This is the only
 * place that knows which generator backs which topic; scenes/engine stay generic.
 */
import type { GenOptions, Question } from './types';
import type { Rng } from '../utils/rng';
import { getDataSource } from '../data/dataSource';
import { mathGenerators } from './generators/math';
import { elaGenerators } from './generators/ela';

export function hasTopic(topicId: string): boolean {
  return topicId in mathGenerators || topicId in elaGenerators;
}

export function generateQuestion(opts: GenOptions, rng: Rng): Question {
  const mathGen = mathGenerators[opts.topicId];
  if (mathGen) return mathGen(opts, rng);

  const elaGen = elaGenerators[opts.topicId];
  if (elaGen) return elaGen(opts, rng, getDataSource());

  throw new Error(`No generator registered for topic "${opts.topicId}"`);
}
