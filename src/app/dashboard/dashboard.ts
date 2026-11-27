import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService, UsuarioPerfil } from '../core/services/auth.service';
import { Sidebar } from '../sidebar/sidebar';
import {
  classeBadgePrioridade,
  classeBadgeStatus,
  classeSla,
  extrairIniciais,
  formatarStatusChamado,
  tempoRelativoCurto,
  textoResumoSla,
} from '../core/utils/ui.utils';

interface SlaInfo {
  prazoHoras: number;
  dataLimite: string;
  situacao: string;
  rotulo: string;
  horasRestantes: number | null;
}

interface Metricas {
  escopo: 'meus-chamados' | 'todos';
  totalChamados: number;
  prioridadeAltaCritica: number;
  chamadosAbertos: number;
  chamadosEmAndamento: number;
  chamadosEmAtendimento: number;
  chamadosAguardando: number;
  chamadosResolvidos: number;
  chamadosCancelados: number;
  chamadosSemTecnico?: number;
  slaVencidos?: number;
  slaEmAtencao?: number;
  tempoMedioResolucaoHoras?: number | null;
  mediaSatisfacao?: number | null;
  atribuidosAMim?: number;
  porCategoria: { categoriaId: number; categoriaNome: string; total: number }[];
  porStatus: { status: string; total: number }[];
  porPrioridade: { prioridade: string; total: number }[];
  recentes: {
    id: number;
    titulo: string;
    status: string;
    prioridade: string;
    categoriaNome: string;
    categoriaIcone?: string;
    tecnicoNome: string | null;
    tecnicoAvatar?: string | null;
    solicitanteNome?: string | null;
    solicitanteAvatar?: string | null;
    dataAbertura: string;
    dataAtualizacao: string;
    sla?: SlaInfo | null;
  }[];
  geradoEm: string;
}

const API_URL = '/api';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Sidebar],
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  usuario: UsuarioPerfil | null = null;
  metricas: Metricas | null = null;
  carregando = true;
  erro = '';
  periodo = '';

  readonly iniciais = extrairIniciais;
  readonly formatarStatus = formatarStatusChamado;
  readonly getStatusClass = classeBadgeStatus;
  readonly getPrioridadeClass = classeBadgePrioridade;
  readonly getSlaClass = classeSla;
  readonly getSlaTexto = textoResumoSla;
  readonly tempoRelativo = tempoRelativoCurto;

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
    this.carregarMetricas();
  }

  carregarMetricas(): void {
    this.carregando = true;
    this.erro = '';
    const params: Record<string, string> = this.periodo ? { periodo: this.periodo } : {};

    this.http.get<Metricas>(`${API_URL}/dashboard/metricas`, { params }).subscribe({
      next: (dados) => {
        this.metricas = dados;
        this.carregando = false;
      },
      error: (err) => {
        this.carregando = false;
        this.erro =
          err.status === 0
            ? 'Não foi possível conectar ao servidor. Execute: npm run server'
            : 'Erro ao carregar métricas operacionais.';
      },
    });
  }

  onPeriodo(event: Event): void {
    this.periodo = (event.target as HTMLSelectElement).value;
    this.carregarMetricas();
  }

  get primeiroNome(): string {
    return this.authService.usuarioAtual()?.nome?.split(' ')[0] ?? 'Usuário';
  }

  get subtituloPainel(): string {
    if (this.metricas?.escopo === 'meus-chamados') {
      return 'Acompanhe o andamento das suas solicitações registradas na Central de TI.';
    }
    return 'Monitoramento operacional de fila, prazos de SLA e atendimentos em tempo real.';
  }

  get aguardando(): number {
    return this.metricas?.chamadosAguardando ?? 0;
  }

  get statusLegenda() {
    const m = this.metricas;
    return [
      { nome: 'Resolvidos / Encerrados', total: m?.chamadosResolvidos ?? 0, cor: '#1d4ed8' },
      { nome: 'Em atendimento / Análise', total: m?.chamadosEmAtendimento ?? 0, cor: '#d97706' },
      { nome: 'Abertos na fila', total: m?.chamadosAbertos ?? 0, cor: '#16a34a' },
      { nome: 'Aguardando usuário', total: this.aguardando, cor: '#dc2626' },
    ];
  }

  get donutGradiente(): string {
    const total = this.metricas?.totalChamados ?? 0;
    if (!total) return '#e2e8f0';

    let acumulado = 0;
    const partes = this.statusLegenda.map((s) => {
      const inicio = acumulado;
      acumulado += (s.total / total) * 100;
      return `${s.cor} ${inicio}% ${acumulado}%`;
    });
    if (acumulado < 100) partes.push(`#cbd5e1 ${acumulado}% 100%`);
    return `conic-gradient(${partes.join(', ')})`;
  }

  get prioridades() {
    const ordem = [
      { nome: 'Baixa', cor: '#64748b' },
      { nome: 'Média', cor: '#2563eb' },
      { nome: 'Alta', cor: '#ea580c' },
      { nome: 'Crítica', cor: '#dc2626' },
    ];
    const lista = this.metricas?.porPrioridade ?? [];
    return ordem.map((o) => ({
      ...o,
      total: lista.find((p) => p.prioridade === o.nome)?.total ?? 0,
    }));
  }

  alturaBarra(total: number): number {
    const maior = Math.max(1, ...this.prioridades.map((p) => p.total));
    return Math.max(4, Math.round((total / maior) * 100));
  }

  get topCategorias() {
    return (this.metricas?.porCategoria ?? []).slice(0, 5);
  }

  larguraCategoria(total: number): number {
    const maior = Math.max(1, ...this.topCategorias.map((c) => c.total));
    return Math.max(8, Math.round((total / maior) * 100));
  }
}
