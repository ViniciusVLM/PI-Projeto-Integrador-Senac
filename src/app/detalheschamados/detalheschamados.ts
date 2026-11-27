import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { Sidebar } from '../sidebar/sidebar';
import {
  classeBadgePrioridade,
  classeBadgeStatus,
  classeSla,
  extrairIniciais,
  formatarStatusChamado,
  registrarLightDismissFallback,
  textoResumoSla,
} from '../core/utils/ui.utils';

export interface HistoricoItem {
  id: number;
  statusAnterior: string | null;
  statusNovo: string;
  observacao: string | null;
  usuarioNome: string;
  usuarioAvatar?: string | null;
  dataEvento: string;
}

export interface ComentarioItem {
  id: number;
  usuarioId: number;
  usuarioNome: string;
  usuarioAvatar?: string | null;
  usuarioPerfil?: string | null;
  comentario: string;
  interno?: boolean;
  dataCriacao: string;
}

export interface AnexoItem {
  id: number;
  nomeOriginal: string;
  tipo: string;
  tamanho: number;
  url: string;
  ehImagem?: boolean;
}

interface SlaInfo {
  prazoHoras: number;
  dataLimite: string;
  situacao: string;
  rotulo: string;
  horasRestantes: number | null;
}

interface AvaliacaoInfo {
  nota: number;
  comentario?: string | null;
  avaliadoEm: string;
}

interface ChamadoDetalhe {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  categoriaId: number;
  categoriaNome: string;
  categoriaIcone?: string;
  equipamentoId?: number | null;
  equipamentoNome?: string | null;
  equipamentoPatrimonio?: string | null;
  equipamentoTipo?: string | null;
  solicitanteId?: number;
  solicitanteNome?: string;
  solicitanteAvatar?: string | null;
  solicitanteDepartamento?: string | null;
  solicitanteEmail?: string | null;
  tecnicoId?: number | null;
  tecnicoNome?: string | null;
  tecnicoAvatar?: string | null;
  tecnicoDepartamento?: string | null;
  dataAbertura: string;
  dataAtualizacao?: string;
  sla?: SlaInfo | null;
  avaliacao?: AvaliacaoInfo | null;
  historico?: HistoricoItem[];
  comentarios?: ComentarioItem[];
  anexos?: AnexoItem[];
  transicoesPermitidas?: string[];
}

interface TecnicoOpcao {
  id: number;
  nome: string;
  departamento?: string | null;
}

interface CategoriaOpcao {
  id: number;
  nome: string;
}

interface Evento {
  autor: string;
  avatar?: string | null;
  acao: string;
  observacao?: string | null;
  data?: string;
  atual: boolean;
}

type ModalAcaoTipo = 'aguardando' | 'reabrir' | 'cancelar' | null;

const API_URL = '/api';

@Component({
  selector: 'app-detalheschamados',
  imports: [RouterLink, DatePipe, FormsModule, Sidebar],
  templateUrl: './detalheschamados.html',
  styleUrl: './detalheschamados.css',
})
export class DetalhesChamados implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  @ViewChild('menuAcoesRef') menuAcoesRef?: ElementRef<HTMLElement>;
  @ViewChild('dialogAcaoRef') dialogAcaoRef?: ElementRef<HTMLDialogElement>;
  @ViewChild('dialogPreviewRef') dialogPreviewRef?: ElementRef<HTMLDialogElement>;

  chamado: ChamadoDetalhe | null = null;
  tecnicos: TecnicoOpcao[] = [];
  categorias: CategoriaOpcao[] = [];

  carregando = true;
  erro = '';
  aba: 'conversa' | 'anexos' | 'historico' = 'conversa';

  novoComentario = '';
  notaInterna = false;
  enviandoComentario = false;
  erroComentario = '';

  enviandoAnexo = false;
  previewImagemUrl: string | null = null;
  previewImagemNome = '';

  // CSAT Avaliação
  notaSelecionada = 5;
  comentarioAvaliacao = '';
  enviandoAvaliacao = false;

  menuAcoesAberto = false;
  executandoAcao = false;
  mensagemSucesso = '';
  mensagemErroAcao = '';

  modalTipo: ModalAcaoTipo = null;
  modalTexto = '';
  modalErro = '';

  readonly iniciais = extrairIniciais;
  readonly formatarStatus = formatarStatusChamado;
  readonly statusClasse = classeBadgeStatus;
  readonly prioridadeClasse = classeBadgePrioridade;
  readonly slaClasse = classeSla;
  readonly slaTexto = textoResumoSla;
  readonly estrelas = [1, 2, 3, 4, 5];

  private readonly rotulosTransicao: Record<string, string> = {
    'EM ANÁLISE': 'Mover para Em análise',
    'EM ATENDIMENTO': 'Iniciar atendimento',
    'AGUARDANDO USUÁRIO': 'Solicitar retorno do usuário',
    'RESOLVIDO': 'Marcar como resolvido',
    'ENCERRADO': 'Confirmar solução e encerrar',
    'CANCELADO': 'Cancelar chamado',
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe(() => {
      this.carregarChamado();
    });

    if (this.ehEquipeTi) {
      this.http.get<TecnicoOpcao[]>(`${API_URL}/usuarios/tecnicos`).subscribe({
        next: (t) => (this.tecnicos = t),
        error: () => {},
      });
      this.http.get<CategoriaOpcao[]>(`${API_URL}/categorias?status=Ativa`).subscribe({
        next: (c) => (this.categorias = c),
        error: () => {},
      });
    }
  }

  ngOnDestroy(): void {
    if (this.previewImagemUrl) {
      URL.revokeObjectURL(this.previewImagemUrl);
    }
  }

  @HostListener('document:click', ['$event'])
  aoClicarDocumento(event: MouseEvent): void {
    if (!this.menuAcoesAberto) return;
    const alvo = event.target as Node | null;
    if (alvo && this.menuAcoesRef?.nativeElement.contains(alvo)) return;
    this.menuAcoesAberto = false;
  }

  get perfilAtual(): string | null {
    return this.authService.getPerfil();
  }

  get ehAdmin(): boolean {
    return this.perfilAtual === 'admin';
  }

  get ehEquipeTi(): boolean {
    return this.authService.temPerfil('tecnico', 'admin');
  }

  get finalizado(): boolean {
    return !!this.chamado && ['ENCERRADO', 'CANCELADO'].includes(this.chamado.status);
  }

  get podeAvaliar(): boolean {
    const c = this.chamado;
    const meuId = this.authService.getUsuario()?.id;
    if (!c || c.avaliacao) return false;
    return c.solicitanteId === meuId && ['RESOLVIDO', 'ENCERRADO'].includes(c.status);
  }

  get imagemEquipamento(): string {
    const mapa: Record<string, string> = {
      'Notebook': '/img/equipamentos/notebook.jpg',
      'Desktop': '/img/equipamentos/desktop.jpg',
      'Monitor': '/img/equipamentos/monitor.jpg',
      'Impressora': '/img/equipamentos/impressora.jpg',
      'Roteador': '/img/equipamentos/rede.jpg',
      'Switch': '/img/equipamentos/rede.jpg',
      'Smartphone': '/img/equipamentos/smartphone.jpg',
    };
    return mapa[this.chamado?.equipamentoTipo || ''] || '/img/equipamentos/desktop.jpg';
  }

  carregarChamado(mostrarLoading = true): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (mostrarLoading) this.carregando = true;
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

  atualizarCampoRapido(campo: 'prioridade' | 'categoriaId' | 'tecnicoId', valor: string): void {
    if (!this.chamado || this.finalizado) return;
    const body: Record<string, any> = {};
    if (campo === 'prioridade') body['prioridade'] = valor;
    if (campo === 'categoriaId') body['categoriaId'] = Number(valor);
    if (campo === 'tecnicoId') body['tecnicoId'] = valor ? Number(valor) : null;

    this.http.put(`${API_URL}/chamados/${this.chamado.id}`, body).subscribe({
      next: () => {
        this.mensagemSucesso = 'Classificação do chamado atualizada.';
        this.carregarChamado(false);
      },
      error: (err) => {
        this.mensagemErroAcao = err.error?.erro || 'Não foi possível atualizar o chamado.';
      },
    });
  }

  enviarComentario(): void {
    const texto = this.novoComentario.trim();
    if (!texto || this.enviandoComentario || !this.chamado) return;

    this.enviandoComentario = true;
    this.erroComentario = '';

    this.http
      .post(`${API_URL}/chamados/${this.chamado.id}/comentarios`, {
        comentario: texto,
        interno: this.ehEquipeTi ? this.notaInterna : false,
      })
      .subscribe({
        next: () => {
          this.enviandoComentario = false;
          this.novoComentario = '';
          this.notaInterna = false;
          this.carregarChamado(false);
        },
        error: (err) => {
          this.enviandoComentario = false;
          this.erroComentario = err.error?.erro || 'Não foi possível publicar a mensagem.';
        },
      });
  }

  enviarNovoAnexo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivos = input.files ? Array.from(input.files) : [];
    if (!arquivos.length || !this.chamado) return;

    const form = new FormData();
    arquivos.forEach((f) => form.append('anexos', f));
    input.value = '';
    this.enviandoAnexo = true;

    this.http.post(`${API_URL}/chamados/${this.chamado.id}/anexos`, form).subscribe({
      next: () => {
        this.enviandoAnexo = false;
        this.mensagemSucesso = 'Anexo(s) adicionado(s) ao chamado.';
        this.aba = 'anexos';
        this.carregarChamado(false);
      },
      error: (err) => {
        this.enviandoAnexo = false;
        this.mensagemErroAcao = err.error?.erro || 'Falha ao enviar anexo.';
      },
    });
  }

  baixarAnexo(anexo: AnexoItem): void {
    this.mensagemErroAcao = '';
    this.http.get(anexo.url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = anexo.nomeOriginal || 'anexo';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.mensagemErroAcao = err.error?.erro || 'Não foi possível baixar o anexo.';
      },
    });
  }

  visualizarImagem(anexo: AnexoItem): void {
    this.http.get(`${anexo.url}?inline=1`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        if (this.previewImagemUrl) URL.revokeObjectURL(this.previewImagemUrl);
        this.previewImagemUrl = URL.createObjectURL(blob);
        this.previewImagemNome = anexo.nomeOriginal;
        setTimeout(() => {
          const dlg = this.dialogPreviewRef?.nativeElement;
          if (dlg && !dlg.open) {
            registrarLightDismissFallback(dlg);
            dlg.showModal();
          }
        });
      },
      error: () => {
        this.mensagemErroAcao = 'Não foi possível pré-visualizar a imagem.';
      },
    });
  }

  fecharPreview(): void {
    this.dialogPreviewRef?.nativeElement.close();
  }

  salvarAvaliacao(): void {
    if (!this.chamado || this.enviandoAvaliacao) return;
    this.enviandoAvaliacao = true;

    this.http
      .patch(`${API_URL}/chamados/${this.chamado.id}/avaliar`, {
        nota: this.notaSelecionada,
        comentario: this.comentarioAvaliacao.trim() || null,
      })
      .subscribe({
        next: () => {
          this.enviandoAvaliacao = false;
          this.mensagemSucesso = 'Obrigado por avaliar o atendimento!';
          this.carregarChamado(false);
        },
        error: (err) => {
          this.enviandoAvaliacao = false;
          this.mensagemErroAcao = err.error?.erro || 'Não foi possível registrar a avaliação.';
        },
      });
  }

  excluirChamado(): void {
    if (!this.chamado || !this.ehAdmin) return;
    if (!confirm(`Confirma a exclusão permanente do chamado #${this.chamado.id}?`)) return;

    this.http.delete(`${API_URL}/chamados/${this.chamado.id}`).subscribe({
      next: () => this.router.navigate(['/chamados']),
      error: (err) => {
        this.mensagemErroAcao = err.error?.erro || 'Não foi possível excluir o chamado.';
      },
    });
  }

  formatarTamanho(bytes?: number): string {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.max(0.1, Math.round((bytes / 1024) * 10) / 10)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  get podeAssumir(): boolean {
    const c = this.chamado;
    if (!c || this.perfilAtual !== 'tecnico') return false;
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
    return this.podeAssumir || this.transicoesDisponiveis.length > 0 || this.podeReabrir || this.ehAdmin;
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
        this.mensagemSucesso = 'Chamado assumido para sua fila.';
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
      this.abrirDialogAcao('aguardando');
      return;
    }
    if (novoStatus === 'CANCELADO') {
      this.abrirDialogAcao('cancelar');
      return;
    }
    this.executarMudancaStatus(novoStatus);
  }

  abrirModalReabrir(): void {
    this.menuAcoesAberto = false;
    this.abrirDialogAcao('reabrir');
  }

  private abrirDialogAcao(tipo: ModalAcaoTipo): void {
    this.modalTipo = tipo;
    this.modalTexto = '';
    this.modalErro = '';
    setTimeout(() => {
      const dlg = this.dialogAcaoRef?.nativeElement;
      if (dlg && !dlg.open) {
        registrarLightDismissFallback(dlg);
        dlg.showModal();
      }
    });
  }

  fecharModalAcao(): void {
    if (this.executandoAcao) return;
    this.dialogAcaoRef?.nativeElement.close();
    this.modalTipo = null;
    this.modalTexto = '';
    this.modalErro = '';
  }

  aoFecharDialogNativo(): void {
    this.modalTipo = null;
    this.modalErro = '';
  }

  confirmarModalAcao(): void {
    if (!this.chamado || this.executandoAcao) return;
    const texto = this.modalTexto.trim();

    if (this.modalTipo === 'aguardando') {
      if (!texto) {
        this.modalErro = 'Informe o que o solicitante precisa responder ou validar.';
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
        this.fecharModalAcao();
        this.mensagemSucesso = `Status atualizado para ${this.formatarStatus(novoStatus)}.`;
        this.carregarChamado(false);
      },
      error: (err) => {
        this.executandoAcao = false;
        const msg = err.error?.erro || 'Não foi possível alterar o status.';
        if (this.modalTipo) this.modalErro = msg;
        else this.mensagemErroAcao = msg;
      },
    });
  }

  private executarReabertura(motivo: string): void {
    if (!this.chamado) return;
    this.executandoAcao = true;
    this.modalErro = '';

    this.http.patch(`${API_URL}/chamados/${this.chamado.id}/reabrir`, { motivo }).subscribe({
      next: () => {
        this.executandoAcao = false;
        this.fecharModalAcao();
        this.mensagemSucesso = 'Chamado reaberto com sucesso.';
        this.carregarChamado(false);
      },
      error: (err) => {
        this.executandoAcao = false;
        this.modalErro = err.error?.erro || 'Não foi possível reabrir o chamado.';
      },
    });
  }

  rotuloPerfil(perfil?: string | null): string {
    if (perfil === 'admin') return 'Admin';
    if (perfil === 'tecnico') return 'Técnico';
    return 'Solicitante';
  }

  get eventos(): Evento[] {
    const c = this.chamado;
    if (!c) return [];

    const itensHistorico = (c.historico ?? []).map((h) => ({
      autor: h.usuarioNome || 'Sistema',
      avatar: h.usuarioAvatar || null,
      acao: h.statusAnterior
        ? h.statusAnterior === h.statusNovo
          ? 'registrou atualização'
          : `alterou de ${this.formatarStatus(h.statusAnterior)} para ${this.formatarStatus(h.statusNovo)}`
        : 'abriu o chamado',
      observacao: h.observacao || null,
      data: h.dataEvento,
    }));

    return itensHistorico
      .sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime())
      .map((item, idx) => ({ ...item, atual: idx === 0 }));
  }
}
