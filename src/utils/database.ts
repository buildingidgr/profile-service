import { PrismaClient } from '@prisma/client'
import { createLogger } from './logger'
import { config } from '../config'

const logger = createLogger('database');

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

prisma.$use(async (params, next) => {
  const before = Date.now()
  const result = await next(params)
  const after = Date.now()
  logger.debug(`Query ${params.model}.${params.action} took ${after - before}ms`)
  return result
})

export async function connectToDatabase() {
  try {
    await prisma.$connect()
    logger.info('Connected to database')
  } catch (error) {
    logger.error('Failed to connect to database', error)
    process.exit(1)
  }
}

