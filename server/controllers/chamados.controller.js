const fs = require('fs');
const path = require('path');
const db = require('../db');
const {
  STATUS_CHAMADO,
  STATUS_FINALIZADOS,
  PRIORIDADES_VALIDAS,
  TRANSICOES_VALIDAS,
} = require('../config/constants');
const { PASTA_UPLOADS, apagarArquivos, descartarUpload } = require('../config/upload');
const { paraInteiro, texto, agora } = require('../utils/formatar');
const {
  nomeDoUsuario,
  transicoesPara,
  enriquecerChamado,
  adicionarHistorico,
  marcarAtualizacao,
  validarCategoria,
  validarEquipamento,
  validarTecnico,
  montarDetalhesChamado,
} = require('../services/chamado.service');
const { criarNotificacao } = require('../services/notificacao.service');

function buscarChamadoAutorizado(req, res) {
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

function listar(req, res) {
  const {
    status,
    prioridade,
    solicitanteId,
    tecnicoId,
    categoriaId,
    equipamentoId,
    busca,
    atribuidosAMim,
    semTecnico,
    slaSituacao,
  } = req.query;

  let resultado = db.data.chamados;

  if (req.usuario.perfil === 'cliente') {
    resultado = resultado.filter((c) => c.solicitanteId === req.usuario.id);
  }

  if (status) resultado = resultado.filter((c) => c.status === status);
  if (prioridade) resultado = resultado.filter((c) => c.prioridade === prioridade);
  if (solicitanteId) resultado = resultado.filter((c) => c.solicitanteId === paraInteiro(solicitanteId));
  if (tecnicoId === 'nenhum') {
    resultado = resultado.filter((c) => !c.tecnicoId);
  } else if (tecnicoId) {
    resultado = resultado.filter((c) => c.tecnicoId === paraInteiro(tecnicoId));
  }
  if (categoriaId) resultado = resultado.filter((c) => c.categoriaId === paraInteiro(categoriaId));
  if (equipamentoId) resultado = resultado.filter((c) => c.equipamentoId === paraInteiro(equipamentoId));
  if (atribuidosAMim === 'true' || atribuidosAMim === '1') {
    resultado = resultado.filter((c) => c.tecnicoId === req.usuario.id);
  }
  if (semTecnico === 'true' || semTecnico === '1') {
    resultado = resultado.filter((c) => !c.tecnicoId && !STATUS_FINALIZADOS.includes(c.status));
  }

  resultado = resultado.map(enriquecerChamado);

  if (slaSituacao) {
    resultado = resultado.filter((c) => c.sla && c.sla.situacao === slaSituacao);
  }

  if (busca) {
    const termo = String(busca).trim().toLowerCase();
    resultado = resultado.filter(
      (c) =>
        String(c.id) === termo.replace('#', '') ||
        c.titulo.toLowerCase().includes(termo) ||
        (c.solicitanteNome || '').toLowerCase().includes(termo) ||
        (c.equipamentoPatrimonio || '').toLowerCase().includes(termo)
    );
  }

  resultado.sort((a, b) => new Date(b.dataAtualizacao) - new Date(a.dataAtualizacao));

  return res.json(resultado);
}

function obterPorId(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
  if (!chamado) return;
  return res.json(montarDetalhesChamado(chamado, req.usuario));
}

function criar(req, res) {
  const titulo = texto(req.body.titulo);
  const descricao = texto(req.body.descricao);
  const prioridadePadrao = db.data?.configuracoes?.prioridadePadrao || 'Média';
  const prioridade = texto(req.body.prioridade) || prioridadePadrao;
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
    status: STATUS_CHAMADO.ABERTO,
    dataAbertura: dataAgora,
    dataAtualizacao: dataAgora,
    dataEncerramento: null,
    anexos,
    avaliacao: null,
  };

  db.data.chamados.push(novoChamado);
  adicionarHistorico(novoId, req.usuario.id, null, STATUS_CHAMADO.ABERTO, 'Chamado aberto.');

  // Notifica técnicos ativos quando um chamado de prioridade Alta ou Crítica entra na fila
  if (prioridade === 'Crítica' || prioridade === 'Alta') {
    db.data.usuarios
      .filter((u) => (u.perfil === 'tecnico' || u.perfil === 'admin') && u.status === 'Ativo' && u.id !== req.usuario.id)
      .forEach((dest) => {
        criarNotificacao({
          usuarioId: dest.id,
          tipo: 'urgente',
          titulo: `Novo chamado ${prioridade.toLowerCase()} #${novoId}`,
          mensagem: `${nomeDoUsuario(solicitanteId)} abriu "${titulo}".`,
          chamadoId: novoId,
        });
      });
  }

  db.save();
  return res.status(201).json(enriquecerChamado(novoChamado));
}

function atualizar(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
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

  if (perfil === 'cliente' && chamado.status !== STATUS_CHAMADO.ABERTO) {
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
  const tecnicoAnteriorId = chamado.tecnicoId;

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
      alteracoes.push(
        tecnicoId ? `Chamado atribuído para ${nomeDoUsuario(tecnicoId)}.` : 'Técnico removido do chamado.'
      );
    }
    novo.tecnicoId = tecnicoId;
  }

  Object.assign(chamado, novo);
  marcarAtualizacao(chamado);

  if (alteracoes.length) {
    adicionarHistorico(chamado.id, req.usuario.id, chamado.status, chamado.status, alteracoes.join(' '));
  }

  if (novo.tecnicoId && novo.tecnicoId !== tecnicoAnteriorId && novo.tecnicoId !== req.usuario.id) {
    criarNotificacao({
      usuarioId: novo.tecnicoId,
      tipo: 'atribuicao',
      titulo: `Chamado #${chamado.id} atribuído a você`,
      mensagem: `${req.usuario.nome} atribuiu o chamado "${chamado.titulo}" para seu atendimento.`,
      chamadoId: chamado.id,
      enviarEmail: true,
    });
  }

  db.save();
  return res.json(enriquecerChamado(chamado));
}

function excluir(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
  if (!chamado) return;

  apagarArquivos((chamado.anexos || []).map((a) => a.arquivo || a.nomeSalvo));

  db.data.chamados = db.data.chamados.filter((c) => c.id !== chamado.id);
  db.data.historico = db.data.historico.filter((h) => h.chamadoId !== chamado.id);
  db.data.comentarios = db.data.comentarios.filter((c) => c.chamadoId !== chamado.id);
  db.data.notificacoes = (db.data.notificacoes || []).filter((n) => n.chamadoId !== chamado.id);
  db.save();

  return res.json({ mensagem: 'Chamado excluído com sucesso.' });
}

function assumir(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
  if (!chamado) return;

  if (![STATUS_CHAMADO.ABERTO, STATUS_CHAMADO.EM_ANALISE].includes(chamado.status)) {
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
  chamado.status = STATUS_CHAMADO.EM_ANALISE;
  marcarAtualizacao(chamado);

  adicionarHistorico(
    chamado.id,
    req.usuario.id,
    statusAnterior,
    chamado.status,
    `Chamado assumido por ${nomeDoUsuario(tecnicoId)}.`
  );

  if (chamado.solicitanteId !== req.usuario.id) {
    criarNotificacao({
      usuarioId: chamado.solicitanteId,
      tipo: 'atribuicao',
      titulo: `Chamado #${chamado.id} em análise`,
      mensagem: `${nomeDoUsuario(tecnicoId)} assumiu seu chamado "${chamado.titulo}".`,
      chamadoId: chamado.id,
      enviarEmail: true,
    });
  }

  if (tecnicoId !== req.usuario.id) {
    criarNotificacao({
      usuarioId: tecnicoId,
      tipo: 'atribuicao',
      titulo: `Chamado #${chamado.id} atribuído a você`,
      mensagem: `${req.usuario.nome} designou você para "${chamado.titulo}".`,
      chamadoId: chamado.id,
      enviarEmail: true,
    });
  }

  db.save();
  return res.json(enriquecerChamado(chamado));
}

function alterarStatus(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
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

  if (novoStatus === STATUS_CHAMADO.EM_ATENDIMENTO && req.usuario.perfil !== 'cliente') {
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

  if (novoStatus === STATUS_CHAMADO.AGUARDANDO && !observacao) {
    return res.status(400).json({ erro: 'Explique na observação o que o usuário precisa responder.' });
  }

  const statusAnterior = chamado.status;
  chamado.status = novoStatus;
  marcarAtualizacao(chamado);

  if (STATUS_FINALIZADOS.includes(novoStatus)) {
    chamado.dataEncerramento = chamado.dataAtualizacao;
  }

  adicionarHistorico(chamado.id, req.usuario.id, statusAnterior, novoStatus, observacao);

  const destinatarioNotif =
    req.usuario.id === chamado.solicitanteId ? chamado.tecnicoId : chamado.solicitanteId;

  if (destinatarioNotif) {
    criarNotificacao({
      usuarioId: destinatarioNotif,
      tipo: 'status',
      titulo: `Chamado #${chamado.id}: ${novoStatus}`,
      mensagem: observacao || `${req.usuario.nome} alterou o status para ${novoStatus}.`,
      chamadoId: chamado.id,
      enviarEmail: true,
    });
  }

  db.save();
  return res.json(enriquecerChamado(chamado));
}

function reabrir(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
  if (!chamado) return;

  const motivo = texto(req.body.motivo);

  if (![STATUS_CHAMADO.RESOLVIDO, STATUS_CHAMADO.ENCERRADO].includes(chamado.status)) {
    return res.status(422).json({ erro: 'Só é possível reabrir chamados RESOLVIDOS ou ENCERRADOS.' });
  }
  if (!motivo) {
    return res.status(400).json({ erro: 'Informe o motivo da reabertura.' });
  }

  const statusAnterior = chamado.status;
  chamado.status = chamado.tecnicoId ? STATUS_CHAMADO.EM_ATENDIMENTO : STATUS_CHAMADO.ABERTO;
  chamado.dataEncerramento = null;
  chamado.avaliacao = null;
  marcarAtualizacao(chamado);

  adicionarHistorico(chamado.id, req.usuario.id, statusAnterior, chamado.status, `Chamado reaberto: ${motivo}`);

  if (chamado.tecnicoId && chamado.tecnicoId !== req.usuario.id) {
    criarNotificacao({
      usuarioId: chamado.tecnicoId,
      tipo: 'reabertura',
      titulo: `Chamado #${chamado.id} reaberto`,
      mensagem: `${req.usuario.nome} reabriu o chamado: "${motivo}".`,
      chamadoId: chamado.id,
      enviarEmail: true,
    });
  }

  db.save();
  return res.json(enriquecerChamado(chamado));
}

function comentar(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
  if (!chamado) return;

  const comentario = texto(req.body.comentario ?? req.body.texto);
  if (!comentario) {
    return res.status(400).json({ erro: 'O campo comentario não pode estar vazio.' });
  }
  if (chamado.status === STATUS_CHAMADO.CANCELADO) {
    return res.status(422).json({ erro: 'Não é possível comentar em um chamado cancelado.' });
  }

  const interno = req.usuario.perfil !== 'cliente' ? Boolean(req.body.interno) : false;

  const novoComentario = {
    id: db.nextId('comentarios'),
    chamadoId: chamado.id,
    usuarioId: req.usuario.id,
    usuarioNome: req.usuario.nome,
    usuarioAvatar: req.usuario.avatarUrl || null,
    usuarioPerfil: req.usuario.perfil,
    comentario,
    interno,
    dataCriacao: agora(),
  };

  db.data.comentarios.push(novoComentario);
  marcarAtualizacao(chamado);

  if (!interno) {
    const destinatarioId =
      req.usuario.id === chamado.solicitanteId ? chamado.tecnicoId : chamado.solicitanteId;
    if (destinatarioId) {
      criarNotificacao({
        usuarioId: destinatarioId,
        tipo: 'comentario',
        titulo: `Nova mensagem no chamado #${chamado.id}`,
        mensagem: `${req.usuario.nome}: "${comentario.slice(0, 90)}${comentario.length > 90 ? '…' : ''}"`,
        chamadoId: chamado.id,
      });
    }
  }

  db.save();
  return res.status(201).json(novoComentario);
}

function adicionarAnexos(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
  if (!chamado) {
    descartarUpload(req);
    return;
  }

  if (STATUS_FINALIZADOS.includes(chamado.status)) {
    descartarUpload(req);
    return res.status(422).json({ erro: 'Não é possível anexar arquivos em chamados finalizados.' });
  }

  const arquivos = req.files || [];
  if (!arquivos.length) {
    return res.status(400).json({ erro: 'Selecione ao menos um arquivo para anexar.' });
  }

  if (!Array.isArray(chamado.anexos)) chamado.anexos = [];
  const proximoId = chamado.anexos.length
    ? Math.max(...chamado.anexos.map((a) => a.id)) + 1
    : 1;
  const dataAgora = agora();

  const novos = arquivos.map((arquivo, idx) => ({
    id: proximoId + idx,
    nomeOriginal: arquivo.originalname,
    arquivo: arquivo.filename,
    tipo: arquivo.mimetype,
    tamanho: arquivo.size,
    usuarioId: req.usuario.id,
    dataUpload: dataAgora,
  }));

  chamado.anexos.push(...novos);
  marcarAtualizacao(chamado);
  adicionarHistorico(
    chamado.id,
    req.usuario.id,
    chamado.status,
    chamado.status,
    `${novos.length} arquivo(s) anexado(s): ${novos.map((n) => n.nomeOriginal).join(', ')}.`
  );
  db.save();

  return res.status(201).json(montarDetalhesChamado(chamado, req.usuario));
}

function baixarAnexo(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
  if (!chamado) return;

  const anexo = (chamado.anexos || []).find((a) => a.id === paraInteiro(req.params.anexoId));
  if (!anexo) return res.status(404).json({ erro: 'Anexo não encontrado.' });

  const nomeFisico = anexo.arquivo || anexo.nomeSalvo || '';
  const caminho = path.join(PASTA_UPLOADS, path.basename(nomeFisico));
  if (!nomeFisico || !fs.existsSync(caminho)) {
    return res.status(404).json({ erro: 'O arquivo deste anexo não está mais disponível.' });
  }

  if (req.query.inline === '1') {
    if (anexo.tipo) res.setHeader('Content-Type', anexo.tipo);
    return res.sendFile(caminho);
  }

  return res.download(caminho, anexo.nomeOriginal);
}

function avaliarAtendimento(req, res) {
  const chamado = buscarChamadoAutorizado(req, res);
  if (!chamado) return;

  if (req.usuario.id !== chamado.solicitanteId && req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Apenas o solicitante pode avaliar o atendimento.' });
  }

  if (![STATUS_CHAMADO.RESOLVIDO, STATUS_CHAMADO.ENCERRADO].includes(chamado.status)) {
    return res.status(422).json({ erro: 'A avaliação só está disponível para chamados resolvidos ou encerrados.' });
  }

  const nota = paraInteiro(req.body.nota);
  const comentario = texto(req.body.comentario) || null;

  if (!nota || nota < 1 || nota > 5) {
    return res.status(400).json({ erro: 'Informe uma nota de 1 a 5 estrelas.' });
  }

  chamado.avaliacao = {
    nota,
    comentario,
    avaliadoEm: agora(),
  };
  marcarAtualizacao(chamado);
  adicionarHistorico(
    chamado.id,
    req.usuario.id,
    chamado.status,
    chamado.status,
    `Atendimento avaliado com ${nota}/5 estrela(s).`
  );
  db.save();

  return res.json(enriquecerChamado(chamado));
}

module.exports = {
  listar,
  obterPorId,
  criar,
  atualizar,
  excluir,
  assumir,
  alterarStatus,
  reabrir,
  comentar,
  adicionarAnexos,
  baixarAnexo,
  avaliarAtendimento,
};
