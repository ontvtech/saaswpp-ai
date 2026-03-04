import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

export const worker = new Worker('main-queue', async job => {
  console.log('Processing job:', job.id, job.name);
}, { connection });
