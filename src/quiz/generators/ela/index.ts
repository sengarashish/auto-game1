/**
 * ELA (reading / alphabet) question generators. Each is a pure function:
 *   (opts, rng, data) => Question
 * Some pull word data from the DataSource (sight words, phonics, rhymes) but
 * all return a fully-graded Question with the correct answer flagged.
 */
import type { GenOptions, Question } from '../../types';
import type { Rng } from '../../../utils/rng';
import type { DataSource } from '../../../data/dataSource';
import { buildChoiceQuestion, choiceCount, stringDistractors } from '../../genHelpers';

export type ElaGenerator = (opts: GenOptions, rng: Rng, data: DataSource) => Question;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** Show a letter, pick the one that matches (uppercase recognition). */
export const letterRecognition: ElaGenerator = (opts, rng) => {
  const upper = rng.chance(0.5);
  const letter = rng.pick(ALPHABET);
  const shown = upper ? letter.toUpperCase() : letter;
  const distractors = stringDistractors(letter, ALPHABET, choiceCount(opts.difficulty) - 1, rng)
    .map((l) => ({ label: upper ? l.toUpperCase() : l }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'ela',
    prompt: `Which letter is this?`,
    speak: `Which letter is this? ${letter.toUpperCase()}`,
    promptImage: shown,
    correct: { label: shown },
    distractors,
    rng,
  });
};

/** Match uppercase to lowercase (or vice versa). */
export const upperLowerMatch: ElaGenerator = (opts, rng) => {
  const letter = rng.pick(ALPHABET);
  const showUpper = rng.chance(0.5);
  const shown = showUpper ? letter.toUpperCase() : letter;
  const answer = showUpper ? letter : letter.toUpperCase();
  const distractors = stringDistractors(letter, ALPHABET, choiceCount(opts.difficulty) - 1, rng)
    .map((l) => ({ label: showUpper ? l : l.toUpperCase() }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'ela',
    prompt: `Find the ${showUpper ? 'lowercase' : 'uppercase'} match for "${shown}"`,
    speak: `Find the match for ${letter.toUpperCase()}`,
    promptImage: shown,
    correct: { label: answer },
    distractors,
    rng,
  });
};

/** Which letter comes next in the alphabet. */
export const alphabetSequence: ElaGenerator = (opts, rng) => {
  const idx = rng.int(0, ALPHABET.length - 2);
  const shown = ALPHABET[idx];
  const answer = ALPHABET[idx + 1];
  const distractors = stringDistractors(answer, ALPHABET, choiceCount(opts.difficulty) - 1, rng, [
    shown,
  ]).map((l) => ({ label: l.toUpperCase() }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'ela',
    prompt: `What letter comes after "${shown.toUpperCase()}"?`,
    speak: `What letter comes after ${shown.toUpperCase()}?`,
    promptImage: `${shown.toUpperCase()} → ?`,
    correct: { label: answer.toUpperCase() },
    distractors,
    rng,
  });
};

/** Find the missing letter in a short A-B-C run. */
export const missingLetter: ElaGenerator = (opts, rng) => {
  const idx = rng.int(0, ALPHABET.length - 3);
  const seq = [ALPHABET[idx], ALPHABET[idx + 1], ALPHABET[idx + 2]];
  const missingPos = rng.int(0, 2);
  const answer = seq[missingPos];
  const display = seq.map((l, i) => (i === missingPos ? '__' : l.toUpperCase())).join('  ');
  const distractors = stringDistractors(answer, ALPHABET, choiceCount(opts.difficulty) - 1, rng)
    .map((l) => ({ label: l.toUpperCase() }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'ela',
    prompt: `What letter is missing?`,
    speak: `What letter is missing?`,
    promptImage: display,
    correct: { label: answer.toUpperCase() },
    distractors,
    rng,
  });
};

/** Which word starts with the shown letter's sound (beginning sounds). */
export const beginningSound: ElaGenerator = (opts, rng, data) => {
  const letters = data.phonicsLetters();
  const letter = rng.pick(letters);
  const target = data.letterSound(letter);
  // Distractors: example words of other letters.
  const others = rng
    .shuffle(letters.filter((l) => l !== letter))
    .slice(0, choiceCount(opts.difficulty) - 1)
    .map((l) => {
      const s = data.letterSound(l);
      return { label: s.word, image: s.emoji };
    });
  return buildChoiceQuestion({
    opts,
    subjectId: 'ela',
    prompt: `Which word begins with the sound of "${letter.toUpperCase()}"?`,
    speak: `Which word begins with the sound ${target.sound}?`,
    promptImage: letter.toUpperCase(),
    correct: { label: target.word, image: target.emoji },
    distractors: others,
    rng,
  });
};

/** Which word rhymes with the prompt word. */
export const rhyming: ElaGenerator = (opts, rng, data) => {
  const groups = data.rhymeGroups();
  const rimes = Object.keys(groups);
  const rime = rng.pick(rimes);
  const group = groups[rime];
  const [promptWord, answer] = rng.shuffle(group);
  // Distractors from other rhyme groups.
  const otherWords = rimes
    .filter((r) => r !== rime)
    .flatMap((r) => groups[r]);
  const distractors = stringDistractors(answer, otherWords, choiceCount(opts.difficulty) - 1, rng, [
    promptWord,
  ]).map((label) => ({ label }));
  return buildChoiceQuestion({
    opts,
    subjectId: 'ela',
    prompt: `Which word rhymes with "${promptWord}"?`,
    speak: `Which word rhymes with ${promptWord}?`,
    correct: { label: answer },
    distractors,
    rng,
  });
};

/** Read/hear a sight word and pick it from look-alikes. */
export const sightWord: ElaGenerator = (opts, rng, data) => {
  const words = data.sightWords(opts.gradeBand);
  const pool = words.length >= 4 ? words : data.sightWords('1-2');
  const answer = rng.pick(pool);
  const distractors = stringDistractors(answer, pool, choiceCount(opts.difficulty) - 1, rng).map(
    (label) => ({ label }),
  );
  return buildChoiceQuestion({
    opts,
    subjectId: 'ela',
    prompt: `Tap the word you hear:`,
    speak: answer,
    correct: { label: answer },
    distractors,
    rng,
    explanation: `The word was "${answer}".`,
  });
};

export const elaGenerators: Record<string, ElaGenerator> = {
  'letter-recognition': letterRecognition,
  'upper-lower-match': upperLowerMatch,
  'alphabet-sequence': alphabetSequence,
  'missing-letter': missingLetter,
  'beginning-sound': beginningSound,
  rhyming,
  'sight-word': sightWord,
};
