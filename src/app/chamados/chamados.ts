import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-chamados',
  imports: [RouterLink, RouterLinkActive, FormsModule],
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

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
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

  irPara(p: number): void {
    if (p >= 1 && p <= this.totalPaginas) this.pagina = p;
  }

  buscar(): void {
    this.pagina = 1;
  }

  private normalizar(v: string): string {
    return (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
    if (n.includes('andamento')) return 'status-andamento';
    if (n.includes('aguardando')) return 'status-aguardando';
    if (n.includes('analise')) return 'status-analise';
    if (n.includes('resolvid')) return 'status-resolvido';
    if (n.includes('abert')) return 'status-aberto';
    return '';
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