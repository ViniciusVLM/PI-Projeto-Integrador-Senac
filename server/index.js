const env = require('./config/env');
const db = require('./db');
const app = require('./app');
const { hashSenha, senhaEhHash } = require('./utils/seguranca');

function protegerSenhasAntigas() {
  const pendentes = db.data.usuarios.filter((u) => u.senha && !senhaEhHash(u.senha));
  pendentes.forEach((u) => {
    u.senha = hashSenha(u.senha);
  });
  if (pendentes.length) {
    db.save();
    console.log(`[SEGURANÇA] ${pendentes.length} senha(s) antiga(s) convertida(s) para hash bcrypt.`);
  }
}

async function bootstrap() {
  await db.initMySQL();
  protegerSenhasAntigas();

  app.listen(env.PORT, () => {
    console.log(`SecureDesk API rodando em http://localhost:${env.PORT}`);
  });
}

if (require.main === module) {
  bootstrap();
}

module.exports = app;
