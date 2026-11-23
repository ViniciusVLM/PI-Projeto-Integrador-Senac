import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
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

type ModalAcaoTipo = 'aguardando' | 'reabrir' | 'cancelar' | null;

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
  private authService = inject(AuthService);

  @ViewChild('menuAcoesRef') menuAcoesRef?: ElementRef<HTMLElement>;

  chamado: ChamadoDetalhe | null = null;
  carregando = true;
  erro = '';
  aba: 'descricao' | 'historico' | 'anexos' = 'descricao';

  novoComentario = '';
  enviandoComentario = false;
  erroComentario = '';

  menuAcoesAberto = false;
  executandoAcao = false;
  mensagemSucesso = '';
  mensagemErroAcao = '';

  modalTipo: ModalAcaoTipo = null;
  modalTexto = '';
  modalErro = '';

  private readonly rotulosTransicao: Record<string, string> = {
    'EM ANÁLISE': 'Mover para Em análise',
    'EM ATENDIMENTO': 'Iniciar atendimento',
    'AGUARDANDO USUÁRIO': 'Aguardar resposta do usuário',
    'RESOLVIDO': 'Marcar como resolvido',
    'ENCERRADO': 'Encerrar chamado',
    'CANCELADO': 'Cancelar chamado',
  };

  ngOnInit(): void {
    this.carregarChamado();
  }

  @HostListener('document:click', ['$event'])
  aoClicarDocumento(event: MouseEvent): void {
    if (!this.menuAcoesAberto) return;
    const alvo = event.target as Node | null;
    if (alvo && this.menuAcoesRef?.nativeElement.contains(alvo)) return;
    this.menuAcoesAberto = false;
  }

  @HostListener('document:keydown.escape')
  aoPressionarEsc(): void {
    if (this.modalTipo) {
      this.fecharModalAcao();
      return;
    }
    this.menuAcoesAberto = false;
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

  get podeAssumir(): boolean {
    const c = this.chamado;
    if (!c || this.authService.getPerfil() !== 'tecnico') return false;
    if (!['ABERTO', 'EM ANÁLISE'].includes(c.status)) return false;
    const usuarioId = this.authService.getUsuario()?.id;
    return !c.tecnicoId || c.tecnicoId !== usuarioId;
  }

  get transicoesDisponiveis(): string[] {
    return this.chamado?.transicoesPermitidas ?? [];
  }

  get podeReabrir(): boolean {
    const c = this.chamado;
    if (!c) return false;
    return c.status === 'RESOLVIDO' || c.status === 'ENCERRADO';
  }

  get temAcoesDisponiveis(): boolean {
    return this.podeAssumir || this.transicoesDisponiveis.length > 0 || this.podeReabrir;
  }

  alternarMenuAcoes(): void {
    if (!this.temAcoesDisponiveis || this.executandoAcao) return;
    this.menuAcoesAberto = !this.menuAcoesAberto;
  }

  rotuloTransicao(status: string): string {
    return this.rotulosTransicao[status] || `Mover para ${this.formatarStatus(status)}`;
  }

  assumirChamado(): void {
    if (!this.chamado || this.executandoAcao) return;
    this.menuAcoesAberto = false;
    this.executandoAcao = true;
    this.mensagemSucesso = '';
    this.mensagemErroAcao = '';

    this.http.patch(`${API_URL}/chamados/${this.chamado.id}/assumir`, {}).subscribe({
      next: () => {
        this.executandoAcao = false;
        this.mensagemSucesso = 'Chamado assumido com sucesso.';
        this.carregarChamado(false);
      },
      error: (err) => {
        this.executandoAcao = false;
        this.mensagemErroAcao = err.error?.erro || 'Não foi possível assumir o chamado.';
      },
    });
  }

  acionarTransicao(novoStatus: string): void {
    this.menuAcoesAberto = false;
    if (novoStatus === 'AGUARDANDO USUÁRIO') {
      this.modalTipo = 'aguardando';
      this.modalTexto = '';
      this.modalErro = '';
      return;
    }
    if (novoStatus === 'CANCELADO') {
      this.modalTipo = 'cancelar';
      this.modalTexto = '';
      this.modalErro = '';
      return;
    }
    this.executarMudancaStatus(novoStatus);
  }

  abrirModalReabrir(): void {
    this.menuAcoesAberto = false;
    this.modalTipo = 'reabrir';
    this.modalTexto = '';
    this.modalErro = '';
  }

  fecharModalAcao(): void {
    if (this.executandoAcao) return;
    this.modalTipo = null;
    this.modalTexto = '';
    this.modalErro = '';
  }

  confirmarModalAcao(): void {
    if (!this.chamado || this.executandoAcao) return;
    const texto = this.modalTexto.trim();

    if (this.modalTipo === 'aguardando') {
      if (!texto) {
        this.modalErro = 'Informe o que o usuário precisa responder.';
        return;
      }
      this.executarMudancaStatus('AGUARDANDO USUÁRIO', texto);
      return;
    }

    if (this.modalTipo === 'cancelar') {
      this.executarMudancaStatus('CANCELADO', texto || undefined);
      return;
    }

    if (this.modalTipo === 'reabrir') {
      if (!texto) {
        this.modalErro = 'Informe o motivo da reabertura.';
        return;
      }
      this.executarReabertura(texto);
    }
  }

  private executarMudancaStatus(novoStatus: string, observacao?: string): void {
    if (!this.chamado) return;
    this.executandoAcao = true;
    this.mensagemSucesso = '';
    this.mensagemErroAcao = '';
    this.modalErro = '';

    const corpo: { novoStatus: string; observacao?: string } = { novoStatus };
    if (observacao) corpo.observacao = observacao;

    this.http.patch(`${API_URL}/chamados/${this.chamado.id}/status`, corpo).subscribe({
      next: () => {
        this.executandoAcao = false;
        this.modalTipo = null;
        this.modalTexto = '';
        this.mensagemSucesso = `Status atualizado para ${this.formatarStatus(novoStatus)}.`;
        this.carregarChamado(false);
      },
      error: (err) => {
        this.executandoAcao = false;
        const msg = err.error?.erro || 'Não foi possível alterar o status.';
        if (this.modalTipo) {
          this.modalErro = msg;
        } else {
          this.mensagemErroAcao = msg;
        }
      },
    });
  }

  private executarReabertura(motivo: string): void {
    if (!this.chamado) return;
    this.executandoAcao = true;
    this.mensagemSucesso = '';
    this.mensagemErroAcao = '';
    this.modalErro = '';

    this.http.patch(`${API_URL}/chamados/${this.chamado.id}/reabrir`, { motivo }).subscribe({
      next: () => {
        this.executandoAcao = false;
        this.modalTipo = null;
        this.modalTexto = '';
        this.mensagemSucesso = 'Chamado reaberto com sucesso.';
        this.carregarChamado(false);
      },
      error: (err) => {
        this.executandoAcao = false;
        this.modalErro = err.error?.erro || 'Não foi possível reabrir o chamado.';
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
