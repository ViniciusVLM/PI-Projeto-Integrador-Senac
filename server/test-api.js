const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('=== TESTES DA API SECUREDESK ===\n');

  const health = await request('GET', '/api/health');
  console.log('1. GET /api/health:', health.status === 200 ? 'PASSOU' : 'FALHOU', health.body);

  const loginErr = await request('POST', '/api/auth/login', { email: 'inexistente@empresa.com', senha: '123' });
  console.log('2. POST /api/auth/login (invalido):', loginErr.status === 401 ? 'PASSOU' : 'FALHOU', `(${loginErr.status})`);

  const loginAdmin = await request('POST', '/api/auth/login', { email: 'carlos.lima@empresa.com', senha: '123456' });
  console.log('3. POST /api/auth/login (admin):', loginAdmin.status === 200 ? 'PASSOU' : 'FALHOU', `perfil=${loginAdmin.body?.usuario?.perfil}`);
  const adminToken = loginAdmin.body?.token;
  const adminAuth = { Authorization: `Bearer ${adminToken}` };

  const loginCli = await request('POST', '/api/auth/login', { email: 'joao.silvia@empresa.com', senha: '123456' });
  console.log('4. POST /api/auth/login (cliente):', loginCli.status === 200 ? 'PASSOU' : 'FALHOU', `perfil=${loginCli.body?.usuario?.perfil}`);
  const cliToken = loginCli.body?.token;
  const cliAuth = { Authorization: `Bearer ${cliToken}` };

  const tecnicos = await request('GET', '/api/tecnicos', null, adminAuth);
  console.log('5. GET /api/tecnicos:', tecnicos.status === 200 && Array.isArray(tecnicos.body) ? 'PASSOU' : 'FALHOU', `(${tecnicos.body.length} tecnicos)`);

  const dupUser = await request('POST', '/api/usuarios', {
    nome: 'Teste Dup',
    email: 'joao.silvia@empresa.com',
    senha: '123',
    perfil: 'cliente'
  }, adminAuth);
  console.log('6. POST /api/usuarios (email duplicado):', dupUser.status === 409 ? 'PASSOU' : 'FALHOU', `(${dupUser.status}: ${dupUser.body?.erro})`);

  const categorias = await request('GET', '/api/categorias', null, adminAuth);
  console.log('7. GET /api/categorias:', categorias.status === 200 ? 'PASSOU' : 'FALHOU', `(${categorias.body.length} categorias)`);

  const equipamentos = await request('GET', '/api/equipamentos', null, adminAuth);
  console.log('8. GET /api/equipamentos:', equipamentos.status === 200 ? 'PASSOU' : 'FALHOU', `(${equipamentos.body.length} equipamentos)`);

  const novoChamado = await request('POST', '/api/chamados', {
    titulo: 'Impressora travada',
    descricao: 'A impressora do RH travou papel.',
    categoriaId: 1,
    prioridade: 'Alta',
    equipamentoId: 1,
  }, cliAuth);
  console.log('9. POST /api/chamados (criacao):', novoChamado.status === 201 && novoChamado.body.status === 'ABERTO' ? 'PASSOU' : 'FALHOU', `id=${novoChamado.body?.id}, status=${novoChamado.body?.status}`);
  const chamadoId = novoChamado.body?.id;

  const transInvalida = await request('PATCH', `/api/chamados/${chamadoId}/status`, { novoStatus: 'RESOLVIDO' }, adminAuth);
  console.log('10. PATCH transicao invalida ABERTO -> RESOLVIDO:', transInvalida.status === 422 ? 'PASSOU' : 'FALHOU', `(${transInvalida.status}: ${transInvalida.body?.erro})`);

  const transAnalise = await request('PATCH', `/api/chamados/${chamadoId}/status`, { novoStatus: 'EM ANÁLISE' }, adminAuth);
  console.log('11. PATCH ABERTO -> EM ANÁLISE:', transAnalise.status === 200 && transAnalise.body.status === 'EM ANÁLISE' ? 'PASSOU' : 'FALHOU');

  const transSemTec = await request('PATCH', `/api/chamados/${chamadoId}/status`, { novoStatus: 'EM ATENDIMENTO' }, adminAuth);
  console.log('12. PATCH EM ANÁLISE -> EM ATENDIMENTO sem tecnico:', transSemTec.status === 400 ? 'PASSOU' : 'FALHOU', `(${transSemTec.status}: ${transSemTec.body?.erro})`);

  const transComTec = await request('PATCH', `/api/chamados/${chamadoId}/status`, { novoStatus: 'EM ATENDIMENTO', tecnicoId: 2 }, adminAuth);
  console.log('13. PATCH EM ANÁLISE -> EM ATENDIMENTO com tecnico:', transComTec.status === 200 && transComTec.body.status === 'EM ATENDIMENTO' ? 'PASSOU' : 'FALHOU', `tecnicoId=${transComTec.body?.tecnicoId}`);

  const transResolvido = await request('PATCH', `/api/chamados/${chamadoId}/status`, { novoStatus: 'RESOLVIDO' }, adminAuth);
  console.log('14. PATCH EM ATENDIMENTO -> RESOLVIDO:', transResolvido.status === 200 && transResolvido.body.status === 'RESOLVIDO' ? 'PASSOU' : 'FALHOU');

  const transEncerrado = await request('PATCH', `/api/chamados/${chamadoId}/status`, { novoStatus: 'ENCERRADO' }, adminAuth);
  console.log('15. PATCH RESOLVIDO -> ENCERRADO:', transEncerrado.status === 200 && transEncerrado.body.dataEncerramento ? 'PASSOU' : 'FALHOU', `dataEncerramento=${transEncerrado.body?.dataEncerramento}`);

  const observacao = await request('POST', `/api/chamados/${chamadoId}/observacoes`, { comentario: 'Problema solucionado com sucesso.' }, adminAuth);
  console.log('16. POST /api/chamados/:id/observacoes:', observacao.status === 201 ? 'PASSOU' : 'FALHOU', `comentario=${observacao.body?.comentario}`);

  const metricas = await request('GET', '/api/dashboard/metricas', null, adminAuth);
  console.log('17. GET /api/dashboard/metricas:', metricas.status === 200 ? 'PASSOU' : 'FALHOU');
  console.log('    - totalChamados:', metricas.body?.totalChamados);
  console.log('    - prioridadeAltaCritica:', metricas.body?.prioridadeAltaCritica);
  console.log('    - chamadosAbertos:', metricas.body?.chamadosAbertos);
  console.log('    - chamadosEmAndamento:', metricas.body?.chamadosEmAndamento);
  console.log('    - chamadosResolvidos:', metricas.body?.chamadosResolvidos);
  console.log('    - categorias agrupadas:', metricas.body?.porCategoria?.length);
  console.log('    - recentes:', metricas.body?.recentes?.length);

  console.log('\n=== TODOS OS TESTES FORAM EXECUTADOS ===');
}

runTests().catch(console.error);
