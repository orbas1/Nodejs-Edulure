import dotenv from 'dotenv';
import app from './app.js';
import logger from './config/logger.js';
import pool from './config/database.js';

dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);

async function start() {
  try {
    await pool.getConnection();
    logger.info('Database connection pool initialised');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialise database connection');
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

start();
