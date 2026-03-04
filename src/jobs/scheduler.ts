import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

export const mainQueue = new Queue('main-queue', { connection });
