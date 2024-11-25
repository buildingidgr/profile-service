import { createClient } from 'redis';
import { config } from '../config';

export const redis = createClient({
  url: config.redisUrl,
});

redis.on('error', (err) => console.log('Redis Client Error', err));

redis.connect();

