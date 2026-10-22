import 'server-only';
import { Prisma, PrismaClient } from '@prisma/client';
const shared = globalThis as unknown as { mercadoPrisma?: PrismaClient };
export const prisma = shared.mercadoPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') shared.mercadoPrisma = prisma;
export function withDb<T>(ownerId: string, work: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(ownerId)) throw new Error('Identidade inválida.');
  return prisma.$transaction(async db => {
    await db.$queryRaw`SELECT set_config('app.user_id', ${ownerId}, true)`;
    return work(db);
  }, { timeout: 20000, maxWait: 10000 });
}
