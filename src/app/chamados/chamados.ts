import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
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

interface Chamado {
  id: number;
  titulo: string;
  solicitanteId?: number;
  solicitanteNome?: string;
  solicitanteAvatar?: string | null;
  solicitanteDepartamento?: string | null;
  prioridade: string;
  status: string;
  categoriaId?: number;
  categoriaNome?: string;
  categoriaIcone?: string;
  equipamentoPatrimonio?: string | null;
  tecnicoId?: number | null;
  tecnicoNome?: string | null;
  tecnicoAvatar?: string | null;
  totalAnexos?: number;
  sla?: SlaInfo | null;
  dataAbertura: string;
  dataAtualizacao?: string;
}

interface CategoriaOpcao {
  id: number;
  nome: string;
}

type AbaFila = 'todos' | 'minha_fila' | 'sem_tecnico' | 'abertos' | 'aguardando' | 'sla_critico' | 'concluidos';

const API_URL = '/api';

@Component({
  selector: 'app-chamados',
  imports: [RouterLink, FormsModule, Sidebar],
  templateUrl: './chamados.html',
  styleUrl: './chamados.css',
})
export class Chamados implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  chamados: Chamado[] = [];
  categorias: CategoriaOpcao[] = [];
  busca = '';
  abaFila: AbaFila = 'todos';
  pagina = 1;
  porPagina = 10;
  carregando = true;
  assumindoId: number | null = null;
  erro = '';

  mostrarFiltros = false;
  filtroStatus = '';
  filtroPrioridade = '';
  filtroCategoriaId = '';

  readonly iniciais = extrairIniciais;
  readonly formatarStatus = formatarStatusChamado;
  readonly statusClasse = classeBadgeStatus;
  readonly prioridadeClasse = classeBadgePrioridade;
  readonly slaClasse = classeSla;
  readonly slaTexto = textoResumoSla;
  readonly tempoRelativo = tempoRelativoCurto;

  statusOpcoes = [
    'ABERTO',
    'EM ANÁLISE',
    'EM ATENDIMENTO',
    'AGUARDANDO USUÁRIO',
    'RESOLVIDO',
    'ENCERRADO',
    'CANCELADO',
  ];

  prioridadeOpcoes = ['Baixa', 'Média', 'Alta', 'Crítica'];

  ngOnInit(): void {
    try {
      const pref = JSON.parse(localStorage.getItem('securedesk_preferencias') || '{}');
      const salvo = Number(pref.itensPorPagina);
      if ([5, 10, 20].includes(salvo)) this.porPagina = salvo;
    } catch {}

    this.http.get<CategoriaOpcao[]>(`${API_URL}/categorias`).subscribe({
      next: (dados) => (this.categorias = dados),
      error: () => {},
    });
    this.carregarChamados();
  }

  get ehEquipeTi(): boolean {
    return this.authService.temPerfil('tecnico', 'admin');
  }

  get ehTecnico(): boolean {
    return this.authService.getPerfil() === 'tecnico';
  }

  get meuId(): number | null {
    return this.authService.getUsuario()?.id ?? null;
  }

  carregarChamados(): void {
    this.carregando = true;
    this.erro = '';

    const params: Record<string, string> = {};
    if (this.filtroStatus) params['status'] = this.filtroStatus;
    if (this.filtroPrioridade) params['prioridade'] = this.filtroPrioridade;
    if (this.filtroCategoriaId) params['categoriaId'] = this.filtroCategoriaId;

    this.http.get<Chamado[]>(`${API_URL}/chamados`, { params }).subscribe({
      next: (dados) => {
        this.chamados = dados;
        this.pagina = 1;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar a lista de chamados.';
        this.carregando = false;
      },
    });
  }

  selecionarAbaFila(aba: AbaFila): void {
    this.abaFila = aba;
    this.pagina = 1;
  }

  contarAba(aba: AbaFila): number {
    return this.chamados.filter((c) => this.passaNaAba(c, aba)).length;
  }

  private passaNaAba(c: Chamado, aba: AbaFila): boolean {
    const finalizado = ['ENCERRADO', 'CANCELADO', 'RESOLVIDO'].includes(c.status);
    switch (aba) {
      case 'minha_fila':
        return c.tecnicoId === this.meuId && !['ENCERRADO', 'CANCELADO'].includes(c.status);
      case 'sem_tecnico':
        return !c.tecnicoId && !finalizado;
      case 'abertos':
        return c.status === 'ABERTO';
      case 'aguardando':
        return c.status === 'AGUARDANDO USUÁRIO';
      case 'sla_critico':
        return c.sla?.situacao === 'vencido' || c.sla?.situacao === 'atencao';
      case 'concluidos':
        return ['RESOLVIDO', 'ENCERRADO'].includes(c.status);
      default:
        return true;
    }
  }

  assumirRapido(chamado: Chamado, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.ehTecnico || this.assumindoId) return;

    this.assumindoId = chamado.id;
    this.http.patch<Chamado>(`${API_URL}/chamados/${chamado.id}/assumir`, {}).subscribe({
      next: (atualizado) => {
        this.assumindoId = null;
        this.chamados = this.chamados.map((c) => (c.id === atualizado.id ? atualizado : c));
      },
      error: () => {
        this.assumindoId = null;
        this.carregarChamados();
      },
    });
  }

  alternarFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  aplicarFiltros(): void {
    this.carregarChamados();
  }

  limparFiltros(): void {
    this.filtroStatus = '';
    this.filtroPrioridade = '';
    this.filtroCategoriaId = '';
    this.abaFila = 'todos';
    this.busca = '';
    this.carregarChamados();
  }

  get temFiltrosAtivos(): boolean {
    return !!(this.filtroStatus || this.filtroPrioridade || this.filtroCategoriaId);
  }

  get filtrados(): Chamado[] {
    const termo = this.busca.trim().toLowerCase();
    return this.chamados
      .filter((c) => this.passaNaAba(c, this.abaFila))
      .filter((c) => {
        if (!termo) return true;
        return (
          c.titulo?.toLowerCase().includes(termo) ||
          c.solicitanteNome?.toLowerCase().includes(termo) ||
          c.categoriaNome?.toLowerCase().includes(termo) ||
          c.equipamentoPatrimonio?.toLowerCase().includes(termo) ||
          String(c.id).includes(termo.replace('#', ''))
        );
      });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / this.porPagina));
  }

  get paginas(): (number | string)[] {
    const total = this.totalPaginas;
    const p = this.pagina;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (p <= 3) return [1, 2, 3, '...', total];
    if (p >= total - 2) return [1, '...', total - 2, total - 1, total];
    return [1, '...', p - 1, p, p + 1, '...', total];
  }

  get paginados(): Chamado[] {
    const inicio = (this.pagina - 1) * this.porPagina;
    return this.filtrados.slice(inicio, inicio + this.porPagina);
  }

  get inicio(): number {
    return this.filtrados.length ? (this.pagina - 1) * this.porPagina + 1 : 0;
  }

  get fim(): number {
    return Math.min(this.pagina * this.porPagina, this.filtrados.length);
  }

  irPara(p: number | string): void {
    if (typeof p === 'number' && p >= 1 && p <= this.totalPaginas) this.pagina = p;
  }

  buscar(): void {
    this.pagina = 1;
  }
}
