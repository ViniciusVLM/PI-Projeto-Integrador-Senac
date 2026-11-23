import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../sidebar/sidebar';

export interface HistoricoItem {
  id: number;
  statusAnterior: string | null;
  statusNovo: string;
  observacao: string | null;
  usuarioNome: string;
  dataEvento: string;
}

export interface ComentarioItem {
  id: number;
  usuarioId: number;
  usuarioNome: string;
  comentario: string;
  dataCriacao: string;
}

export interface AnexoItem {
  id: number;
  nomeOriginal: string;
  tipo: string;
  tamanho: number;
  url: string;
}

interface ChamadoDetalhe {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  categoriaNome: string;
  equipamentoNome?: string;
  equipamentoPatrimonio?: string;
  solicitanteId?: number;
  solicitanteNome?: string;
  solicitanteSetor?: string;
  tecnicoId?: number | null;
  tecnicoNome?: string;
  dataAbertura: string;
  dataAtualizacao?: string;
  historico?: HistoricoItem[];
  comentarios?: ComentarioItem[];
  anexos?: AnexoItem[];
  transicoesPermitidas?: string[];
}

interface Evento {
  autor: string;
  acao: string;
  data?: string;
  atual: boolean;
}

// Endereço relativo: em produção a API e a tela ficam no mesmo site;
// no npm start, o proxy.conf.json encaminha /api para a porta 3000.
const API_URL = '/api';

@Component({
  selector: 'app-detalheschamados',
  imports: [RouterLink, DatePipe, NgTemplateOutlet, FormsModule, Sidebar],
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

  novoComentario = '';
  enviandoComentario = false;
  erroComentario = '';

  ngOnInit(): void {
    this.carregarChamado();
  }

  carregarChamado(mostrarLoading = true): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (mostrarLoading) {
      this.carregando = true;
    }
    this.erro = '';

    this.http.get<ChamadoDetalhe>(`${API_URL}/chamados/${id}`).subscribe({
      next: (c) => {
        this.chamado = c;
        this.carregando = false;
      },
      error: (err) => {
        this.erro = err.error?.erro || 'Chamado não encontrado.';
        this.carregando = false;
      },
    });
  }

  enviarComentario(): void {
    const texto = this.novoComentario.trim();
    if (!texto || this.enviandoComentario || !this.chamado) return;

    this.enviandoComentario = true;
    this.erroComentario = '';

    this.http
      .post(`${API_URL}/chamados/${this.chamado.id}/comentarios`, { comentario: texto })
      .subscribe({
        next: () => {
          this.enviandoComentario = false;
          this.novoComentario = '';
          this.carregarChamado(false);
        },
        error: (err) => {
          this.enviandoComentario = false;
          this.erroComentario = err.error?.erro || 'Não foi possível enviar o comentário.';
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
