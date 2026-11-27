const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('./env');

const LIMITE_ANEXO = 10 * 1024 * 1024;
const MAXIMO_ANEXOS = 5;
const EXTENSOES_ANEXO = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.pdf', '.txt', '.log', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.zip',
];

const LIMITE_AVATAR = 3 * 1024 * 1024;
const EXTENSOES_AVATAR = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

function criarStorage(subpasta = '') {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const destino = subpasta ? path.join(env.UPLOADS_DIR, subpasta) : env.UPLOADS_DIR;
      fs.mkdirSync(destino, { recursive: true });
      cb(null, destino);
    },
    filename: (req, file, cb) => {
      const extensao = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extensao}`);
    },
  });
}

const uploadAnexos = multer({
  storage: criarStorage(),
  limits: { fileSize: LIMITE_ANEXO, files: MAXIMO_ANEXOS },
  fileFilter: (req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();
    if (!EXTENSOES_ANEXO.includes(extensao)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
    cb(null, true);
  },
});

const uploadAvatar = multer({
  storage: criarStorage('avatars'),
  limits: { fileSize: LIMITE_AVATAR, files: 1 },
  fileFilter: (req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();
    if (!EXTENSOES_AVATAR.includes(extensao)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
    cb(null, true);
  },
});

function receberAnexos(req, res, next) {
  if (!req.is('multipart/form-data')) return next();

  uploadAnexos.array('anexos', MAXIMO_ANEXOS)(req, res, (err) => {
    if (!err) return next();

    const mensagens = {
      LIMIT_FILE_SIZE: 'Cada arquivo deve ter no máximo 10MB.',
      LIMIT_FILE_COUNT: `Envie no máximo ${MAXIMO_ANEXOS} arquivos.`,
      LIMIT_UNEXPECTED_FILE: `Tipo de arquivo não permitido. Use: ${EXTENSOES_ANEXO.join(', ')}`,
    };
    return res.status(400).json({ erro: mensagens[err.code] || 'Não foi possível receber os anexos.' });
  });
}

function receberAvatar(req, res, next) {
  if (!req.is('multipart/form-data')) return next();

  uploadAvatar.single('avatar')(req, res, (err) => {
    if (!err) return next();

    const mensagens = {
      LIMIT_FILE_SIZE: 'A imagem de perfil deve ter no máximo 3MB.',
      LIMIT_UNEXPECTED_FILE: `Formato inválido. Envie uma imagem (${EXTENSOES_AVATAR.join(', ')}).`,
    };
    return res.status(400).json({ erro: mensagens[err.code] || 'Não foi possível enviar a foto.' });
  });
}

function apagarArquivos(arquivos = [], subpasta = '') {
  const base = subpasta ? path.join(env.UPLOADS_DIR, subpasta) : env.UPLOADS_DIR;
  arquivos.filter(Boolean).forEach((arquivo) => {
    fs.rm(path.join(base, path.basename(arquivo)), { force: true }, () => {});
  });
}

function descartarUpload(req) {
  apagarArquivos((req.files || []).map((f) => f.filename));
}

module.exports = {
  PASTA_UPLOADS: env.UPLOADS_DIR,
  LIMITE_ANEXO,
  MAXIMO_ANEXOS,
  EXTENSOES_ANEXO,
  EXTENSOES_AVATAR,
  receberAnexos,
  receberAvatar,
  apagarArquivos,
  descartarUpload,
};
