import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { ApiError, getRepository, handle, json, now } from '../http';

/**
 * Rotina diária de retenção (LGPD, #81), chamada pelo Cron da Vercel com
 * `Authorization: Bearer $CRON_SECRET`: apaga turmas arquivadas há mais de 12 meses
 * e limpa a tabela de limites de tentativa.
 */
export const RETENTION_MONTHS = 12;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const retention = (request: Request) =>
  handle(async () => {
    if (!authorized(request)) throw new ApiError(401, 'NAO_AUTORIZADO', 'Rotina restrita ao agendador.');
    const t = now();
    const cutoff = new Date(t);
    cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
    const repo = getRepository();
    const removed = await repo.purgeArchivedBefore(cutoff);
    await repo.purgeRateLimitsBefore(new Date(t.getTime() - 24 * 3600 * 1000));
    return json({ removedClassrooms: removed, cutoff: cutoff.toISOString() });
  });
