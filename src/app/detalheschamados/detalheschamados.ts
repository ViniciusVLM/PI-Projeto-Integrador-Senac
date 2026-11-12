import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';

interface ChamadoDetalhe {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  categoriaNome: string;
  equipamentoNome?: string;
  solicitanteNome?: string;
  tecnicoNome?: string;
  dataAbertura: string;
  dataAtualizacao?: string;
}

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-detalheschamados',
  imports: [RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './detalheschamados.html',
  styleUrl: './detalheschamados.css',
})
export class DetalhesChamados implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  chamado: ChamadoDetalhe | null = null;
  carregando = true;
  erro = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<ChamadoDetalhe>(`${API_URL}/chamados/${id}`).subscribe({
      next: (c) => {
        this.chamado = c;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Chamado não encontrado.';
        this.carregando = false;
      },
    });
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
    if (n.includes('andamento') || n.includes('atendimento')) return 'status-andamento';
    if (n.includes('aguardando')) return 'status-aguardando';
    if (n.includes('analise')) return 'status-analise';
    if (n.includes('resolvid')) return 'status-resolvido';
    if (n.includes('encerrad')) return 'status-encerrado';
    if (n.includes('cancel')) return 'status-cancelado';
    if (n.includes('abert')) return 'status-aberto';
    return '';
  }
}