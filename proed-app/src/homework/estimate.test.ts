import { describe, expect, it } from 'vitest';
import { autoEstimate, detectKind, lengthFactor, personalFactor, roundMinutes, ruleEstimate, subjectFactor } from './estimate';
import type { Homework, TimeSample } from './model';

const hw = (over: Partial<Homework> = {}): Homework => ({
  id: 'h1',
  subject: 'Mathématiques',
  description: 'Exercices 3, 4 et 5 page 112',
  due: Date.now(),
  attachments: [],
  pronoteDone: false,
  ...over,
});

const sample = (subject: string, ruleMinutes: number, actualMinutes: number, id = Math.random().toString()): TimeSample => ({
  homeworkId: id,
  subject,
  ruleMinutes,
  actualMinutes,
  at: Date.now(),
});

describe('detectKind', () => {
  it('finds revision for tests and learning', () => {
    expect(detectKind('Réviser le chapitre 4 pour le contrôle')).toBe('revision');
    expect(detectKind('Apprendre la leçon')).toBe('revision');
    expect(detectKind('Interro de vocabulaire')).toBe('revision');
    expect(detectKind('Study for the test')).toBe('revision');
  });
  it('finds projects', () => {
    expect(detectKind('Préparer un exposé sur la Révolution française')).toBe('project');
    expect(detectKind('Rédaction : raconter un souvenir')).toBe('project');
    expect(detectKind('Group project slides')).toBe('project');
  });
  it('finds reading', () => {
    expect(detectKind('Lire les pages 20 à 35 du roman')).toBe('reading');
    expect(detectKind('Read chapter 2')).toBe('reading');
  });
  it('defaults to exercises', () => {
    expect(detectKind('Exercices 3 et 4 page 52')).toBe('exercise');
    expect(detectKind('')).toBe('exercise');
  });
});

describe('factors', () => {
  it('weights subjects', () => {
    expect(subjectFactor('Mathématiques')).toBeGreaterThan(1);
    expect(subjectFactor('PHYSIQUE-CHIMIE')).toBeGreaterThan(1);
    expect(subjectFactor('Anglais LV1')).toBeLessThan(1);
    expect(subjectFactor('EPS')).toBeLessThan(0.7);
    expect(subjectFactor('Option inconnue')).toBe(1);
  });
  it('grows with the description length', () => {
    expect(lengthFactor('Ex 3')).toBeLessThan(lengthFactor('Faire les exercices 3, 4, 5 et 6 de la page 112 du manuel'));
    expect(lengthFactor('mot '.repeat(100))).toBe(1.5);
  });
  it('rounds to 5 minutes between 10 and 240', () => {
    expect(roundMinutes(23)).toBe(25);
    expect(roundMinutes(2)).toBe(10);
    expect(roundMinutes(999)).toBe(240);
  });
});

describe('ruleEstimate', () => {
  it('gives a revision more time than a short exercise', () => {
    const revision = ruleEstimate(hw({ description: 'Réviser pour le contrôle de demain sur les fonctions affines et les équations' }));
    const exercise = ruleEstimate(hw({ description: 'Ex 4 p 30' }));
    expect(revision).toBeGreaterThan(exercise);
  });
  it('uses the teacher duration when Pronote has one', () => {
    expect(ruleEstimate(hw({ teacherMinutes: 42 }))).toBe(40);
  });
  it('always returns a multiple of 5', () => {
    for (const d of ['Lire', 'Exposé oral sur un roman', 'Apprendre la poésie', 'Exercice']) {
      expect(ruleEstimate(hw({ description: d })) % 5).toBe(0);
    }
  });
});

describe('personal adjustment from the timer', () => {
  it('is neutral without data', () => {
    expect(personalFactor([], 'Mathématiques')).toBe(1);
    expect(autoEstimate(hw(), [])).toBe(ruleEstimate(hw()));
  });
  it('raises estimates for a subject that takes longer', () => {
    const samples = [sample('Mathématiques', 30, 60), sample('Mathématiques', 30, 60), sample('Mathématiques', 30, 60)];
    expect(personalFactor(samples, 'Mathématiques')).toBeCloseTo((3 * 2 + 2) / 5);
    expect(autoEstimate(hw(), samples)).toBeGreaterThan(ruleEstimate(hw()));
  });
  it('lowers estimates for a fast subject and ignores other subjects', () => {
    const samples = [sample('Anglais', 30, 10), sample('Anglais', 30, 10), sample('Mathématiques', 30, 90)];
    const english = hw({ subject: 'Anglais', description: 'Exercise 3 page 40 and learn the vocabulary list' });
    expect(personalFactor(samples, 'Anglais')).toBeLessThan(1);
    expect(autoEstimate(english, samples)).toBeLessThan(ruleEstimate(english));
  });
  it('stays within bounds', () => {
    const extreme = Array.from({ length: 20 }, (_, i) => sample('SVT', 10, 200, String(i)));
    expect(personalFactor(extreme, 'SVT')).toBe(2.5);
  });
  it('does not adjust the teacher duration', () => {
    const samples = [sample('Mathématiques', 30, 90)];
    expect(autoEstimate(hw({ teacherMinutes: 30 }), samples)).toBe(30);
  });
});
