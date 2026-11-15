import type { Homework, TimeSample, WorkKind } from './model';

/*
  Time estimates.
  rule = base minutes for the type of work x subject factor x length factor
         (or the teacher's own duration when Pronote has one).
  Then each subject gets a personal factor from the timer: the average of
  (real time / rule estimate), pulled toward 1 when there are few samples.
*/

const BASE_MINUTES: Record<WorkKind, number> = {
  exercise: 25,
  revision: 45,
  reading: 30,
  project: 60,
};

const KIND_PATTERNS: [WorkKind, RegExp][] = [
  [
    'revision',
    /(r[ée]vis|contr[ôo]le|interro|[ée]valuation|devoir surveill|\bds\b|\bdst\b|examen|bac blanc|brevet blanc|\btest\b|apprendre|\bexam\b|\bquiz\b|\bstudy\b|\blearn\b)/i,
  ],
  [
    'project',
    /(expos[ée]|projet|dossier|pr[ée]sentation|diaporama|\boral\b|r[ée]daction|dissertation|commentaire compos|recherches?\b|affiche|\bproject\b|\bessay\b|\bpresentation\b)/i,
  ],
  ['reading', /(\blire\b|lecture|\blis\b|chapitre|roman|\blivre\b|\bread\b|\breading\b|\bchapter\b)/i],
];

export function detectKind(description: string): WorkKind {
  for (const [kind, pattern] of KIND_PATTERNS) if (pattern.test(description)) return kind;
  return 'exercise';
}

const SUBJECT_FACTORS: [RegExp, number][] = [
  [/(math|physique|chimie|\bpc\b|svt|science|nsi|informatique|\bsi\b|technolog)/i, 1.2],
  [/(fran[çc]ais|philo|histoire|g[ée]o|\bhg\b|\bses\b|[ée]conomi|hggsp|\bemc\b|latin|grec)/i, 1.1],
  [/(anglais|espagnol|allemand|italien|chinois|portugais|arabe|russe|\blv\s?[12a-c]?\b|langue|english|spanish|german)/i, 0.9],
  [/(\beps\b|sport|arts? plastique|musique|[ée]ducation musicale|dessin)/i, 0.6],
];

export function subjectFactor(subject: string): number {
  for (const [pattern, factor] of SUBJECT_FACTORS) if (pattern.test(subject)) return factor;
  return 1;
}

export function lengthFactor(description: string): number {
  const words = description.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 8) return 0.8;
  if (words <= 30) return 1;
  if (words <= 80) return 1.25;
  return 1.5;
}

export function roundMinutes(m: number): number {
  return Math.min(240, Math.max(10, Math.round(m / 5) * 5));
}

/** Estimate from rules only (no personal history). */
export function ruleEstimate(hw: Pick<Homework, 'subject' | 'description' | 'teacherMinutes'>): number {
  if (hw.teacherMinutes && hw.teacherMinutes > 0) return roundMinutes(hw.teacherMinutes);
  const kind = detectKind(hw.description);
  return roundMinutes(BASE_MINUTES[kind] * subjectFactor(hw.subject) * lengthFactor(hw.description));
}

const PRIOR_WEIGHT = 2;

/** Personal factor for a subject, from timer samples. 1 when there is no data. */
export function personalFactor(samples: TimeSample[], subject: string): number {
  const own = samples.filter((s) => s.subject === subject && s.ruleMinutes > 0 && s.actualMinutes >= 1);
  if (own.length === 0) return 1;
  const sum = own.reduce((acc, s) => acc + s.actualMinutes / s.ruleMinutes, 0);
  const factor = (sum + PRIOR_WEIGHT) / (own.length + PRIOR_WEIGHT);
  return Math.min(2.5, Math.max(0.4, factor));
}

/** Final automatic estimate: rules adjusted by the student's real time in that subject. */
export function autoEstimate(hw: Homework, samples: TimeSample[]): number {
  const rule = ruleEstimate(hw);
  if (hw.teacherMinutes) return rule;
  return roundMinutes(rule * personalFactor(samples, hw.subject));
}
