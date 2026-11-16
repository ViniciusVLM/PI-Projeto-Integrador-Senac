import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';

interface ChamadoDetalhe {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  categoriaNome: string;
  equipamentoNome?: string;
  equipamentoPatrimonio?: string;
  solicitanteNome?: string;
  solicitanteSetor?: string;
  tecnicoNome?: string;
  dataAbertura: string;
  dataAtualizacao?: string;
  anexos?: { nome: string }[];
}

interface Evento {
  autor: string;
  acao: string;
  data?: string;
  atual: boolean;
}

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-detalheschamados',
  imports: [RouterLink, DatePipe, NgTemplateOutlet, Sidebar],
  templateUrl: './detalheschamados.html',
  styleUrl: './detalheschamados.css',
})
export class DetalhesChamados implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  chamado: ChamadoDetalhe | null = null;
  carregando = true;
  erro = '';
  aba: 'descricao' | 'historico' | 'anexos' = 'descricao';

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

  // Linha do tempo montada a partir dos dados do chamado (mais recente primeiro)
  get eventos(): Evento[] {
    const c = this.chamado;
    if (!c) return [];

    const lista: Evento[] = [];

    if (c.dataAtualizacao && c.dataAtualizacao !== c.dataAbertura) {
      lista.push({
        autor: c.tecnicoNome || 'Sistema',
        acao: `alterou o status para ${this.formatarStatus(c.status)}`,
        data: c.dataAtualizacao,
        atual: true,
      });
    }

    if (c.tecnicoNome) {
      lista.push({
        autor: 'Sistema',
        acao: `atribuiu este chamado para ${c.tecnicoNome}`,
        atual: lista.length === 0,
      });
    }

    lista.push({
      autor: c.solicitanteNome || 'Usuário',
      acao: 'abriu este chamado',
      data: c.dataAbertura,
      atual: lista.length === 0,
    });

    return lista;
  }

  private normalizar(v: string): string {
    return (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // "EM ATENDIMENTO" -> "Em atendimento"
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
    if (n.includes('encerrad')) return 'status-encerrado';
    if (n.includes('cancel')) return 'status-cancelado';
    if (n.includes('abert')) return 'status-aberto';
    return '';
  }
}