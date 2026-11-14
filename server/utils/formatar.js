// Funções usadas por várias rotas para montar as respostas da API

function semSenha(usuario) {
  if (!usuario) return null;
  const { senha, ...resto } = usuario;
  return resto;
}

function paraInteiro(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  return Number.isInteger(numero) ? numero : NaN;
}

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : valor;
}

function agora() {
  return new Date().toISOString();
}

module.exports = { semSenha, paraInteiro, texto, agora };
