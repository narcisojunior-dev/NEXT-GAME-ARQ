import 'server-only';
import { validatePassword, validatePersonName, validateUsername } from '../../engine/classroom/validation';
import {
  clearedSessionCookie,
  createSessionToken,
  generateRecoveryCode,
  hashPassword,
  normalizeRecoveryCode,
  sessionCookie,
  verifyPassword,
} from '../auth';
import { ApiError, getRepository, handle, isSecureRequest, json, now, readJson, requireRateLimit, requireTeacher } from '../http';
import { sameOrigin } from '../auth';

/** Login do professor sem e-mail (#72): usuário + senha + código de recuperação exibido uma vez */
const LOGIN_WINDOW = 15 * 60;
const LOGIN_MAX = 5;

function requireOrigin(request: Request) {
  if (!sameOrigin(request)) throw new ApiError(403, 'ORIGEM_INVALIDA', 'Requisição de outra origem recusada.');
}

function field<T>(result: { ok: true; value: T } | { ok: false; code: string; message: string }): T {
  if (!result.ok) throw new ApiError(400, result.code, result.message);
  return result.value;
}

const loggedIn = (request: Request, teacher: { id: string; username: string; displayName: string }, extra: Record<string, unknown> = {}) =>
  json({ teacher: { id: teacher.id, username: teacher.username, displayName: teacher.displayName }, ...extra }, { headers: { 'set-cookie': sessionCookie(createSessionToken(teacher.id, now().getTime()), isSecureRequest(request)) } });

export const register = (request: Request) =>
  handle(async () => {
    requireOrigin(request);
    const body = (await readJson(request)) as Record<string, unknown>;
    const username = field(validateUsername(body.username));
    const password = field(validatePassword(body.password));
    const displayName = field(validatePersonName(body.displayName, 'nome'));
    await requireRateLimit(`register:${username}`, LOGIN_WINDOW, LOGIN_MAX, 'Muitas tentativas. Espere 15 minutos.');
    const recoveryCode = generateRecoveryCode();
    const teacher = await getRepository().createTeacher({
      username,
      displayName,
      passwordHash: await hashPassword(password),
      recoveryHash: await hashPassword(normalizeRecoveryCode(recoveryCode)),
    });
    // O código de recuperação só aparece agora: o banco guarda apenas o hash
    return loggedIn(request, teacher, { recoveryCode });
  });

export const login = (request: Request) =>
  handle(async () => {
    requireOrigin(request);
    const body = (await readJson(request)) as Record<string, unknown>;
    const username = field(validateUsername(body.username));
    await requireRateLimit(`login:${username}`, LOGIN_WINDOW, LOGIN_MAX, 'Muitas tentativas de login. Espere 15 minutos ou use o código de recuperação.');
    const teacher = await getRepository().findTeacherByUsername(username);
    const valid = teacher && typeof body.password === 'string' && (await verifyPassword(body.password, teacher.passwordHash));
    if (!teacher || !valid) throw new ApiError(401, 'LOGIN_INVALIDO', 'Usuário ou senha incorretos.');
    return loggedIn(request, teacher);
  });

export const logout = (request: Request) =>
  handle(async () => {
    requireOrigin(request);
    return json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookie(isSecureRequest(request)) } });
  });

/** Esqueceu a senha: usuário + código de recuperação → nova senha e um código novo */
export const recover = (request: Request) =>
  handle(async () => {
    requireOrigin(request);
    const body = (await readJson(request)) as Record<string, unknown>;
    const username = field(validateUsername(body.username));
    const password = field(validatePassword(body.newPassword));
    await requireRateLimit(`recover:${username}`, LOGIN_WINDOW, LOGIN_MAX, 'Muitas tentativas. Espere 15 minutos.');
    const repo = getRepository();
    const teacher = await repo.findTeacherByUsername(username);
    const code = typeof body.recoveryCode === 'string' ? normalizeRecoveryCode(body.recoveryCode) : '';
    const valid = teacher && code.length === 12 && (await verifyPassword(code, teacher.recoveryHash));
    if (!teacher || !valid) throw new ApiError(401, 'RECUPERACAO_INVALIDA', 'Usuário ou código de recuperação incorretos.');
    const recoveryCode = generateRecoveryCode();
    await repo.updateTeacherSecrets(teacher.id, await hashPassword(password), await hashPassword(normalizeRecoveryCode(recoveryCode)));
    return loggedIn(request, teacher, { recoveryCode });
  });

export const me = (request: Request) =>
  handle(async () => {
    const teacher = await requireTeacher(request);
    return json({ teacher });
  });
