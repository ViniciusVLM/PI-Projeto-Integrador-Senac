const nodemailer = require('nodemailer');
const env = require('../config/env');
const db = require('../db');

const PROVEDORES_SMTP_SUGERIDOS = [
  {
    id: 'gmail',
    nome: 'Gmail Gratuito (Senha de App)',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    instrucoes: 'Ative a verificação em duas etapas na Conta Google, acesse Segurança > Senhas de app, gere uma senha de 16 caracteres e use-a no campo Senha SMTP.',
  },
  {
    id: 'brevo',
    nome: 'Brevo (ex-Sendinblue) — 300 e-mails/dia grátis',
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    instrucoes: 'Crie uma conta gratuita em brevo.com, acesse SMTP & API e gere uma chave SMTP para usar como senha.',
  },
  {
    id: 'outlook',
    nome: 'Outlook / Hotmail / Microsoft 365',
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    instrucoes: 'Utilize seu e-mail completo e uma senha de aplicativo gerada nas configurações de segurança da conta Microsoft.',
  },
  {
    id: 'mailtrap',
    nome: 'Mailtrap Sandbox (Testes de Desenvolvimento)',
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    secure: false,
    instrucoes: 'Ideal para validar disparo de e-mails em ambiente de homologação sem entregar na caixa real.',
  },
];

function obterConfigSmtpEfetiva(override = null) {
  if (override && override.host && override.user && override.pass) {
    return {
      ativo: true,
      origem: 'teste',
      host: String(override.host).trim(),
      port: Number(override.port || 587),
      secure: Boolean(override.secure) || Number(override.port) === 465,
      user: String(override.user).trim(),
      pass: String(override.pass),
      fromName: String(override.fromName || 'SecureDesk Central de TI').trim(),
      fromEmail: String(override.fromEmail || override.user).trim(),
    };
  }

  const salvo = db.data?.configuracoes?.smtp;
  if (salvo && salvo.ativo && salvo.host && salvo.user && salvo.pass) {
    return {
      ativo: true,
      origem: 'painel',
      host: String(salvo.host).trim(),
      port: Number(salvo.port || 587),
      secure: Boolean(salvo.secure) || Number(salvo.port) === 465,
      user: String(salvo.user).trim(),
      pass: String(salvo.pass),
      fromName: String(salvo.fromName || 'SecureDesk Central de TI').trim(),
      fromEmail: String(salvo.fromEmail || salvo.user).trim(),
    };
  }

  if (env.smtp.host && env.smtp.user && env.smtp.pass) {
    return {
      ativo: true,
      origem: 'env',
      host: env.smtp.host.trim(),
      port: env.smtp.port,
      secure: env.smtp.secure,
      user: env.smtp.user.trim(),
      pass: env.smtp.pass,
      fromName: env.smtp.fromName,
      fromEmail: env.smtp.fromEmail || env.smtp.user.trim(),
    };
  }

  return {
    ativo: false,
    origem: 'simulado',
    host: salvo?.host || env.smtp.host || '',
    port: Number(salvo?.port || env.smtp.port || 587),
    secure: Boolean(salvo?.secure ?? env.smtp.secure),
    user: salvo?.user || env.smtp.user || '',
    pass: '',
    fromName: salvo?.fromName || env.smtp.fromName || 'SecureDesk Central de TI',
    fromEmail: salvo?.fromEmail || env.smtp.fromEmail || '',
  };
}

function criarTransporter(cfg) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layoutEmailCorporativo({ preheader, titulo, saudacao, conteudoHtml, rodapeExtra }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escaparHtml(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escaparHtml(preheader || titulo)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background-color:#0f172a;padding:22px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">SecureDesk</span>
                    <span style="display:block;font-size:12px;color:#94a3b8;margin-top:2px;">Central Corporativa de Serviços de TI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">${escaparHtml(titulo)}</h1>
              ${saudacao ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">${escaparHtml(saudacao)}</p>` : ''}
              ${conteudoHtml}
              ${rodapeExtra ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#64748b;">${escaparHtml(rodapeExtra)}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
              Mensagem automática enviada pelo SecureDesk • Não responda diretamente a este endereço se não solicitado.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function traduzirErroSmtp(err) {
  const msg = String(err?.message || '');
  if (err?.code === 'EAUTH' || /535|Username and Password not accepted|Invalid login/i.test(msg)) {
    return 'Falha de autenticação SMTP. Se estiver usando Gmail, gere uma "Senha de App" de 16 dígitos na Conta Google (a senha comum do e-mail não é aceita pelo SMTP).';
  }
  if (err?.code === 'ESOCKET' || err?.code === 'ECONNECTION' || err?.code === 'ETIMEDOUT') {
    return `Não foi possível conectar ao servidor SMTP (${err.code}). Verifique o host, a porta (587 para TLS ou 465 para SSL) e sua conexão de rede.`;
  }
  return `Erro ao enviar e-mail via SMTP: ${msg || 'falha desconhecida'}`;
}

async function enviarCodigoRecuperacao({ para, nome, codigo, validadeMinutos }) {
  const cfg = obterConfigSmtpEfetiva();

  // Em testes automatizados (DB_FILE) ou quando SMTP não está configurado, usa log simulado
  if (env.IS_TEST_FILE || !cfg.ativo) {
    console.log(`[E-MAIL SIMULADO] Código de redefinição para ${para}: ${codigo}`);
    return { enviado: false, simulado: true, modo: 'simulado' };
  }

  const transporter = criarTransporter(cfg);
  const remetente = `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`;

  const html = layoutEmailCorporativo({
    preheader: `Seu código de verificação do SecureDesk é ${codigo}`,
    titulo: 'Código de redefinição de senha',
    saudacao: `Olá, ${nome || 'usuário'}. Recebemos uma solicitação para redefinir a senha da sua conta no SecureDesk.`,
    conteudoHtml: `
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">
        Informe o código de 6 dígitos abaixo na tela de recuperação para criar sua nova senha:
      </p>
      <div style="margin:20px 0;padding:18px 24px;background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;text-align:center;">
        <span style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#0f172a;">${escaparHtml(codigo)}</span>
      </div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">
        Este código expira em <strong>${Number(validadeMinutos)} minutos</strong> e pode ser utilizado apenas uma vez.
      </p>
    `,
    rodapeExtra: 'Se você não solicitou a redefinição de senha, ignore esta mensagem — sua conta permanece protegida.',
  });

  const textoPuro = [
    `Olá, ${nome || 'usuário'}.`,
    '',
    `Seu código de verificação do SecureDesk é: ${codigo}`,
    `Validade: ${validadeMinutos} minutos.`,
    '',
    'Se você não solicitou esta alteração, ignore este e-mail.',
  ].join('\n');

  try {
    const info = await transporter.sendMail({
      from: remetente,
      to: para,
      subject: `${codigo} é seu código de recuperação — SecureDesk`,
      text: textoPuro,
      html,
    });
    console.log(`[SMTP] Código de redefinição enviado para ${para} (${info.messageId})`);
    return { enviado: true, simulado: false, modo: cfg.origem, messageId: info.messageId };
  } catch (err) {
    console.error('[SMTP ERRO]', err.message);
    console.log(`[E-MAIL SIMULADO] Código de redefinição para ${para}: ${codigo}`);
    return { enviado: false, simulado: true, erro: traduzirErroSmtp(err) };
  }
}

async function enviarNotificacaoChamado({ para, nome, assunto, tituloChamado, chamadoId, status, detalhes }) {
  const cfg = obterConfigSmtpEfetiva();
  if (env.IS_TEST_FILE || !cfg.ativo || db.data?.configuracoes?.notificarPorEmail === false) {
    return { enviado: false };
  }

  try {
    const transporter = criarTransporter(cfg);
    const html = layoutEmailCorporativo({
      preheader: `${assunto} — Chamado #${chamadoId}`,
      titulo: assunto,
      saudacao: `Olá, ${nome || 'usuário'}. Há uma atualização no chamado #${chamadoId}.`,
      conteudoHtml: `
        <div style="padding:16px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:14px;">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Chamado #${Number(chamadoId)}</div>
          <div style="font-size:15px;font-weight:600;color:#0f172a;margin-top:4px;">${escaparHtml(tituloChamado)}</div>
          ${status ? `<div style="font-size:13px;color:#1d4ed8;font-weight:600;margin-top:8px;">Status atual: ${escaparHtml(status)}</div>` : ''}
        </div>
        ${detalhes ? `<p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">${escaparHtml(detalhes)}</p>` : ''}
      `,
      rodapeExtra: 'Acesse o painel do SecureDesk para visualizar o histórico completo ou responder.',
    });

    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`,
      to: para,
      subject: `[Chamado #${chamadoId}] ${assunto} — SecureDesk`,
      text: `${assunto}\nChamado #${chamadoId}: ${tituloChamado}\n${detalhes || ''}`,
      html,
    });
    return { enviado: true };
  } catch (err) {
    console.error('[SMTP NOTIFICAÇÃO]', err.message);
    return { enviado: false };
  }
}

async function enviarEmailTeste({ destinatario, smtpOverride }) {
  const cfg = obterConfigSmtpEfetiva(smtpOverride);
  if (!cfg.ativo || !cfg.host || !cfg.user || !cfg.pass) {
    return {
      ok: false,
      erro: 'Configure host, porta, usuário e senha SMTP antes de testar o envio.',
    };
  }

  try {
    const transporter = criarTransporter(cfg);
    await transporter.verify();

    const html = layoutEmailCorporativo({
      preheader: 'Configuração SMTP validada com sucesso no SecureDesk.',
      titulo: 'Conexão SMTP validada com sucesso',
      saudacao: 'Este é um disparo real de validação realizado pelo painel administrativo do SecureDesk.',
      conteudoHtml: `
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;">
          O servidor <strong>${escaparHtml(cfg.host)}:${Number(cfg.port)}</strong> respondeu corretamente e está pronto para enviar códigos de recuperação de senha e alertas de chamados.
        </p>
      `,
      rodapeExtra: `Autenticado como ${cfg.user}.`,
    });

    const info = await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`,
      to: destinatario,
      subject: 'Teste de configuração SMTP — SecureDesk',
      text: `Conexão SMTP validada com sucesso no servidor ${cfg.host}:${cfg.port}.`,
      html,
    });

    return {
      ok: true,
      messageId: info.messageId,
      mensagem: `E-mail de teste enviado com sucesso para ${destinatario}! Verifique a caixa de entrada (e a pasta Spam).`,
    };
  } catch (err) {
    return {
      ok: false,
      erro: traduzirErroSmtp(err),
    };
  }
}

function obterStatusPublicoSmtp() {
  const cfg = obterConfigSmtpEfetiva();
  return {
    ativo: cfg.ativo,
    modo: cfg.origem,
    host: cfg.host || null,
  };
}

module.exports = {
  PROVEDORES_SMTP_SUGERIDOS,
  obterConfigSmtpEfetiva,
  obterStatusPublicoSmtp,
  enviarCodigoRecuperacao,
  enviarNotificacaoChamado,
  enviarEmailTeste,
};
