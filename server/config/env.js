const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const IS_TEST_FILE = Boolean(process.env.DB_FILE);
const ROOT_DIR = path.join(__dirname, '..', '..');
const SERVER_DIR = path.join(__dirname, '..');

const env = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_TEST_FILE,
  DB_PATH: process.env.DB_FILE || path.join(SERVER_DIR, 'db.json'),
  SEED_PATH: path.join(SERVER_DIR, 'db.seed.json'),
  UPLOADS_DIR: process.env.UPLOADS_DIR || path.join(SERVER_DIR, 'uploads'),
  FRONTEND_DIST_DIR: path.join(ROOT_DIR, 'dist', 'PI-Projeto-Integrador-Senac', 'browser'),

  mysql: {
    disabled: IS_TEST_FILE || process.env.DISABLE_MYSQL === 'true',
    host: process.env.DB_HOST || '',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'SecureDesk',
    ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false },
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'SecureDesk Central de TI',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
  },
};

module.exports = env;
