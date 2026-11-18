const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { permitir } = require('../middleware/auth');
const { paraInteiro, texto, agora } = require('../utils/formatar');

const router = express.Router();

const STATUS = {
  ABERTO: 'ABERTO',
  EM_ANALISE: 'EM ANÁLISE',
  EM_ATENDIMENTO: 'EM ATENDIMENTO',
  AGUARDANDO: 'AGUARDANDO USUÁRIO',
  RESOLVIDO: 'RESOLVIDO',
  ENCERRADO: 'ENCERRADO',
  CANCELADO: 'CANCELADO',
};

const TRANSICOES_VALIDAS = {
  [STATUS.ABERTO]: [STATUS.EM_ANALISE, STATUS.CANCELADO],
  [STATUS.EM_ANALISE]: [STATUS.EM_ATENDIMENTO, STATUS.AGUARDANDO, STATUS.CANCELADO],
  [STATUS.EM_ATENDIMENTO]: [STATUS.AGUARDANDO, STATUS.RESOLVIDO, STATUS.CANCELADO],
  [STATUS.AGUARDANDO]: [STATUS.EM_ATENDIMENTO, STATUS.CANCELADO],
  [STATUS.RESOLVIDO]: [STATUS.ENCERRADO],
  [STATUS.ENCERRADO]: [],
  [STATUS.CANCELADO]: [],
};

// O cliente só pode: cancelar antes do atendimento, responder quando o técnico
// está aguardando e confirmar a solução (RESOLVIDO -> ENCERRADO)
const TRANSICOES_DO_CLIENTE = {
  [STATUS.ABERTO]: [STATUS.CANCELADO],
  [STATUS.EM_ANALISE]: [STATUS.CANCELADO],
  [STATUS.AGUARDANDO]: [STATUS.EM_ATENDIMENTO, STATUS.CANCELADO],
  [STATUS.RESOLVIDO]: [STATUS.ENCERRADO],
};

const STATUS_FINALIZADOS = [STATUS.ENCERRADO, STATUS.CANCELADO];
const PRIORIDADES_VALIDAS = ['Baixa', 'Média', 'Alta', 'Crítica'];

// ---------- Anexos ----------

const PASTA_UPLOADS = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const LIMITE_ARQUIVO = 10 * 1024 * 1024;
const MAXIMO_ARQUIVOS = 5;
const EXTENSOES_PERMITIDAS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.log', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.zip'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(PASTA_UPLOADS, { recursive: true });
      cb(null, PASTA_UPLOADS);
    },
    filename: (req, file, cb) => {
      const extensao = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extensao}`);
    },
  }),
  limits: { fileSize: LIMITE_ARQUIVO, files: MAXIMO_ARQUIVOS },
  fileFilter: (req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();
    if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
    cb(null, true);
  },
});

// Aceita JSON ou multipart/form-data (o formulário de novo chamado envia anexos)
function receberAnexos(req, res, next) {
  if (!req.is('multipart/form-data')) return next();

  upload.array('anexos', MAXIMO_ARQUIVOS)(req, res, (err) => {
    if (!err) return next();

    const mensagens = {
      LIMIT_FILE_SIZE: 'Cada arquivo deve ter no máximo 10MB.',
      LIMIT_FILE_COUNT: `Envie no máximo ${MAXIMO_ARQUIVOS} arquivos.`,
      LIMIT_UNEXPECTED_FILE: `Tipo de arquivo não permitido. Use: ${EXTENSOES_PERMITIDAS.join(', ')}`,
    };
    return res.status(400).json({ erro: mensagens[err.code] || 'Não foi possível receber os anexos.' });
  });
}

function apagarArquivos(arquivos = []) {
  arquivos.forEach((arquivo) => {
    fs.rm(path.join(PASTA_UPLOADS, path.basename(arquivo)), { force: true }, () => {});
  });
}

function descartarUpload(req) {
  apagarArquivos((req.files || []).map((f) => f.filename));
}

// ---------- Funções auxiliares ----------

function buscarChamado(req, res) {
  const id = paraInteiro(req.params.id);
  const chamado = db.data.chamados.find((c) => c.id === id);

  if (!chamado) {
    res.status(404).json({ erro: 'Chamado não encontrado.' });
    return null;
  }
  if (req.usuario.perfil === 'cliente' && chamado.solicitanteId !== req.usuario.id) {
    res.status(403).json({ erro: 'Acesso negado a este chamado.' });
    return null;
  }
  return chamado;
}

function nomeDoUsuario(id) {
  const usuario = db.data.usuarios.find((u) => u.id === id);
  return usuario ? usuario.nome : null;
}

function transicoesPara(usuario, chamado) {
  if (usuario.perfil === 'cliente') {
    return chamado.solicitanteId === usuario.id ? TRANSICOES_DO_CLIENTE[chamado.status] || [] : [];
  }
  return TRANSICOES_VALIDAS[chamado.status] || [];
}

function enriquecer(chamado) {
  const categoria = db.data.categorias.find((c) => c.id === chamado.categoriaId);
  const equipamento = chamado.equipamentoId
    ? db.data.equipamentos.find((e) => e.id === chamado.equipamentoId)
    : null;
  const { anexos = [], ...dados } = chamado;

  return {
    ...dados,
    dataAtualizacao: chamado.dataAtualizacao || chamado.dataAbertura,
    solicitanteNome: nomeDoUsuario(chamado.solicitanteId),
    tecnicoNome: chamado.tecnicoId ? nomeDoUsuario(chamado.tecnicoId) : null,
    categoriaNome: categoria ? categoria.nome : null,
    equipamentoNome: equipamento ? equipamento.nome : null,
    equipamentoPatrimonio: equipamento ? equipamento.patrimonio : null,
    totalAnexos: anexos.length,
  };
}

function adicionarHistorico(chamadoId, usuarioId, statusAnterior, statusNovo, observacao) {
  db.data.historico.push({
    id: db.nextId('historico'),
    chamadoId,
    usuarioId,
    statusAnterior,
    statusNovo,
    observacao: observacao || null,
    dataEvento: agora(),
  });
}

function marcarAtualizacao(chamado) {
  chamado.dataAtualizacao = agora();
}

function validarCategoria(categoriaId) {
  if (Number.isNaN(categoriaId) || categoriaId === null) return 'Categoria inválida.';
  const categoria = db.data.categorias.find((c) => c.id === categoriaId);
  if (!categoria) return 'Categoria não encontrada.';
  if (categoria.status !== 'Ativa') return 'Esta categoria está inativa.';
  return null;
}

function validarEquipamento(equipamentoId) {
  if (equipamentoId === null) return null;
  if (Number.isNaN(equipamentoId)) return 'Equipamento inválido.';
  const eq = db.data.equipamentos.find((e) => e.id === equipamentoId);
  return eq ? null : 'Equipamento não encontrado.';
}

function validarTecnico(tecnicoId) {
  return db.data.usuarios.find((u) => u.id === tecnicoId && u.perfil === 'tecnico' && u.status === 'Ativo');
}

// ---------- Rotas ----------

router.get('/', authMiddleware, (req, res) => {
  const { status, prioridade, solicitanteId, tecnicoId, categoriaId, busca, atribuidosAMim } = req.query;
  let resultado = db.data.chamados;

  if (req.usuario.perfil === 'cliente') {
    resultado = resultado.filter((c) => c.solicitanteId === req.usuario.id);
  }

  if (status) resultado = resultado.filter((c) => c.status === status);
  if (prioridade) resultado = resultado.filter((c) => c.prioridade === prioridade);
  if (solicitanteId) resultado = resultado.filter((c) => c.solicitanteId === paraInteiro(solicitanteId));
  if (tecnicoId) resultado = resultado.filter((c) => c.tecnicoId === paraInteiro(tecnicoId));
  if (categoriaId) resultado = resultado.filter((c) => c.categoriaId === paraInteiro(categoriaId));
  if (atribuidosAMim === 'true' || atribuidosAMim === '1') {
    resultado = resultado.filter((c) => c.tecnicoId === req.usuario.id);
  }

  resultado = resultado.map(enriquecer);

  if (busca) {
    const termo = String(busca).trim().toLowerCase();
    resultado = resultado.filter(
      (c) =>
        String(c.id) === termo.replace('#', '') ||
        c.titulo.toLowerCase().includes(termo) ||
        (c.solicitanteNome || '').toLowerCase().includes(termo)
    );
  }

  resultado.sort((a, b) => new Date(b.dataAtualizacao) - new Date(a.dataAtualizacao));

  return res.json(resultado);
});

router.get('/:id', authMiddleware, (req, res) => {
  const chamado = buscarChamado(req, res);
  if (!chamado) return;

  const historico = db.data.historico
    .filter((h) => h.chamadoId === chamado.id)
    .map((h) => ({ ...h, usuarioNome: nomeDoUsuario(h.usuarioId) }))
    .sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento));

  const comentarios = db.data.comentarios
    .filter((c) => c.chamadoId === chamado.id)
    .sort((a, b) => new Date(a.dataCriacao) - new Date(b.dataCriacao));

  const anexos = (chamado.anexos || []).map(({ arquivo, ...anexo }) => ({
    ...anexo,
    url: `/api/chamados/${chamado.id}/anexos/${anexo.id}`,
  }));

  return res.json({
    ...enriquecer(chamado),
    historico,
    comentarios,
    anexos,
    transicoesPermitidas: transicoesPara(req.usuario, chamado),
  });
});

router.post('/', authMiddleware, receberAnexos, (req, res) => {
  const titulo = texto(req.body.titulo);
  const descricao = texto(req.body.descricao);
  const prioridade = texto(req.body.prioridade) || 'Média';
  const categoriaId = paraInteiro(req.body.categoriaId);
  const equipamentoId = paraInteiro(req.body.equipamentoId);

  const falhar = (status, erro) => {
    descartarUpload(req);
    return res.status(status).json({ erro });
  };

  if (!titulo || !descricao || categoriaId === null) {
    return falhar(400, 'Campos obrigatórios: titulo, descricao, categoriaId.');
  }
  if (titulo.length < 5 || titulo.length > 150) {
    return falhar(400, 'O título deve ter entre 5 e 150 caracteres.');
  }
  if (descricao.length < 10) {
    return falhar(400, 'A descrição deve ter pelo menos 10 caracteres.');
  }
  if (!PRIORIDADES_VALIDAS.includes(prioridade)) {
    return falhar(400, `Prioridade inválida. Use: ${PRIORIDADES_VALIDAS.join(', ')}`);
  }

  const erroCategoria = validarCategoria(categoriaId);
  if (erroCategoria) return falhar(400, erroCategoria);

  const erroEquipamento = validarEquipamento(equipamentoId);
  if (erroEquipamento) return falhar(400, erroEquipamento);

  // técnico ou admin podem abrir em nome de outra pessoa
  let solicitanteId = req.usuario.id;
  if (req.usuario.perfil !== 'cliente' && req.body.solicitanteId) {
    solicitanteId = paraInteiro(req.body.solicitanteId);
    if (!db.data.usuarios.some((u) => u.id === solicitanteId && u.status === 'Ativo')) {
      return falhar(400, 'Solicitante não encontrado.');
    }
  }

  const novoId = db.nextId('chamados');
  const dataAgora = agora();

  const anexos = (req.files || []).map((arquivo, i) => ({
    id: i + 1,
    nomeOriginal: arquivo.originalname,
    arquivo: arquivo.filename,
    tipo: arquivo.mimetype,
    tamanho: arquivo.size,
    usuarioId: req.usuario.id,
    dataUpload: dataAgora,
  }));

  const novoChamado = {
    id: novoId,
    titulo,
    descricao,
    solicitanteId,
    tecnicoId: null,
    categoriaId,
    equipamentoId,
    prioridade,
    status: STATUS.ABERTO,
    dataAbertura: dataAgora,
    dataAtualizacao: dataAgora,
    dataEncerramento: null,
    anexos,
  };

  db.data.chamados.push(novoChamado);
  adicionarHistorico(novoId, req.usuario.id, null, STATUS.ABERTO, 'Chamado aberto.');
  db.save();

  return res.status(201).json(enriquecer(novoChamado));
});

router.put('/:id', authMiddleware, (req, res) => {
  const chamado = buscarChamado(req, res);
  if (!chamado) return;

  if (STATUS_FINALIZADOS.includes(chamado.status)) {
    return res.status(422).json({ erro: 'Chamados encerrados ou cancelados não podem ser editados.' });
  }

  const perfil = req.usuario.perfil;
  const camposPorPerfil = {
    cliente: ['titulo', 'descricao', 'categoriaId', 'equipamentoId', 'prioridade'],
    tecnico: ['categoriaId', 'equipamentoId', 'prioridade'],
    admin: ['titulo', 'descricao', 'categoriaId', 'equipamentoId', 'prioridade', 'tecnicoId'],
  };

  if (perfil === 'cliente' && chamado.status !== STATUS.ABERTO) {
    return res.status(422).json({ erro: 'O chamado só pode ser editado enquanto estiver ABERTO.' });
  }

  const enviados = Object.keys(req.body).filter((campo) => req.body[campo] !== undefined);
  const proibidos = enviados.filter((campo) => !camposPorPerfil[perfil].includes(campo));
  if (proibidos.length) {
    return res.status(403).json({ erro: `Você não pode alterar: ${proibidos.join(', ')}.` });
  }
  if (!enviados.length) {
    return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });
  }

  const alteracoes = [];
  const novo = {};

  if (req.body.titulo !== undefined) {
    const titulo = texto(req.body.titulo);
    if (!titulo || titulo.length < 5 || titulo.length > 150) {
      return res.status(400).json({ erro: 'O título deve ter entre 5 e 150 caracteres.' });
    }
    novo.titulo = titulo;
  }
  if (req.body.descricao !== undefined) {
    const descricao = texto(req.body.descricao);
    if (!descricao || descricao.length < 10) {
      return res.status(400).json({ erro: 'A descrição deve ter pelo menos 10 caracteres.' });
    }
    novo.descricao = descricao;
  }
  if (req.body.prioridade !== undefined) {
    if (!PRIORIDADES_VALIDAS.includes(req.body.prioridade)) {
      return res.status(400).json({ erro: `Prioridade inválida. Use: ${PRIORIDADES_VALIDAS.join(', ')}` });
    }
    if (req.body.prioridade !== chamado.prioridade) {
      alteracoes.push(`Prioridade alterada de ${chamado.prioridade} para ${req.body.prioridade}.`);
    }
    novo.prioridade = req.body.prioridade;
  }
  if (req.body.categoriaId !== undefined) {
    const categoriaId = paraInteiro(req.body.categoriaId);
    const erro = validarCategoria(categoriaId);
    if (erro) return res.status(400).json({ erro });
    if (categoriaId !== chamado.categoriaId) alteracoes.push('Categoria alterada.');
    novo.categoriaId = categoriaId;
  }
  if (req.body.equipamentoId !== undefined) {
    const equipamentoId = paraInteiro(req.body.equipamentoId);
    const erro = validarEquipamento(equipamentoId);
    if (erro) return res.status(400).json({ erro });
    novo.equipamentoId = equipamentoId;
  }
  if (req.body.tecnicoId !== undefined) {
    const tecnicoId = paraInteiro(req.body.tecnicoId);
    if (tecnicoId !== null && !validarTecnico(tecnicoId)) {
      return res.status(400).json({ erro: 'Técnico não encontrado ou inativo.' });
    }
    if (tecnicoId !== chamado.tecnicoId) {
      alteracoes.push(tecnicoId ? `Chamado atribuído para ${nomeDoUsuario(tecnicoId)}.` : 'Técnico removido do chamado.');
    }
    novo.tecnicoId = tecnicoId;
  }

  Object.assign(chamado, novo);
  marcarAtualizacao(chamado);

  if (alteracoes.length) {
    adicionarHistorico(chamado.id, req.usuario.id, chamado.status, chamado.status, alteracoes.join(' '));
  }

  db.save();
  return res.json(enriquecer(chamado));
});

router.delete('/:id', authMiddleware, permitir('admin'), (req, res) => {
  const chamado = buscarChamado(req, res);
  if (!chamado) return;

  apagarArquivos((chamado.anexos || []).map((a) => a.arquivo));

  db.data.chamados = db.data.chamados.filter((c) => c.id !== chamado.id);
  db.data.historico = db.data.historico.filter((h) => h.chamadoId !== chamado.id);
  db.data.comentarios = db.data.comentarios.filter((c) => c.chamadoId !== chamado.id);
  db.save();

  return res.json({ mensagem: 'Chamado excluído com sucesso.' });
});

// Técnico assume o chamado para si
router.patch('/:id/assumir', authMiddleware, permitir('tecnico', 'admin'), (req, res) => {
  const chamado = buscarChamado(req, res);
  if (!chamado) return;

  if (![STATUS.ABERTO, STATUS.EM_ANALISE].includes(chamado.status)) {
    return res.status(422).json({ erro: 'Só é possível assumir chamados ABERTOS ou EM ANÁLISE.' });
  }

  let tecnicoId = req.usuario.id;
  if (req.usuario.perfil === 'admin') {
    tecnicoId = paraInteiro(req.body.tecnicoId);
    if (!validarTecnico(tecnicoId)) {
      return res.status(400).json({ erro: 'Informe o tecnicoId de um técnico ativo.' });
    }
  } else if (chamado.tecnicoId && chamado.tecnicoId !== req.usuario.id) {
    return res.status(409).json({ erro: `Este chamado já está com ${nomeDoUsuario(chamado.tecnicoId)}.` });
  }

  const statusAnterior = chamado.status;
  chamado.tecnicoId = tecnicoId;
  chamado.status = STATUS.EM_ANALISE;
  marcarAtualizacao(chamado);

  adicionarHistorico(chamado.id, req.usuario.id, statusAnterior, chamado.status, `Chamado assumido por ${nomeDoUsuario(tecnicoId)}.`);
  db.save();

  return res.json(enriquecer(chamado));
});

router.patch('/:id/status', authMiddleware, (req, res) => {
  const chamado = buscarChamado(req, res);
  if (!chamado) return;

  const { novoStatus } = req.body;
  const observacao = texto(req.body.observacao);

  if (!novoStatus) {
    return res.status(400).json({ erro: 'novoStatus é obrigatório.' });
  }

  const validas = TRANSICOES_VALIDAS[chamado.status] || [];
  if (!validas.includes(novoStatus)) {
    return res.status(422).json({
      erro: `Transição inválida: '${chamado.status}' → '${novoStatus}'. Transições permitidas: ${validas.join(', ') || 'nenhuma'}`,
    });
  }

  if (!transicoesPara(req.usuario, chamado).includes(novoStatus)) {
    return res.status(403).json({ erro: 'Você não tem permissão para fazer esta alteração de status.' });
  }

  if (novoStatus === STATUS.EM_ATENDIMENTO && req.usuario.perfil !== 'cliente') {
    let tecnico = null;
    if (req.body.tecnicoId) {
      tecnico = validarTecnico(paraInteiro(req.body.tecnicoId));
    } else if (chamado.tecnicoId) {
      tecnico = db.data.usuarios.find((u) => u.id === chamado.tecnicoId);
    } else if (req.usuario.perfil === 'tecnico') {
      tecnico = req.usuario;
    }

    if (!tecnico) {
      return res.status(400).json({ erro: 'Para mover para EM ATENDIMENTO é necessário informar um tecnicoId válido.' });
    }
    chamado.tecnicoId = tecnico.id;
  }

  if (novoStatus === STATUS.AGUARDANDO && !observacao) {
    return res.status(400).json({ erro: 'Explique na observação o que o usuário precisa responder.' });
  }

  const statusAnterior = chamado.status;
  chamado.status = novoStatus;
  marcarAtualizacao(chamado);

  if (STATUS_FINALIZADOS.includes(novoStatus)) {
    chamado.dataEncerramento = chamado.dataAtualizacao;
  }

  adicionarHistorico(chamado.id, req.usuario.id, statusAnterior, novoStatus, observacao);
  db.save();

  return res.json(enriquecer(chamado));
});

// Reabertura: quando a solução não resolveu o problema
router.patch('/:id/reabrir', authMiddleware, (req, res) => {
  const chamado = buscarChamado(req, res);
  if (!chamado) return;

  const motivo = texto(req.body.motivo);

  if (![STATUS.RESOLVIDO, STATUS.ENCERRADO].includes(chamado.status)) {
    return res.status(422).json({ erro: 'Só é possível reabrir chamados RESOLVIDOS ou ENCERRADOS.' });
  }
  if (!motivo) {
    return res.status(400).json({ erro: 'Informe o motivo da reabertura.' });
  }

  const statusAnterior = chamado.status;
  chamado.status = chamado.tecnicoId ? STATUS.EM_ATENDIMENTO : STATUS.ABERTO;
  chamado.dataEncerramento = null;
  marcarAtualizacao(chamado);

  adicionarHistorico(chamado.id, req.usuario.id, statusAnterior, chamado.status, `Chamado reaberto: ${motivo}`);
  db.save();

  return res.json(enriquecer(chamado));
});

function comentar(req, res) {
  const chamado = buscarChamado(req, res);
  if (!chamado) return;

  const comentario = texto(req.body.comentario ?? req.body.texto);
  if (!comentario) {
    return res.status(400).json({ erro: 'O campo comentario não pode estar vazio.' });
  }
  if (chamado.status === STATUS.CANCELADO) {
    return res.status(422).json({ erro: 'Não é possível comentar em um chamado cancelado.' });
  }

  const novoComentario = {
    id: db.nextId('comentarios'),
    chamadoId: chamado.id,
    usuarioId: req.usuario.id,
    usuarioNome: req.usuario.nome,
    comentario,
    dataCriacao: agora(),
  };

  db.data.comentarios.push(novoComentario);
  marcarAtualizacao(chamado);
  db.save();

  return res.status(201).json(novoComentario);
}

router.post('/:id/observacoes', authMiddleware, comentar);
router.post('/:id/comentarios', authMiddleware, comentar);

router.get('/:id/anexos/:anexoId', authMiddleware, (req, res) => {
  const chamado = buscarChamado(req, res);
  if (!chamado) return;

  const anexo = (chamado.anexos || []).find((a) => a.id === paraInteiro(req.params.anexoId));
  if (!anexo) return res.status(404).json({ erro: 'Anexo não encontrado.' });

  const caminho = path.join(PASTA_UPLOADS, path.basename(anexo.arquivo));
  if (!fs.existsSync(caminho)) {
    return res.status(404).json({ erro: 'O arquivo deste anexo não está mais disponível.' });
  }

  return res.download(caminho, anexo.nomeOriginal);
});

module.exports = router;
module.exports.STATUS = STATUS;
