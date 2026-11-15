import {
  AccountKind,
  BadCredentialsError,
  SecurityError,
  instance,
  assignmentStatus,
  assignmentsFromIntervals,
  createSessionHandle,
  finishLoginManually,
  loginCredentials,
  loginQrCode,
  loginToken,
  securityCheckPIN,
  securitySave,
  type Assignment,
  type RefreshInformation,
  type SecurityModal,
  type SessionHandle,
} from 'pawnote';
import { secure, randomId } from '../lib/storage';
import { htmlToText } from '../lib/html';
import { startOfDay } from '../lib/format';
import type { Homework } from '../homework/model';
import { getFetcher } from './fetcher';
import { AppError, toAppError } from './errors';

const SESSION_KEY = 'pronote-session';
const DEVICE_KEY = 'pronote-device';
/** Pronote drops idle sessions after a few minutes; past this age we log in again with the token. */
const SESSION_MAX_AGE_MS = 4 * 60_000;
const FETCH_DAYS = 120;

/** What we keep to log in again without the password. Never the password itself. */
export interface SavedSession {
  url: string;
  username: string;
  token: string;
  kind: AccountKind;
  deviceUUID: string;
  navigatorIdentifier: string;
  studentName: string;
  schoolName: string;
}

export type LoginResult =
  | { status: 'ok'; session: SavedSession }
  | { status: 'security'; pending: PendingSecurity };

export interface PendingSecurity {
  handle: SessionHandle;
  modal: SecurityModal;
}

let live: { handle: SessionHandle; at: number } | null = null;

async function deviceUUID(): Promise<string> {
  let id = await secure.get<string>(DEVICE_KEY);
  if (!id) {
    id = randomId();
    await secure.set(DEVICE_KEY, id);
  }
  return id;
}

export function loadSavedSession(): Promise<SavedSession | undefined> {
  return secure.get<SavedSession>(SESSION_KEY);
}

async function persist(handle: SessionHandle, refresh: RefreshInformation, uuid: string): Promise<SavedSession> {
  const saved: SavedSession = {
    url: refresh.url,
    username: refresh.username,
    token: refresh.token,
    kind: refresh.kind,
    deviceUUID: uuid,
    navigatorIdentifier: refresh.navigatorIdentifier,
    studentName: handle.user?.name ?? refresh.username,
    schoolName: handle.userResource?.establishmentName ?? '',
  };
  await secure.set(SESSION_KEY, saved);
  live = { handle, at: Date.now() };
  return saved;
}

export async function loginWithPassword(url: string, username: string, password: string): Promise<LoginResult> {
  const uuid = await deviceUUID();
  const handle = createSessionHandle(getFetcher());
  try {
    const refresh = await loginCredentials(handle, {
      url,
      kind: AccountKind.STUDENT,
      username: username.trim(),
      password,
      deviceUUID: uuid,
    });
    return { status: 'ok', session: await persist(handle, refresh, uuid) };
  } catch (e) {
    if (e instanceof SecurityError) return { status: 'security', pending: { handle, modal: e.handle } };
    // Schools that sign in through an ENT: students often have no Pronote password. Point them to the QR code.
    if (e instanceof BadCredentialsError) {
      const info = await instance(url, getFetcher()).catch(() => null);
      if (info?.casURL) throw new AppError('error.badCredentialsEnt');
    }
    throw toAppError(e, 'credentials');
  }
}

/** QR code content is JSON: { jeton, login, url }. */
export function parsePronoteQr(text: string): { jeton: string; login: string; url: string } | null {
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    if (typeof data.jeton === 'string' && typeof data.login === 'string' && typeof data.url === 'string') {
      return { jeton: data.jeton, login: data.login, url: data.url };
    }
  } catch {
    /* not JSON */
  }
  return null;
}

export async function loginWithQr(qr: { jeton: string; login: string; url: string }, pin: string): Promise<LoginResult> {
  const uuid = await deviceUUID();
  const handle = createSessionHandle(getFetcher());
  try {
    const refresh = await loginQrCode(handle, { deviceUUID: uuid, pin, qr });
    return { status: 'ok', session: await persist(handle, refresh, uuid) };
  } catch (e) {
    if (e instanceof SecurityError) return { status: 'security', pending: { handle, modal: e.handle } };
    throw toAppError(e, 'qr');
  }
}

/** Accounts with Pronote 2FA: checks the PIN, registers ProEd as a known device, then finishes the login. */
export async function completeSecurity(pending: PendingSecurity, pin: string): Promise<SavedSession> {
  const { handle, modal } = pending;
  if (modal.shouldCustomPassword || modal.shouldCustomDoubleAuth) throw new AppError('error.securitySetup');
  try {
    if (modal.shouldEnterPIN && !(await securityCheckPIN(handle, pin))) throw new AppError('error.badPin');
    await securitySave(handle, modal, {
      pin: modal.shouldEnterPIN ? pin : undefined,
      deviceName: modal.shouldEnterSource ? 'ProEd' : undefined,
    });
    const refresh = await finishLoginManually(
      handle,
      modal.context.authentication,
      modal.context.identity,
      modal.context.initialUsername,
    );
    return persist(handle, refresh, await deviceUUID());
  } catch (e) {
    throw toAppError(e, 'credentials');
  }
}

export function securityNeedsPin(pending: PendingSecurity): boolean {
  return pending.modal.shouldEnterPIN;
}

/** Returns a live Pronote session, logging in again with the saved token when needed. */
async function session(): Promise<SessionHandle> {
  if (live && Date.now() - live.at < SESSION_MAX_AGE_MS) return live.handle;
  const saved = await loadSavedSession();
  if (!saved) throw new AppError('error.sessionExpired');
  const handle = createSessionHandle(getFetcher());
  try {
    const refresh = await loginToken(handle, {
      url: saved.url,
      kind: saved.kind,
      username: saved.username,
      token: saved.token,
      deviceUUID: saved.deviceUUID,
      navigatorIdentifier: saved.navigatorIdentifier,
    });
    await persist(handle, refresh, saved.deviceUUID);
    return handle;
  } catch (e) {
    throw toAppError(e, 'credentials');
  }
}

function toHomework(a: Assignment): Homework {
  return {
    id: a.id,
    subject: a.subject.name,
    description: htmlToText(a.description),
    due: a.deadline.getTime(),
    attachments: a.attachments.map((f) => ({ name: f.name, url: f.url, kind: f.kind === 0 ? 'link' : 'file' })),
    pronoteDone: a.done,
    teacherMinutes: a.length && a.length > 0 ? a.length : undefined,
    color: a.backgroundColor || undefined,
  };
}

/** All upcoming homework, from today to the end of the school year (max 120 days). */
export async function fetchHomework(): Promise<Homework[]> {
  const handle = await session();
  const start = new Date(startOfDay(Date.now()));
  let end = new Date(start.getTime() + FETCH_DAYS * 86_400_000);
  const last = handle.instance?.lastDate;
  if (last && last < end) end = new Date(last.getTime() + 86_399_999);
  if (end <= start) return [];
  try {
    const list = await assignmentsFromIntervals(handle, start, end);
    live = { handle, at: Date.now() };
    return list.map(toHomework);
  } catch (e) {
    live = null;
    throw toAppError(e);
  }
}

/** Best effort: mirrors the done state in Pronote. Local state stays the source of truth. */
export async function syncDone(id: string, done: boolean): Promise<void> {
  try {
    const handle = await session();
    await assignmentStatus(handle, id, done);
  } catch {
    /* offline or not allowed: ignore */
  }
}

export async function logout(): Promise<void> {
  live = null;
  await secure.remove(SESSION_KEY);
}
