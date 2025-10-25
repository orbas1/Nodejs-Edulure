const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const dotenv = require('dotenv');

const nodeEnv = (process.env.NODE_ENV ?? 'development').trim() || 'development';

const envDescriptors = [
  { filename: '.env', override: false },
  { filename: `.env.${nodeEnv}`, override: false },
  { filename: '.env.local', override: true },
  { filename: `.env.${nodeEnv}.local`, override: true }
];

for (const descriptor of envDescriptors) {
  const envPath = path.resolve(__dirname, descriptor.filename);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: descriptor.override });
  }
}

const examplePath = path.resolve(__dirname, '.env.example');
if (nodeEnv !== 'production' && !process.env.CI && fs.existsSync(examplePath)) {
  dotenv.config({ path: examplePath, override: false });
}

const toInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalised = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(normalised)) {
    return true;
  }

  if (['0', 'false', 'no', 'n'].includes(normalised)) {
    return false;
  }

  return fallback;
};

const resolveDbClient = () => {
  const configured = process.env.DB_CLIENT;
  if (configured) {
    return configured.trim().toLowerCase();
  }

  if (nodeEnv === 'test') {
    return 'sqlite3';
  }

  return 'mysql2';
};

const dbClient = resolveDbClient();

const buildConnectionFromUrl = (databaseUrl) => {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: toInt(url.port, 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, '')
  };
};

const resolveConnection = () => {
  if (process.env.DATABASE_URL) {
    return buildConnectionFromUrl(process.env.DATABASE_URL);
  }

  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
  }

  return {
    host: process.env.DB_HOST,
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };
};

const enrichConnection = (connection) => {
  const enriched = {
    ...connection,
    waitForConnections: true,
    supportBigNumbers: true,
    dateStrings: true,
    decimalNumbers: true,
    timezone: process.env.DB_TIMEZONE ?? 'Z'
  };

  if (toBool(process.env.DB_SSL_ENABLED, false)) {
    const ssl = {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: toBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true)
    };

    if (process.env.DB_SSL_CA && fs.existsSync(process.env.DB_SSL_CA)) {
      ssl.ca = fs.readFileSync(process.env.DB_SSL_CA, 'utf8');
    }

    if (process.env.DB_SSL_CERT && fs.existsSync(process.env.DB_SSL_CERT)) {
      ssl.cert = fs.readFileSync(process.env.DB_SSL_CERT, 'utf8');
    }

    if (process.env.DB_SSL_KEY && fs.existsSync(process.env.DB_SSL_KEY)) {
      ssl.key = fs.readFileSync(process.env.DB_SSL_KEY, 'utf8');
    }

    enriched.ssl = ssl;
  }

  return enriched;
};

const sqliteConfig = () => ({
  client: 'sqlite3',
  connection: {
    filename: process.env.DB_SQLITE_FILENAME
      ? path.resolve(__dirname, process.env.DB_SQLITE_FILENAME)
      : ':memory:'
  },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1,
    idleTimeoutMillis: 500
  },
  migrations: {
    directory: path.resolve(__dirname, 'migrations'),
    tableName: 'schema_migrations',
    loadExtensions: ['.js']
  },
  seeds: {
    directory: path.resolve(__dirname, 'seeds')
  },
  log: {
    warn(message) {
      if (typeof message === 'string' && message.includes('FS_EVENT')) {
        return;
      }

      console.warn(message);
    }
  }
});

const mysqlConfig = () => {
  const connection = enrichConnection(resolveConnection());

  const poolMin = toInt(process.env.DB_POOL_MIN, 2);
  const poolMax = toInt(process.env.DB_POOL_MAX, 10);

  return {
    client: 'mysql2',
    connection,
    pool: {
      min: Math.min(poolMin, poolMax),
      max: Math.max(poolMax, poolMin),
      idleTimeoutMillis: toInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000),
      createTimeoutMillis: toInt(process.env.DB_POOL_CREATE_TIMEOUT_MS, 3000),
      acquireTimeoutMillis: toInt(process.env.DB_POOL_ACQUIRE_TIMEOUT_MS, 60000)
    },
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
      tableName: 'schema_migrations',
      loadExtensions: ['.js']
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds')
    },
    log: {
      warn(message) {
        if (typeof message === 'string' && message.includes('FS_EVENT')) {
          return;
        }

        console.warn(message);
      }
    }
  };
};

module.exports = dbClient === 'sqlite3' ? sqliteConfig() : mysqlConfig();
