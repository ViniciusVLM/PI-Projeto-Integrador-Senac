const PERFIS = {
  CLIENTE: 'cliente',
  TECNICO: 'tecnico',
  ADMIN: 'admin',
};

const PERFIS_VALIDOS = [PERFIS.CLIENTE, PERFIS.TECNICO, PERFIS.ADMIN];

const STATUS_USUARIO = ['Ativo', 'Inativo'];
const STATUS_CATEGORIA = ['Ativa', 'Inativa'];
const STATUS_EQUIPAMENTO = ['Ativo', 'Em manutenção', 'Inativo'];

const TIPOS_EQUIPAMENTO = [
  'Desktop',
  'Notebook',
  'Monitor',
  'Impressora',
  'Roteador',
  'Switch',
  'Smartphone',
  'Outro',
];

const PRIORIDADES_VALIDAS = ['Baixa', 'Média', 'Alta', 'Crítica'];

const STATUS_CHAMADO = {
  ABERTO: 'ABERTO',
  EM_ANALISE: 'EM ANÁLISE',
  EM_ATENDIMENTO: 'EM ATENDIMENTO',
  AGUARDANDO: 'AGUARDANDO USUÁRIO',
  RESOLVIDO: 'RESOLVIDO',
  ENCERRADO: 'ENCERRADO',
  CANCELADO: 'CANCELADO',
};

const STATUS_CHAMADO_LISTA = Object.values(STATUS_CHAMADO);
const STATUS_FINALIZADOS = [STATUS_CHAMADO.ENCERRADO, STATUS_CHAMADO.CANCELADO];
const STATUS_RESOLVIDOS = [STATUS_CHAMADO.RESOLVIDO, STATUS_CHAMADO.ENCERRADO];

const TRANSICOES_VALIDAS = {
  [STATUS_CHAMADO.ABERTO]: [STATUS_CHAMADO.EM_ANALISE, STATUS_CHAMADO.CANCELADO],
  [STATUS_CHAMADO.EM_ANALISE]: [STATUS_CHAMADO.EM_ATENDIMENTO, STATUS_CHAMADO.AGUARDANDO, STATUS_CHAMADO.CANCELADO],
  [STATUS_CHAMADO.EM_ATENDIMENTO]: [STATUS_CHAMADO.AGUARDANDO, STATUS_CHAMADO.RESOLVIDO, STATUS_CHAMADO.CANCELADO],
  [STATUS_CHAMADO.AGUARDANDO]: [STATUS_CHAMADO.EM_ATENDIMENTO, STATUS_CHAMADO.CANCELADO],
  [STATUS_CHAMADO.RESOLVIDO]: [STATUS_CHAMADO.ENCERRADO],
  [STATUS_CHAMADO.ENCERRADO]: [],
  [STATUS_CHAMADO.CANCELADO]: [],
};

const TRANSICOES_DO_CLIENTE = {
  [STATUS_CHAMADO.ABERTO]: [STATUS_CHAMADO.CANCELADO],
  [STATUS_CHAMADO.EM_ANALISE]: [STATUS_CHAMADO.CANCELADO],
  [STATUS_CHAMADO.AGUARDANDO]: [STATUS_CHAMADO.EM_ATENDIMENTO, STATUS_CHAMADO.CANCELADO],
  [STATUS_CHAMADO.RESOLVIDO]: [STATUS_CHAMADO.ENCERRADO],
};

const SLA_PADRAO_POR_PRIORIDADE = {
  'Crítica': 4,
  'Alta': 8,
  'Média': 24,
  'Baixa': 48,
};

const ICONES_CATEGORIA_PADRAO = {
  'Hardware': 'ti-cpu',
  'Software': 'ti-app-window',
  'Rede': 'ti-wifi',
  'E-mail': 'ti-mail',
  'Acesso': 'ti-key',
  'Impressora': 'ti-printer',
  'Sistema': 'ti-server-2',
  'Segurança': 'ti-shield-lock',
  'Telefonia': 'ti-phone',
  'Outros': 'ti-category',
};

const CONFIGURACOES_PADRAO = {
  nomeOrganizacao: 'SecureDesk — Central de Serviços de TI',
  slaPadraoHoras: 24,
  slaPorPrioridade: { ...SLA_PADRAO_POR_PRIORIDADE },
  prioridadePadrao: 'Média',
  cadastroPublicoAtivo: true,
  notificarPorEmail: true,
  smtp: {
    ativo: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: 'SecureDesk Central de TI',
    fromEmail: '',
  },
};

module.exports = {
  PERFIS,
  PERFIS_VALIDOS,
  STATUS_USUARIO,
  STATUS_CATEGORIA,
  STATUS_EQUIPAMENTO,
  TIPOS_EQUIPAMENTO,
  PRIORIDADES_VALIDAS,
  STATUS_CHAMADO,
  STATUS_CHAMADO_LISTA,
  STATUS_FINALIZADOS,
  STATUS_RESOLVIDOS,
  TRANSICOES_VALIDAS,
  TRANSICOES_DO_CLIENTE,
  SLA_PADRAO_POR_PRIORIDADE,
  ICONES_CATEGORIA_PADRAO,
  CONFIGURACOES_PADRAO,
};
