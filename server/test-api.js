// Testes automatizados da API do SecureDesk.
// Uso: npm run test:api
//
// Os testes sobem a API em uma porta própria usando uma CÓPIA do banco
// (server/db.seed.json), então o server/db.json não é alterado.

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORTA = 3100 + Math.floor(Math.random() * 500);
const BASE = `http://localhost:${PORTA}`;
const PASTA_TESTE = fs.mkdtempSync(path.join(os.tmpdir(), 'securedesk-teste-'));
const DB_TESTE = path.join(PASTA_TESTE, 'db.json');
const UPLOADS_TESTE = path.join(PASTA_TESTE, 'uploads');

fs.copyFileSync(path.join(__dirname, 'db.seed.json'), DB_TESTE);

let passou = 0;
let falhou = 0;
const falhas = [];

function verificar(descricao, condicao, detalhe = '') {
  if (condicao) {
    passou++;
    console.log(`  ✔ ${descricao}`);
  } else {
    falhou++;
    falhas.push(descricao);
    console.log(`  ✘ ${descricao}${detalhe ? ` → ${detalhe}` : ''}`);
  }
}

async function api(metodo, rota, { corpo, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (form) {
    body = form;
  } else if (corpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
  }

  const resposta = await fetch(BASE + rota, { method: metodo, headers, body });
  const tipo = resposta.headers.get('content-type') || '';
  const dados = tipo.includes('application/json') ? await resposta.json() : await resposta.text();
  return { status: resposta.status, body: dados, headers: resposta.headers };
}

async function login(email, senha = '123456') {
  const r = await api('POST', '/api/auth/login', { corpo: { email, senha } });
  return r.body.token;
}

function iniciarServidor() {
  return new Promise((resolve, reject) => {
    const processo = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
      env: { ...process.env, PORT: PORTA, DB_FILE: DB_TESTE, UPLOADS_DIR: UPLOADS_TESTE },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let saida = '';
    const tempo = setTimeout(() => reject(new Error(`A API não iniciou:\n${saida}`)), 10000);

    processo.stdout.on('data', (parte) => {
      saida += parte;
      if (saida.includes('rodando')) {
        clearTimeout(tempo);
        resolve({ processo, log: () => saida });
      }
    });
    processo.stderr.on('data', (parte) => {
      saida += parte;
    });
  });
}

async function executar() {
  const { processo, log } = await iniciarServidor();
  console.log(`=== TESTES DA API SECUREDESK (porta ${PORTA}) ===\n`);

  try {
    // ---------------------------------------------------------------
    console.log('Autenticação');
    const health = await api('GET', '/api/health');
    verificar('API responde em /api/health', health.status === 200);

    const loginErrado = await api('POST', '/api/auth/login', { corpo: { email: 'joao.silvia@empresa.com', senha: 'errada' } });
    verificar('login com senha errada retorna 401', loginErrado.status === 401);

    const loginCliente = await api('POST', '/api/auth/login', { corpo: { email: 'JOAO.SILVIA@empresa.com', senha: '123456' } });
    verificar('login do cliente funciona (e-mail sem diferenciar maiúsculas)', loginCliente.status === 200 && !!loginCliente.body.token);
    verificar('login não devolve a senha', loginCliente.body.usuario && loginCliente.body.usuario.senha === undefined);

    const cliente = loginCliente.body.token;
    const tecnico = await login('fernanda.souza@empresa.com');
    const tecnico2 = await login('paulo.nunes@empresa.com');
    const admin = await login('carlos.lima@empresa.com');
    verificar('login do técnico e do admin funcionam', !!tecnico && !!admin && !!tecnico2);

    const semToken = await api('GET', '/api/chamados');
    verificar('rota protegida sem token retorna 401', semToken.status === 401);

    const tokenFalso = await api('GET', '/api/chamados', { token: 'token-invalido' });
    verificar('token inválido retorna 401', tokenFalso.status === 401);

    const jsonQuebrado = await api('POST', '/api/auth/login', { corpo: '{"email":' });
    verificar('JSON malformado retorna 400', jsonQuebrado.status === 400);

    const banco = JSON.parse(fs.readFileSync(DB_TESTE, 'utf-8'));
    verificar('senhas ficam salvas com hash (bcrypt)', banco.usuarios.every((u) => u.senha.startsWith('$2')));

    // ---------------------------------------------------------------
    console.log('\nCadastro e perfil');
    const registro = await api('POST', '/api/auth/registro', {
      corpo: { nome: 'Beatriz Teste', email: 'beatriz.teste@empresa.com', telefone: '(11) 90000-1111', senha: 'segredo1', confirmarSenha: 'segredo1' },
    });
    verificar('cadastro público cria conta (201)', registro.status === 201);
    verificar('conta criada pelo cadastro é sempre cliente', registro.body.perfil === 'cliente');

    const registroComoAdmin = await api('POST', '/api/auth/registro', {
      corpo: { nome: 'Invasor', email: 'invasor@empresa.com', senha: 'segredo1', perfil: 'admin' },
    });
    verificar('cadastro ignora tentativa de virar admin', registroComoAdmin.body.perfil === 'cliente');

    const registroDuplicado = await api('POST', '/api/auth/registro', { corpo: { nome: 'Outro', email: 'beatriz.teste@empresa.com', senha: 'segredo1' } });
    verificar('cadastro com e-mail repetido retorna 409', registroDuplicado.status === 409);

    const senhasDiferentes = await api('POST', '/api/auth/registro', { corpo: { nome: 'Teste', email: 'x@empresa.com', senha: 'segredo1', confirmarSenha: 'outra' } });
    verificar('cadastro com senhas diferentes retorna 400', senhasDiferentes.status === 400);

    const senhaCurta = await api('POST', '/api/auth/registro', { corpo: { nome: 'Teste', email: 'y@empresa.com', senha: '123' } });
    verificar('cadastro com senha curta retorna 400', senhaCurta.status === 400);

    const emailRuim = await api('POST', '/api/auth/registro', { corpo: { nome: 'Teste', email: 'nao-e-email', senha: 'segredo1' } });
    verificar('cadastro com e-mail inválido retorna 400', emailRuim.status === 400);

    let beatriz = await login('beatriz.teste@empresa.com', 'segredo1');
    verificar('nova conta consegue fazer login', !!beatriz);

    const me = await api('GET', '/api/auth/me', { token: beatriz });
    verificar('GET /api/auth/me devolve o usuário logado', me.status === 200 && me.body.email === 'beatriz.teste@empresa.com');

    const editarPerfil = await api('PUT', '/api/auth/me', { token: beatriz, corpo: { nome: 'Beatriz Souza', telefone: '(11) 98888-7777' } });
    verificar('usuário edita o próprio nome e telefone', editarPerfil.status === 200 && editarPerfil.body.nome === 'Beatriz Souza');

    const trocaErrada = await api('PUT', '/api/auth/me/senha', { token: beatriz, corpo: { senhaAtual: 'errada', novaSenha: 'nova123' } });
    verificar('troca de senha com senha atual errada retorna 400', trocaErrada.status === 400);

    const troca = await api('PUT', '/api/auth/me/senha', { token: beatriz, corpo: { senhaAtual: 'segredo1', novaSenha: 'nova123', confirmarSenha: 'nova123' } });
    verificar('troca de senha funciona', troca.status === 200);
    verificar('nova senha funciona no login', !!(await login('beatriz.teste@empresa.com', 'nova123')));

    // ---------------------------------------------------------------
    console.log('\nRecuperação de senha');
    const esqueciInexistente = await api('POST', '/api/auth/esqueci-senha', { corpo: { email: 'ninguem@empresa.com' } });
    verificar('esqueci senha não revela se o e-mail existe', esqueciInexistente.status === 200);

    const esqueci = await api('POST', '/api/auth/esqueci-senha', { corpo: { email: 'beatriz.teste@empresa.com' } });
    await new Promise((r) => setTimeout(r, 200));
    const codigo = (log().match(/beatriz\.teste@empresa\.com: (\d{6})/) || [])[1];
    verificar('esqueci senha gera código de 6 dígitos (no terminal)', esqueci.status === 200 && !!codigo);

    const codigoErrado = await api('POST', '/api/auth/redefinir-senha', { corpo: { email: 'beatriz.teste@empresa.com', codigo: '000000', novaSenha: 'outra123' } });
    verificar('código errado é recusado', codigoErrado.status === 400);

    const redefinir = await api('POST', '/api/auth/redefinir-senha', { corpo: { email: 'beatriz.teste@empresa.com', codigo, novaSenha: 'outra123', confirmarSenha: 'outra123' } });
    verificar('redefinição com o código correto funciona', redefinir.status === 200);

    const reuso = await api('POST', '/api/auth/redefinir-senha', { corpo: { email: 'beatriz.teste@empresa.com', codigo, novaSenha: 'mais123' } });
    verificar('o mesmo código não pode ser usado de novo', reuso.status === 400);
    const sessaoAntiga = await api('GET', '/api/auth/me', { token: beatriz });
    verificar('redefinir a senha encerra as sessões antigas', sessaoAntiga.status === 401);
    beatriz = await login('beatriz.teste@empresa.com', 'outra123');
    verificar('senha redefinida funciona no login', !!beatriz);

    // ---------------------------------------------------------------
    console.log('\nUsuários (permissões)');
    const listaCliente = await api('GET', '/api/usuarios', { token: cliente });
    verificar('cliente só vê o próprio usuário na lista', listaCliente.body.length === 1);

    const outroUsuario = await api('GET', '/api/usuarios/3', { token: cliente });
    verificar('cliente não vê dados de outro usuário (403)', outroUsuario.status === 403);

    const listaAdmin = await api('GET', '/api/usuarios?perfil=tecnico', { token: admin });
    verificar('admin lista usuários com filtro de perfil', listaAdmin.status === 200 && listaAdmin.body.every((u) => u.perfil === 'tecnico'));
    verificar('lista de usuários não expõe senha', listaAdmin.body.every((u) => u.senha === undefined));

    const criarComoTecnico = await api('POST', '/api/usuarios', { token: tecnico, corpo: { nome: 'X', email: 'x1@empresa.com', senha: '123456', perfil: 'admin' } });
    verificar('técnico não cria usuários (403)', criarComoTecnico.status === 403);

    const novoUsuario = await api('POST', '/api/usuarios', { token: admin, corpo: { nome: 'Lucas Prado', email: 'lucas.prado@empresa.com', senha: '123456', perfil: 'tecnico', telefone: '(11) 97777-0000' } });
    verificar('admin cria usuário técnico', novoUsuario.status === 201 && novoUsuario.body.perfil === 'tecnico');

    const editarUsuario = await api('PUT', `/api/usuarios/${novoUsuario.body.id}`, { token: admin, corpo: { perfil: 'cliente' } });
    verificar('admin edita o perfil de um usuário', editarUsuario.status === 200 && editarUsuario.body.perfil === 'cliente');

    const autoRebaixar = await api('PUT', '/api/usuarios/3', { token: admin, corpo: { perfil: 'cliente' } });
    verificar('admin não consegue tirar o próprio acesso de admin', autoRebaixar.status === 400);

    const lucas = await login('lucas.prado@empresa.com');
    const inativar = await api('DELETE', `/api/usuarios/${novoUsuario.body.id}`, { token: admin });
    verificar('admin inativa usuário', inativar.status === 200);
    const sessaoInativa = await api('GET', '/api/chamados', { token: lucas });
    verificar('usuário inativado perde a sessão', sessaoInativa.status === 401);

    // ---------------------------------------------------------------
    console.log('\nCategorias e equipamentos');
    const categorias = await api('GET', '/api/categorias', { token: cliente });
    verificar('qualquer usuário logado lista categorias', categorias.status === 200 && categorias.body.length >= 9);

    const criarCatCliente = await api('POST', '/api/categorias', { token: cliente, corpo: { nome: 'Nova' } });
    verificar('cliente não cria categoria (403)', criarCatCliente.status === 403);

    const novaCategoria = await api('POST', '/api/categorias', { token: admin, corpo: { nome: 'Telefonia', descricao: 'Ramais e celulares' } });
    verificar('admin cria categoria', novaCategoria.status === 201);

    const catDuplicada = await api('POST', '/api/categorias', { token: admin, corpo: { nome: 'telefonia' } });
    verificar('categoria com nome repetido retorna 409', catDuplicada.status === 409);

    const removerEmUso = await api('DELETE', '/api/categorias/1', { token: admin });
    const catHardware = await api('GET', '/api/categorias/1', { token: admin });
    verificar('categoria em uso é inativada em vez de apagada', removerEmUso.status === 200 && catHardware.body.status === 'Inativa');
    await api('PUT', '/api/categorias/1', { token: admin, corpo: { status: 'Ativa' } });

    const equipCliente = await api('GET', '/api/equipamentos', { token: cliente });
    verificar('cliente só vê os próprios equipamentos', equipCliente.status === 200 && equipCliente.body.every((e) => e.usuarioId === 1));

    const equipAdmin = await api('GET', '/api/equipamentos', { token: admin });
    verificar('admin vê todos os equipamentos', equipAdmin.body.length > equipCliente.body.length);
    verificar('equipamentos têm marca e modelo', equipAdmin.body.every((e) => 'marca' in e && 'modelo' in e));

    const criarEqCliente = await api('POST', '/api/equipamentos', { token: cliente, corpo: { tipo: 'Notebook', marca: 'X', modelo: 'Y', patrimonio: 'PAT-1' } });
    verificar('cliente não cadastra equipamento (403)', criarEqCliente.status === 403);

    const criarEqTecnico = await api('POST', '/api/equipamentos', { token: tecnico, corpo: { tipo: 'Notebook', marca: 'X', modelo: 'Y', patrimonio: 'PAT-1' } });
    verificar('técnico não cadastra equipamento (403)', criarEqTecnico.status === 403);

    const novoEq = await api('POST', '/api/equipamentos', { token: admin, corpo: { tipo: 'Notebook', marca: 'Apple', modelo: 'MacBook Air', patrimonio: 'pat-90001', usuarioId: '5' } });
    verificar('admin cadastra equipamento (nome montado com marca e modelo)', novoEq.status === 201 && novoEq.body.nome === 'Apple MacBook Air');
    verificar('patrimônio é salvo em maiúsculas e usuarioId vira número', novoEq.body.patrimonio === 'PAT-90001' && novoEq.body.usuarioId === 5);

    const eqDuplicado = await api('POST', '/api/equipamentos', { token: admin, corpo: { tipo: 'Monitor', marca: 'A', modelo: 'B', patrimonio: 'PAT-90001' } });
    verificar('patrimônio repetido retorna 409', eqDuplicado.status === 409);

    const tipoInvalido = await api('POST', '/api/equipamentos', { token: admin, corpo: { tipo: 'Geladeira', marca: 'A', modelo: 'B', patrimonio: 'PAT-90002' } });
    verificar('tipo de equipamento inválido retorna 400', tipoInvalido.status === 400);

    // ---------------------------------------------------------------
    console.log('\nChamados');
    const chamadosCliente = await api('GET', '/api/chamados', { token: cliente });
    verificar('cliente vê só os próprios chamados', chamadosCliente.body.every((c) => c.solicitanteId === 1));

    const chamadosTecnico = await api('GET', '/api/chamados', { token: tecnico });
    verificar('técnico vê todos os chamados', chamadosTecnico.body.length > chamadosCliente.body.length);
    verificar('lista traz solicitanteNome, tecnicoNome e dataAtualizacao', chamadosTecnico.body.every((c) => 'solicitanteNome' in c && 'tecnicoNome' in c && c.dataAtualizacao));

    const filtroAlta = await api('GET', '/api/chamados?prioridade=Alta', { token: tecnico });
    verificar('filtro por prioridade funciona', filtroAlta.body.length > 0 && filtroAlta.body.every((c) => c.prioridade === 'Alta'));

    const busca = await api('GET', `/api/chamados?busca=${encodeURIComponent('impressora')}`, { token: tecnico });
    verificar('busca por texto funciona', busca.body.length > 0 && busca.body.every((c) => c.titulo.toLowerCase().includes('impressora') || (c.solicitanteNome || '').toLowerCase().includes('impressora')));

    const chamadoAlheio = chamadosTecnico.body.find((c) => c.solicitanteId !== 1);
    const verAlheio = await api('GET', `/api/chamados/${chamadoAlheio.id}`, { token: cliente });
    verificar('cliente não abre chamado de outra pessoa (403)', verAlheio.status === 403);

    const semCampos = await api('POST', '/api/chamados', { token: cliente, corpo: { titulo: 'Oi' } });
    verificar('abrir chamado sem campos obrigatórios retorna 400', semCampos.status === 400);

    const prioridadeRuim = await api('POST', '/api/chamados', { token: cliente, corpo: { titulo: 'Teste de prioridade', descricao: 'Descrição longa o bastante.', categoriaId: 1, prioridade: 'Urgente' } });
    verificar('prioridade inválida retorna 400', prioridadeRuim.status === 400);

    // multipart com anexo, igual ao formulário do front
    const form = new FormData();
    form.append('titulo', 'Mouse sem fio parou de funcionar');
    form.append('descricao', 'O mouse sem fio não responde mesmo após trocar as pilhas.');
    form.append('categoriaId', '1');
    form.append('prioridade', 'Média');
    form.append('equipamentoId', '1');
    form.append('anexos', new Blob(['log de teste do mouse'], { type: 'text/plain' }), 'log-mouse.txt');
    const criado = await api('POST', '/api/chamados', { token: cliente, form });
    verificar('cliente abre chamado pelo formulário com anexo (multipart)', criado.status === 201 && criado.body.status === 'ABERTO', JSON.stringify(criado.body));
    verificar('chamado criado registra o anexo', criado.body.totalAnexos === 1);
    const idNovo = criado.body.id;

    const formRuim = new FormData();
    formRuim.append('titulo', 'Arquivo não permitido');
    formRuim.append('descricao', 'Tentando enviar um executável como anexo.');
    formRuim.append('categoriaId', '1');
    formRuim.append('anexos', new Blob(['MZ'], { type: 'application/octet-stream' }), 'virus.exe');
    const anexoRuim = await api('POST', '/api/chamados', { token: cliente, form: formRuim });
    verificar('anexo .exe é recusado (400)', anexoRuim.status === 400);

    const detalhe = await api('GET', `/api/chamados/${idNovo}`, { token: cliente });
    verificar('detalhe traz histórico, anexos e transições permitidas', detalhe.status === 200 && detalhe.body.historico.length === 1 && detalhe.body.anexos.length === 1 && Array.isArray(detalhe.body.transicoesPermitidas));
    verificar('detalhe traz categoriaNome e equipamentoNome', detalhe.body.categoriaNome === 'Hardware' && !!detalhe.body.equipamentoNome);
    verificar('cliente só pode cancelar um chamado ABERTO', JSON.stringify(detalhe.body.transicoesPermitidas) === JSON.stringify(['CANCELADO']));

    const download = await api('GET', detalhe.body.anexos[0].url, { token: cliente });
    verificar('download do anexo funciona', download.status === 200 && String(download.body).includes('log de teste'));

    const downloadAlheio = await api('GET', detalhe.body.anexos[0].url, { token: beatriz });
    verificar('outro cliente não baixa o anexo (403)', downloadAlheio.status === 403);

    const editarCliente = await api('PUT', `/api/chamados/${idNovo}`, { token: cliente, corpo: { descricao: 'O mouse sem fio não responde nem com pilhas novas e cabo USB.' } });
    verificar('cliente edita o próprio chamado enquanto está ABERTO', editarCliente.status === 200);

    const tecnicoEditaTitulo = await api('PUT', `/api/chamados/${idNovo}`, { token: tecnico, corpo: { titulo: 'Outro título qualquer' } });
    verificar('técnico não altera título do chamado (403)', tecnicoEditaTitulo.status === 403);

    const tecnicoPrioridade = await api('PUT', `/api/chamados/${idNovo}`, { token: tecnico, corpo: { prioridade: 'Alta' } });
    verificar('técnico altera a prioridade', tecnicoPrioridade.status === 200 && tecnicoPrioridade.body.prioridade === 'Alta');

    const clienteMudaStatus = await api('PATCH', `/api/chamados/${idNovo}/status`, { token: cliente, corpo: { novoStatus: 'EM ANÁLISE' } });
    verificar('cliente não move chamado para EM ANÁLISE (403)', clienteMudaStatus.status === 403);

    const clienteAssume = await api('PATCH', `/api/chamados/${idNovo}/assumir`, { token: cliente });
    verificar('cliente não assume chamado (403)', clienteAssume.status === 403);

    const assumir = await api('PATCH', `/api/chamados/${idNovo}/assumir`, { token: tecnico });
    verificar('técnico assume o chamado (vai para EM ANÁLISE)', assumir.status === 200 && assumir.body.status === 'EM ANÁLISE' && assumir.body.tecnicoNome === 'Fernanda Souza');

    const assumirDeNovo = await api('PATCH', `/api/chamados/${idNovo}/assumir`, { token: tecnico2 });
    verificar('outro técnico não assume chamado já atribuído (409)', assumirDeNovo.status === 409);

    const clienteEditaDepois = await api('PUT', `/api/chamados/${idNovo}`, { token: cliente, corpo: { titulo: 'Novo título do chamado' } });
    verificar('cliente não edita depois que o atendimento começou (422)', clienteEditaDepois.status === 422);

    const pularEtapa = await api('PATCH', `/api/chamados/${idNovo}/status`, { token: tecnico, corpo: { novoStatus: 'ENCERRADO' } });
    verificar('transição inválida retorna 422', pularEtapa.status === 422);

    const atender = await api('PATCH', `/api/chamados/${idNovo}/status`, { token: tecnico, corpo: { novoStatus: 'EM ATENDIMENTO' } });
    verificar('técnico inicia o atendimento', atender.status === 200 && atender.body.status === 'EM ATENDIMENTO');

    const aguardarSemObs = await api('PATCH', `/api/chamados/${idNovo}/status`, { token: tecnico, corpo: { novoStatus: 'AGUARDANDO USUÁRIO' } });
    verificar('aguardar usuário exige observação (400)', aguardarSemObs.status === 400);

    const aguardar = await api('PATCH', `/api/chamados/${idNovo}/status`, { token: tecnico, corpo: { novoStatus: 'AGUARDANDO USUÁRIO', observacao: 'O mouse funciona em outro computador?' } });
    verificar('técnico coloca o chamado aguardando o usuário', aguardar.status === 200);

    const clienteResponde = await api('POST', `/api/chamados/${idNovo}/comentarios`, { token: cliente, corpo: { comentario: 'Testei em outro computador e também não funciona.' } });
    verificar('cliente comenta no próprio chamado', clienteResponde.status === 201);

    const comentarAlheio = await api('POST', `/api/chamados/${idNovo}/observacoes`, { token: beatriz, corpo: { comentario: 'intrometido' } });
    verificar('outro cliente não comenta no chamado (403)', comentarAlheio.status === 403);

    const voltar = await api('PATCH', `/api/chamados/${idNovo}/status`, { token: cliente, corpo: { novoStatus: 'EM ATENDIMENTO' } });
    verificar('cliente devolve o chamado ao atendimento depois de responder', voltar.status === 200 && voltar.body.status === 'EM ATENDIMENTO');

    const resolver = await api('PATCH', `/api/chamados/${idNovo}/status`, { token: tecnico, corpo: { novoStatus: 'RESOLVIDO', observacao: 'Receptor USB trocado.' } });
    verificar('técnico resolve o chamado', resolver.status === 200 && resolver.body.status === 'RESOLVIDO');

    const reabrirSemMotivo = await api('PATCH', `/api/chamados/${idNovo}/reabrir`, { token: cliente, corpo: {} });
    verificar('reabrir sem motivo retorna 400', reabrirSemMotivo.status === 400);

    const reabrir = await api('PATCH', `/api/chamados/${idNovo}/reabrir`, { token: cliente, corpo: { motivo: 'O problema voltou depois de uma hora.' } });
    verificar('cliente reabre o chamado resolvido (volta para EM ATENDIMENTO)', reabrir.status === 200 && reabrir.body.status === 'EM ATENDIMENTO');

    await api('PATCH', `/api/chamados/${idNovo}/status`, { token: tecnico, corpo: { novoStatus: 'RESOLVIDO', observacao: 'Mouse substituído por um novo.' } });
    const encerrar = await api('PATCH', `/api/chamados/${idNovo}/status`, { token: cliente, corpo: { novoStatus: 'ENCERRADO', observacao: 'Funcionando.' } });
    verificar('cliente confirma a solução e encerra', encerrar.status === 200 && encerrar.body.status === 'ENCERRADO' && !!encerrar.body.dataEncerramento);

    const editarEncerrado = await api('PUT', `/api/chamados/${idNovo}`, { token: admin, corpo: { prioridade: 'Baixa' } });
    verificar('chamado encerrado não pode ser editado (422)', editarEncerrado.status === 422);

    const historicoFinal = await api('GET', `/api/chamados/${idNovo}`, { token: admin });
    verificar('histórico registra cada etapa com o nome de quem fez', historicoFinal.body.historico.length >= 9 && historicoFinal.body.historico.every((h) => h.usuarioNome));

    // cancelamento pelo cliente
    const paraCancelar = await api('POST', '/api/chamados', { token: cliente, corpo: { titulo: 'Chamado aberto por engano', descricao: 'Abri este chamado sem querer.', categoriaId: 9, prioridade: 'Baixa' } });
    const cancelar = await api('PATCH', `/api/chamados/${paraCancelar.body.id}/status`, { token: cliente, corpo: { novoStatus: 'CANCELADO', observacao: 'Aberto por engano.' } });
    verificar('cliente cancela o próprio chamado aberto', cancelar.status === 200 && cancelar.body.status === 'CANCELADO');

    const excluirTecnico = await api('DELETE', `/api/chamados/${paraCancelar.body.id}`, { token: tecnico });
    verificar('técnico não exclui chamado (403)', excluirTecnico.status === 403);

    const excluirAdmin = await api('DELETE', `/api/chamados/${paraCancelar.body.id}`, { token: admin });
    const depoisDeExcluir = await api('GET', `/api/chamados/${paraCancelar.body.id}`, { token: admin });
    verificar('admin exclui chamado', excluirAdmin.status === 200 && depoisDeExcluir.status === 404);

    // admin atribui técnico
    const paraAtribuir = await api('POST', '/api/chamados', { token: cliente, corpo: { titulo: 'Impressora sem conexão Wi-Fi', descricao: 'A impressora não aparece mais na rede sem fio.', categoriaId: 6, prioridade: 'Média' } });
    const atribuir = await api('PATCH', `/api/chamados/${paraAtribuir.body.id}/assumir`, { token: admin, corpo: { tecnicoId: 4 } });
    verificar('admin atribui o chamado a um técnico', atribuir.status === 200 && atribuir.body.tecnicoId === 4);

    // ---------------------------------------------------------------
    console.log('\nDashboard e relatórios');
    const dashCliente = await api('GET', '/api/dashboard/metricas', { token: cliente });
    const totalCliente = (await api('GET', '/api/chamados', { token: cliente })).body.length;
    verificar('dashboard do cliente conta só os chamados dele', dashCliente.status === 200 && dashCliente.body.totalChamados === totalCliente && dashCliente.body.escopo === 'meus-chamados');

    const dashTecnico = await api('GET', '/api/dashboard/metricas', { token: tecnico });
    verificar('dashboard do técnico conta todos os chamados', dashTecnico.body.totalChamados > dashCliente.body.totalChamados);
    verificar('dashboard traz aguardando usuário e atribuídos ao técnico', typeof dashTecnico.body.chamadosAguardando === 'number' && typeof dashTecnico.body.atribuidosAMim === 'number');
    verificar('chamados recentes trazem o solicitante', dashTecnico.body.recentes.length === 5 && dashTecnico.body.recentes.every((r) => r.solicitanteNome));
    const somaStatus = dashTecnico.body.porStatus.reduce((s, x) => s + x.total, 0);
    verificar('soma por status bate com o total', somaStatus === dashTecnico.body.totalChamados);

    const dash7 = await api('GET', '/api/dashboard/metricas?periodo=7', { token: tecnico });
    verificar('filtro de período reduz o total', dash7.status === 200 && dash7.body.totalChamados < dashTecnico.body.totalChamados);

    const periodoRuim = await api('GET', '/api/dashboard/metricas?periodo=13', { token: tecnico });
    verificar('período inválido retorna 400', periodoRuim.status === 400);

    const relCliente = await api('GET', '/api/relatorios', { token: cliente });
    verificar('cliente não acessa relatórios (403)', relCliente.status === 403);

    const rel = await api('GET', '/api/relatorios?meses=6', { token: admin });
    verificar('relatório traz totais, taxa e tempo médio', rel.status === 200 && rel.body.totalChamados > 0 && typeof rel.body.taxaResolucao === 'number' && rel.body.tempoMedioResolucaoHoras > 0);
    verificar('relatório traz 6 meses no gráfico por mês', rel.body.porMes.length === 6);
    verificar('soma por mês bate com o total do relatório', rel.body.porMes.reduce((s, m) => s + m.total, 0) === rel.body.totalChamados);
    verificar('relatório traz desempenho por técnico', rel.body.porTecnico.some((t) => t.tecnicoNome === 'Fernanda Souza'));

    const relFiltro = await api('GET', '/api/relatorios?meses=12&tecnicoId=2', { token: admin });
    verificar('filtro por técnico no relatório', relFiltro.body.porTecnico.length === 1 && relFiltro.body.porTecnico[0].tecnicoId === 2);

    const csv = await api('GET', '/api/relatorios/exportar?meses=12', { token: tecnico });
    verificar('exportação em CSV funciona', csv.status === 200 && (csv.headers.get('content-type') || '').includes('text/csv') && String(csv.body).includes('Título;Categoria'));

    // ---------------------------------------------------------------
    console.log('\nSessão');
    const logout = await api('POST', '/api/auth/logout', { token: cliente });
    const depoisLogout = await api('GET', '/api/chamados', { token: cliente });
    verificar('logout invalida o token', logout.status === 200 && depoisLogout.status === 401);

    const rotaInexistente = await api('GET', '/api/nao-existe');
    verificar('rota inexistente retorna 404', rotaInexistente.status === 404);
  } finally {
    processo.kill();
    fs.rmSync(PASTA_TESTE, { recursive: true, force: true });
  }

  console.log(`\n=== RESULTADO: ${passou} passaram, ${falhou} falharam ===`);
  if (falhou) {
    console.log('Falhas:\n- ' + falhas.join('\n- '));
    process.exitCode = 1;
  }
}

executar().catch((erro) => {
  console.error('Erro ao executar os testes:', erro.message);
  process.exitCode = 1;
});
