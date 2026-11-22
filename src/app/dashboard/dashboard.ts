import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService, UsuarioPerfil } from '../core/services/auth.service';
import { Sidebar } from '../sidebar/sidebar';

interface Metricas {
  totalChamados: number;
  prioridadeAltaCritica: number;
  chamadosAbertos: number;
  chamadosEmAndamento: number;
  chamadosResolvidos: number;
  chamadosCancelados: number;
  porCategoria: { categoriaId: number; categoriaNome: string; total: number }[];
  porStatus: { status: string; total: number }[];
  porPrioridade: { prioridade: string; total: number }[];
  recentes: {
    id: number;
    titulo: string;
    status: string;
    prioridade: string;
    categoriaNome: string;
    tecnicoNome: string;
    solicitanteNome?: string;
    dataAbertura: string;
  }[];
  geradoEm: string;
}

// Endereço relativo: em produção a API e a tela ficam no mesmo site;
// no npm start, o proxy.conf.json encaminha /api para a porta 3000.
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

  constructor(
    private authService: AuthService,
    private http: HttpClient,
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
            : 'Erro ao carregar métricas.';
      },
    });
  }

  onPeriodo(event: Event): void {
    this.periodo = (event.target as HTMLSelectElement).value;
    this.carregarMetricas();
  }

  get primeiroNome(): string {
    return this.usuario?.nome?.split(' ')[0] ?? 'Usuário';
  }

  // Total de chamados aguardando usuário (vem de porStatus)
  get aguardando(): number {
    return (
      this.metricas?.porStatus.find((s) => s.status.toUpperCase() === 'AGUARDANDO USUÁRIO')
        ?.total ?? 0
    );
  }

  // Legenda do gráfico de rosca
  get statusLegenda() {
    const m = this.metricas;
    return [
      { nome: 'Resolvidos', total: m?.chamadosResolvidos ?? 0, cor: '#2563eb' },
      { nome: 'Abertos', total: m?.chamadosAbertos ?? 0, cor: '#22c55e' },
      { nome: 'Em andamento', total: m?.chamadosEmAndamento ?? 0, cor: '#eab308' },
      { nome: 'Aguardando usuário', total: this.aguardando, cor: '#ef4444' },
    ];
  }

  // Monta o conic-gradient da rosca com a proporção de cada status
  get donutGradiente(): string {
    const total = this.metricas?.totalChamados ?? 0;
    if (!total) return '#e2e8f0';

    let acumulado = 0;
    const partes = this.statusLegenda.map((s) => {
      const inicio = acumulado;
      acumulado += (s.total / total) * 100;
      return `${s.cor} ${inicio}% ${acumulado}%`;
    });
    if (acumulado < 100) partes.push(`#e2e8f0 ${acumulado}% 100%`);
    return `conic-gradient(${partes.join(', ')})`;
  }

  // Barras do gráfico de prioridade, sempre na mesma ordem
  get prioridades() {
    const ordem = [
      { nome: 'Baixa', cor: '#2563eb' },
      { nome: 'Média', cor: '#eab308' },
      { nome: 'Alta', cor: '#f97316' },
      { nome: 'Crítica', cor: '#ef4444' },
    ];
    const lista = this.metricas?.porPrioridade ?? [];
    return ordem.map((o) => ({
      ...o,
      total: lista.find((p) => p.prioridade === o.nome)?.total ?? 0,
    }));
  }

  // Altura da barra (em %) proporcional ao maior valor
  alturaBarra(total: number): number {
    const maior = Math.max(1, ...this.prioridades.map((p) => p.total));
    return (total / maior) * 75;
  }

  // Tabela mostra só os 4 mais recentes
  get recentes() {
    return (this.metricas?.recentes ?? []).slice(0, 4);
  }

  formatarStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  getStatusClass(status: string): string {
    const mapa: Record<string, string> = {
      'ABERTO': 'badge-aberto',
      'EM ANÁLISE': 'badge-andamento',
      'EM ATENDIMENTO': 'badge-andamento',
      'AGUARDANDO USUÁRIO': 'badge-aguardando',
      'RESOLVIDO': 'badge-resolvido',
    };
    return mapa[status.toUpperCase()] ?? 'badge-default';
  }

  getPrioridadeClass(prioridade: string): string {
    const mapa: Record<string, string> = {
      'Baixa': 'prioridade-baixa',
      'Média': 'prioridade-media',
      'Alta': 'prioridade-alta',
      'Crítica': 'prioridade-critica',
    };
    return mapa[prioridade] ?? '';
  }

  // Ex.: "Há 5 min", "Há 2 horas", "Há 1 dia"
  tempoRelativo(data: string): string {
    const min = Math.max(0, Math.floor((Date.now() - new Date(data).getTime()) / 60000));
    if (min < 60) return `Há ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `Há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    const dias = Math.floor(horas / 24);
    return `Há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }
}