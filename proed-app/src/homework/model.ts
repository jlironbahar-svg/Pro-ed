export type WorkKind = 'exercise' | 'revision' | 'reading' | 'project';

export interface HomeworkAttachment {
  name: string;
  url: string;
  kind: 'file' | 'link';
}

/** A homework item as cached on the device (from Pronote). */
export interface Homework {
  id: string;
  subject: string;
  description: string;
  /** Due date, ms since epoch. */
  due: number;
  attachments: HomeworkAttachment[];
  pronoteDone: boolean;
  /** Duration set by the teacher in Pronote, in minutes, when available. */
  teacherMinutes?: number;
  color?: string;
}

/** What the student changed locally for one homework item. */
export interface ItemState {
  done?: boolean;
  /** Estimate edited by the student, minutes. */
  estimate?: number;
  /** Total time measured with the timer, ms. */
  spentMs?: number;
  /** Set while the timer runs. */
  timerStart?: number;
}

/** One measured homework, used to adjust future estimates for the subject. */
export interface TimeSample {
  homeworkId: string;
  subject: string;
  ruleMinutes: number;
  actualMinutes: number;
  at: number;
}
