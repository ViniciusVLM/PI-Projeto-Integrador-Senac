const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const RODADAS_HASH = 10;
const TOKEN_VALIDADE_HORAS = 8;
const CODIGO_VALIDADE_MINUTOS = 15;
const SENHA_MINIMA = 6;

function hashSenha(senha) {
  return bcrypt.hashSync(senha, RODADAS_HASH);
}

function senhaEhHash(valor) {
  return typeof valor === 'string' && /^\$2[aby]\$\d{2}\$/.test(valor);
}

function conferirSenha(senha, hash) {
  if (!senha || !hash) return false;
  if (!senhaEhHash(hash)) return senha === hash;
  return bcrypt.compareSync(senha, hash);
}

function gerarToken() {
  return crypto.randomUUID();
}

function gerarCodigo() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function tokenExpirado(registro) {
  if (!registro.expiraEm) return false;
  return new Date(registro.expiraEm).getTime() < Date.now();
}

function calcularExpiracao(horas = TOKEN_VALIDADE_HORAS) {
  return new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();
}

function emailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validarNovaSenha(senha) {
  if (!senha || typeof senha !== 'string') return 'Informe a nova senha.';
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  return null;
}

module.exports = {
  hashSenha,
  senhaEhHash,
  conferirSenha,
  gerarToken,
  gerarCodigo,
  tokenExpirado,
  calcularExpiracao,
  emailValido,
  validarNovaSenha,
  TOKEN_VALIDADE_HORAS,
  CODIGO_VALIDADE_MINUTOS,
};
