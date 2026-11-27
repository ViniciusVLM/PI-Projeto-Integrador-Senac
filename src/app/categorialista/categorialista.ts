import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { Sidebar } from '../sidebar/sidebar';
import { registrarLightDismissFallback } from '../core/utils/ui.utils';

interface CategoriaApi {
  id: number;
  nome: string;
  descricao: string;
  icone?: string;
  slaHoras?: number;
  totalChamados?: number;
  chamadosAtivos?: number;
  status: 'Ativa' | 'Inativa';
}

const API_URL = '/api';

@Component({
  selector: 'app-categorialista',
  standalone: true,
  imports: [FormsModule, Sidebar],
  templateUrl: './categorialista.html',
  styleUrl: './categorialista.css',
})
export class Categorialista implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  @ViewChild('dialogCatRef') dialogCatRef?: ElementRef<HTMLDialogElement>;

  categorias = signal<CategoriaApi[]>([]);
  busca = signal('');

  editandoId: number | null = null;
  salvando = false;
  erroModal = '';
  feedbackSucesso = '';

  formNome = '';
  formDescricao = '';
  formIcone = 'ti-cpu';
  formSlaHoras = 24;
  formStatus: 'Ativa' | 'Inativa' = 'Ativa';

  readonly iconesDisponiveis = [
    { valor: 'ti-cpu', nome: 'Hardware / Componentes' },
    { valor: 'ti-app-window', nome: 'Software / Aplicativos' },
    { valor: 'ti-wifi', nome: 'Rede / Conectividade' },
    { valor: 'ti-mail', nome: 'E-mail / Colaboração' },
    { valor: 'ti-key', nome: 'Acessos / Credenciais' },
    { valor: 'ti-printer', nome: 'Impressão / Scanners' },
    { valor: 'ti-server-2', nome: 'Sistemas / ERP' },
    { valor: 'ti-shield-lock', nome: 'Segurança da Informação' },
    { valor: 'ti-phone', nome: 'Telefonia / Ramais' },
    { valor: 'ti-category', nome: 'Geral / Outros' },
  ];

  get ehAdmin(): boolean {
    return this.authService.temPerfil('admin');
  }

  ngOnInit(): void {
    this.carregarCategorias();
  }

  carregarCategorias(): void {
    this.http.get<CategoriaApi[]>(`${API_URL}/categorias`).subscribe({
      next: (lista) => this.categorias.set(lista),
      error: () => {},
    });
  }

  filtradas = computed(() => {
    const t = this.busca().toLowerCase().trim();
    if (!t) return this.categorias();
    return this.categorias().filter((c) =>
      `${c.nome} ${c.descricao}`.toLowerCase().includes(t)
    );
  });

  onBusca(event: Event): void {
    this.busca.set((event.target as HTMLInputElement).value);
  }

  abrirModalNova(): void {
    this.editandoId = null;
    this.formNome = '';
    this.formDescricao = '';
    this.formIcone = 'ti-cpu';
    this.formSlaHoras = 24;
    this.formStatus = 'Ativa';
    this.erroModal = '';
    this.abrirDialog();
  }

  abrirModalEditar(c: CategoriaApi): void {
    this.editandoId = c.id;
    this.formNome = c.nome;
    this.formDescricao = c.descricao;
    this.formIcone = c.icone || 'ti-tag';
    this.formSlaHoras = c.slaHoras || 24;
    this.formStatus = c.status;
    this.erroModal = '';
    this.abrirDialog();
  }

  private abrirDialog(): void {
    const dlg = this.dialogCatRef?.nativeElement;
    if (dlg && !dlg.open) {
      registrarLightDismissFallback(dlg);
      dlg.showModal();
    }
  }

  fecharModal(): void {
    this.dialogCatRef?.nativeElement.close();
    this.erroModal = '';
  }

  alternarStatus(c: CategoriaApi): void {
    if (!this.ehAdmin) return;
    const novoStatus = c.status === 'Ativa' ? 'Inativa' : 'Ativa';
    this.http.put(`${API_URL}/categorias/${c.id}`, { status: novoStatus }).subscribe({
      next: () => {
        this.feedbackSucesso = `Categoria "${c.nome}" marcada como ${novoStatus.toLowerCase()}.`;
        this.carregarCategorias();
      },
      error: () => {},
    });
  }

  salvarCategoria(): void {
    this.erroModal = '';
    if (!this.formNome.trim()) {
      this.erroModal = 'Informe o nome da categoria.';
      return;
    }

    this.salvando = true;
    const payload = {
      nome: this.formNome.trim(),
      descricao: this.formDescricao.trim(),
      icone: this.formIcone,
      slaHoras: this.formSlaHoras,
      status: this.formStatus,
    };

    const req$ = this.editandoId
      ? this.http.put<CategoriaApi>(`${API_URL}/categorias/${this.editandoId}`, payload)
      : this.http.post<CategoriaApi>(`${API_URL}/categorias`, payload);

    req$.subscribe({
      next: () => {
        this.salvando = false;
        this.feedbackSucesso = this.editandoId
          ? 'Categoria atualizada com sucesso.'
          : 'Nova categoria criada com sucesso.';
        this.fecharModal();
        this.carregarCategorias();
      },
      error: (err) => {
        this.salvando = false;
        this.erroModal = err.error?.erro ?? 'Erro ao salvar categoria.';
      },
    });
  }
}
