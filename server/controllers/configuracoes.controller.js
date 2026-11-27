const db = require('../db');
const { PRIORIDADES_VALIDAS } = require('../config/constants');
const { texto } = require('../utils/formatar');
const { emailValido } = require('../utils/seguranca');
const { asyncHandler } = require('../utils/http-error');
const {
  PROVEDORES_SMTP_SUGERIDOS,
  obterConfigSmtpEfetiva,
  obterStatusPublicoSmtp,
  enviarEmailTeste,
} = require('../services/email.service');

function obterParametros(req, res) {
  const cfg = db.data.configuracoes;
  const resposta = {
    nomeOrganizacao: cfg.nomeOrganizacao,
    slaPadraoHoras: cfg.slaPadraoHoras,
    slaPorPrioridade: cfg.slaPorPrioridade,
    prioridadePadrao: cfg.prioridadePadrao,
    cadastroPublicoAtivo: cfg.cadastroPublicoAtivo,
    notificarPorEmail: cfg.notificarPorEmail,
    smtpStatus: obterStatusPublicoSmtp(),
  };

  if (req.usuario.perfil === 'admin') {
    const efetiva = obterConfigSmtpEfetiva();
    const salvo = cfg.smtp || {};
    resposta.smtp = {
      ativo: Boolean(efetiva.ativo),
      origem: efetiva.origem,
      host: salvo.host || efetiva.host || '',
      port: Number(salvo.port || efetiva.port || 587),
      secure: Boolean(salvo.secure ?? efetiva.secure),
      user: salvo.user || efetiva.user || '',
      possuiSenha: Boolean(salvo.pass || efetiva.pass),
      fromName: salvo.fromName || efetiva.fromName || 'SecureDesk Central de TI',
      fromEmail: salvo.fromEmail || efetiva.fromEmail || '',
      provedoresSugeridos: PROVEDORES_SMTP_SUGERIDOS,
    };
  }

  return res.json(resposta);
}

function atualizarParametros(req, res) {
  const cfg = db.data.configuracoes;

  if (req.body.nomeOrganizacao !== undefined) {
    const nome = texto(req.body.nomeOrganizacao);
    if (nome && nome.length >= 2) cfg.nomeOrganizacao = nome;
  }

  if (req.body.slaPadraoHoras !== undefined) {
    const sla = Number(req.body.slaPadraoHoras);
    if (Number.isFinite(sla) && sla >= 1 && sla <= 168) {
      cfg.slaPadraoHoras = Math.round(sla);
    }
  }

  if (req.body.slaPorPrioridade && typeof req.body.slaPorPrioridade === 'object') {
    PRIORIDADES_VALIDAS.forEach((p) => {
      const v = Number(req.body.slaPorPrioridade[p]);
      if (Number.isFinite(v) && v >= 1 && v <= 336) {
        cfg.slaPorPrioridade[p] = Math.round(v);
      }
    });
  }

  if (req.body.prioridadePadrao !== undefined) {
    if (!PRIORIDADES_VALIDAS.includes(req.body.prioridadePadrao)) {
      return res.status(400).json({ erro: 'Prioridade padrão inválida.' });
    }
    cfg.prioridadePadrao = req.body.prioridadePadrao;
  }

  if (req.body.cadastroPublicoAtivo !== undefined) {
    cfg.cadastroPublicoAtivo = Boolean(req.body.cadastroPublicoAtivo);
  }

  if (req.body.notificarPorEmail !== undefined) {
    cfg.notificarPorEmail = Boolean(req.body.notificarPorEmail);
  }

  db.save();
  return obterParametros(req, res);
}

function atualizarSmtp(req, res) {
  const atual = db.data.configuracoes.smtp || {};
  const ativo = Boolean(req.body.ativo);
  const host = texto(req.body.host || '');
  const port = Number(req.body.port || 587);
  const secure = Boolean(req.body.secure) || port === 465;
  const user = texto(req.body.user || '');
  const novaSenha = req.body.pass !== undefined && req.body.pass !== '' ? String(req.body.pass) : atual.pass || '';
  const fromName = texto(req.body.fromName || 'SecureDesk Central de TI');
  const fromEmail = texto(req.body.fromEmail || user);

  if (ativo && (!host || !user || !novaSenha)) {
    return res.status(400).json({
      erro: 'Para ativar o envio real de e-mails, preencha Host SMTP, Usuário e Senha de App.',
    });
  }

  db.data.configuracoes.smtp = {
    ativo,
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure,
    user,
    pass: novaSenha,
    fromName,
    fromEmail,
  };

  db.save();
  return obterParametros(req, res);
}

const testarSmtp = asyncHandler(async (req, res) => {
  const destinatario = texto(req.body.destinatario) || req.usuario.email;
  if (!emailValido(destinatario)) {
    return res.status(400).json({ erro: 'Informe um e-mail de destino válido para o teste.' });
  }

  let override = null;
  if (req.body.host && req.body.user) {
    const senhaSalva = db.data.configuracoes?.smtp?.pass || '';
    override = {
      host: req.body.host,
      port: req.body.port,
      secure: req.body.secure,
      user: req.body.user,
      pass: req.body.pass || senhaSalva,
      fromName: req.body.fromName,
      fromEmail: req.body.fromEmail,
    };
  }

  const resultado = await enviarEmailTeste({ destinatario, smtpOverride: override });
  if (!resultado.ok) {
    return res.status(400).json({ erro: resultado.erro });
  }

  return res.json({
    mensagem: resultado.mensagem,
    messageId: resultado.messageId,
  });
});

module.exports = {
  obterParametros,
  atualizarParametros,
  atualizarSmtp,
  testarSmtp,
};
