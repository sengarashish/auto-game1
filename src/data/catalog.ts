/**
 * Curriculum catalog: the subjects and topics shown in the menu, each tagged
 * with grade bands and BOTH Common Core (ccss) and Florida B.E.S.T. (flBest)
 * standard codes. Standards are surfaced in a parent/teacher info popover.
 *
 * topic.id MUST match a generator key in QuestionFactory.
 */
import type { Subject, Topic } from '../quiz/types';

export const SUBJECTS: Subject[] = [
  { id: 'math', title: 'Math', icon: '🔢', color: 0x4cc9f0 },
  { id: 'ela', title: 'Reading & Letters', icon: '🔤', color: 0xf72585 },
];

export const TOPICS: Topic[] = [
  // ---- Math ----
  {
    id: 'counting',
    subjectId: 'math',
    title: 'Counting',
    icon: '🧮',
    gradeBands: ['pk-k'],
    ccss: ['CCSS.MATH.CONTENT.K.CC.B.5'],
    flBest: ['MA.K.NSO.1.1', 'MA.K.NSO.1.2'],
  },
  {
    id: 'addition',
    subjectId: 'math',
    title: 'Addition',
    icon: '➕',
    gradeBands: ['pk-k', '1-2', '3-5'],
    ccss: ['CCSS.MATH.CONTENT.1.OA.C.6', 'CCSS.MATH.CONTENT.2.OA.B.2'],
    flBest: ['MA.1.AR.2.2', 'MA.2.AR.2.1'],
    allowTyped: true,
  },
  {
    id: 'subtraction',
    subjectId: 'math',
    title: 'Subtraction',
    icon: '➖',
    gradeBands: ['pk-k', '1-2', '3-5'],
    ccss: ['CCSS.MATH.CONTENT.1.OA.C.6', 'CCSS.MATH.CONTENT.2.OA.B.2'],
    flBest: ['MA.1.AR.2.2', 'MA.2.AR.2.1'],
    allowTyped: true,
  },
  {
    id: 'multiplication',
    subjectId: 'math',
    title: 'Multiplication',
    icon: '✖️',
    gradeBands: ['3-5', '6-8'],
    ccss: ['CCSS.MATH.CONTENT.3.OA.C.7'],
    flBest: ['MA.3.AR.1.1', 'MA.3.NSO.2.2'],
    allowTyped: true,
  },
  {
    id: 'division',
    subjectId: 'math',
    title: 'Division',
    icon: '➗',
    gradeBands: ['3-5', '6-8'],
    ccss: ['CCSS.MATH.CONTENT.3.OA.C.7'],
    flBest: ['MA.3.AR.1.1'],
    allowTyped: true,
  },
  {
    id: 'comparison',
    subjectId: 'math',
    title: 'Compare Numbers',
    icon: '⚖️',
    gradeBands: ['pk-k', '1-2', '3-5'],
    ccss: ['CCSS.MATH.CONTENT.1.NBT.B.3'],
    flBest: ['MA.1.NSO.1.4', 'MA.2.NSO.1.3'],
  },
  {
    id: 'place-value',
    subjectId: 'math',
    title: 'Place Value',
    icon: '🏷️',
    gradeBands: ['1-2', '3-5'],
    ccss: ['CCSS.MATH.CONTENT.2.NBT.A.1'],
    flBest: ['MA.2.NSO.1.1', 'MA.3.NSO.1.1'],
  },
  {
    id: 'fractions',
    subjectId: 'math',
    title: 'Fractions',
    icon: '🍕',
    gradeBands: ['3-5', '6-8'],
    ccss: ['CCSS.MATH.CONTENT.3.NF.A.1'],
    flBest: ['MA.3.FR.1.1', 'MA.3.FR.1.2'],
  },
  {
    id: 'money',
    subjectId: 'math',
    title: 'Money',
    icon: '🪙',
    gradeBands: ['1-2', '3-5'],
    ccss: ['CCSS.MATH.CONTENT.2.MD.C.8'],
    flBest: ['MA.1.M.2.3', 'MA.2.M.2.2'],
  },
  {
    id: 'time',
    subjectId: 'math',
    title: 'Telling Time',
    icon: '🕐',
    gradeBands: ['1-2', '3-5'],
    ccss: ['CCSS.MATH.CONTENT.1.MD.B.3', 'CCSS.MATH.CONTENT.2.MD.C.7'],
    flBest: ['MA.1.M.2.1', 'MA.2.M.2.1'],
  },
  {
    id: 'shapes',
    subjectId: 'math',
    title: 'Shapes',
    icon: '🔺',
    gradeBands: ['pk-k', '1-2'],
    ccss: ['CCSS.MATH.CONTENT.K.G.A.2'],
    flBest: ['MA.K.GR.1.1', 'MA.1.GR.1.1'],
  },
  {
    id: 'word-problem',
    subjectId: 'math',
    title: 'Word Problems',
    icon: '📖',
    gradeBands: ['1-2', '3-5'],
    ccss: ['CCSS.MATH.CONTENT.1.OA.A.1', 'CCSS.MATH.CONTENT.2.OA.A.1'],
    flBest: ['MA.1.AR.1.1', 'MA.2.AR.1.1'],
  },

  // ---- ELA ----
  {
    id: 'letter-recognition',
    subjectId: 'ela',
    title: 'Letter Names',
    icon: '🅰️',
    gradeBands: ['pk-k'],
    ccss: ['CCSS.ELA-LITERACY.RF.K.1.D'],
    flBest: ['ELA.K.F.1.1'],
  },
  {
    id: 'upper-lower-match',
    subjectId: 'ela',
    title: 'Big & Small Letters',
    icon: '🔠',
    gradeBands: ['pk-k'],
    ccss: ['CCSS.ELA-LITERACY.RF.K.1.D'],
    flBest: ['ELA.K.F.1.1'],
  },
  {
    id: 'alphabet-sequence',
    subjectId: 'ela',
    title: 'Alphabet Order',
    icon: '🔡',
    gradeBands: ['pk-k', '1-2'],
    ccss: ['CCSS.ELA-LITERACY.RF.K.1.D'],
    flBest: ['ELA.K.F.1.1'],
  },
  {
    id: 'missing-letter',
    subjectId: 'ela',
    title: 'Missing Letter',
    icon: '❓',
    gradeBands: ['pk-k', '1-2'],
    ccss: ['CCSS.ELA-LITERACY.RF.K.1.D'],
    flBest: ['ELA.K.F.1.1'],
  },
  {
    id: 'beginning-sound',
    subjectId: 'ela',
    title: 'Beginning Sounds',
    icon: '🔊',
    gradeBands: ['pk-k', '1-2'],
    ccss: ['CCSS.ELA-LITERACY.RF.K.2.D', 'CCSS.ELA-LITERACY.RF.K.3.A'],
    flBest: ['ELA.K.F.1.2', 'ELA.K.F.1.3'],
  },
  {
    id: 'rhyming',
    subjectId: 'ela',
    title: 'Rhyming Words',
    icon: '🎵',
    gradeBands: ['pk-k', '1-2'],
    ccss: ['CCSS.ELA-LITERACY.RF.K.2.A'],
    flBest: ['ELA.K.F.1.2'],
  },
  {
    id: 'sight-word',
    subjectId: 'ela',
    title: 'Sight Words',
    icon: '👀',
    gradeBands: ['pk-k', '1-2', '3-5', '6-8'],
    ccss: ['CCSS.ELA-LITERACY.RF.K.3.C', 'CCSS.ELA-LITERACY.RF.1.3.G'],
    flBest: ['ELA.K.F.1.3', 'ELA.1.F.1.3'],
  },
];

export function topicsFor(subjectId: string): Topic[] {
  return TOPICS.filter((t) => t.subjectId === subjectId);
}

export function getTopic(topicId: string): Topic | undefined {
  return TOPICS.find((t) => t.id === topicId);
}

export function getSubject(subjectId: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === subjectId);
}
