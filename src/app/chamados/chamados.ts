import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../sidebar/sidebar';

interface Chamado {
  id: number;
  titulo: string;
  solicitanteNome?: string;
  prioridade: string;
  status: string;
  tecnicoNome?: string;
  dataAbertura: string;
  dataAtualizacao?: string;
}

// Endereço relativo: em produção a API e a tela ficam no mesmo site;
// no npm start, o proxy.conf.json encaminha /api para a porta 3000.
const API_URL = '/api';

@Component({
  selector: 'app-chamados',
  imports: [RouterLink, FormsModule, Sidebar],
  templateUrl: './chamados.html',
  styleUrl: './chamados.css',
})
export class Chamados implements OnInit {
  private http = inject(HttpClient);

  chamados: Chamado[] = [];
  busca = '';
  pagina = 1;
  porPagina = 5;
  carregando = true;
  erro = '';

  ngOnInit(): void {
    this.http.get<Chamado[]>(`${API_URL}/chamados`).subscribe({
      next: (dados) => {
        this.chamados = dados;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar os chamados.';
        this.carregando = false;
      },
    });
  }

  // Lista filtrada pela busca (título, solicitante ou ID)
  get filtrados(): Chamado[] {
    const termo = this.busca.trim().toLowerCase();
    if (!termo) return this.chamados;
    return this.chamados.filter(
      (c) =>
        c.titulo?.toLowerCase().includes(termo) ||
        c.solicitanteNome?.toLowerCase().includes(termo) ||
        String(c.id).includes(termo)
    );
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / this.porPagina));
  }

  // Botões da paginação com reticências: 1 2 3 ... 15
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

  // Ao buscar, volta para a primeira página
  buscar(): void {
    this.pagina = 1;
  }

  private normalizar(v: string): string {
    return (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // "EM ANÁLISE" -> "Em análise"
  formatarStatus(v: string): string {
    const t = (v || '').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  prioridadeClasse(v: string): string {
    const n = this.normalizar(v);
    if (n.includes('crit')) return 'critica';
    if (n.includes('alta')) return 'alta';
    if (n.includes('media')) return 'media';
    if (n.includes('baixa')) return 'baixa';
    return '';
  }

  statusClasse(v: string): string {
    const n = this.normalizar(v);
    if (n.includes('andamento') || n.includes('atendimento')) return 'status-andamento';
    if (n.includes('aguardando')) return 'status-aguardando';
    if (n.includes('analise')) return 'status-analise';
    if (n.includes('resolvid')) return 'status-resolvido';
    if (n.includes('abert')) return 'status-aberto';
    return 'status-encerrado';
  }

  tempoRelativo(data?: string): string {
    if (!data) return '—';
    const min = Math.floor((Date.now() - new Date(data).getTime()) / 60000);
    if (min < 1) return 'Agora';
    if (min < 60) return `Há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Há ${h} ${h === 1 ? 'hora' : 'horas'}`;
    const d = Math.floor(h / 24);
    return `Há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  }
}