import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { Sidebar } from '../sidebar/sidebar';
import { extrairIniciais, registrarLightDismissFallback } from '../core/utils/ui.utils';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  departamento?: string | null;
  cargo?: string | null;
  avatarUrl?: string | null;
  perfilCodigo: 'cliente' | 'tecnico' | 'admin';
  perfilRotulo: string;
  status: 'Ativo' | 'Inativo';
  ativo: boolean;
  totalChamados: number;
  totalEquipamentos: number;
}

interface UsuarioApi {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  departamento?: string | null;
  cargo?: string | null;
  avatarUrl?: string | null;
  perfil: 'cliente' | 'tecnico' | 'admin';
  status: 'Ativo' | 'Inativo';
  totalChamados?: number;
  totalEquipamentos?: number;
}

type FiltroPerfil = 'todos' | 'admin' | 'tecnico' | 'cliente' | 'inativos';

const API_URL = '/api';

@Component({
  selector: 'app-usuarioslista',
  standalone: true,
  imports: [FormsModule, Sidebar],
  templateUrl: './usuarioslista.html',
  styleUrl: './usuarioslista.css',
})
export class Usuarioslista implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  @ViewChild('dialogUsuarioRef') dialogUsuarioRef?: ElementRef<HTMLDialogElement>;

  usuarios = signal<Usuario[]>([]);
  busca = signal('');
  abaFiltro = signal<FiltroPerfil>('todos');

  editandoId: number | null = null;
  salvando = false;
  erroModal = '';
  feedbackSucesso = '';

  formNome = '';
  formEmail = '';
  formTelefone = '';
  formDepartamento = '';
  formCargo = '';
  formPerfil: 'cliente' | 'tecnico' | 'admin' = 'cliente';
  formStatus: 'Ativo' | 'Inativo' = 'Ativo';
  formSenha = '';
  arquivoFotoSelecionado: File | null = null;
  previewFotoUrl: string | null = null;

  readonly iniciais = extrairIniciais;

  private mapaPerfil: Record<string, string> = {
    admin: 'Administrador',
    tecnico: 'Técnico de TI',
    cliente: 'Solicitante',
  };

  get ehAdmin(): boolean {
    return this.authService.temPerfil('admin');
  }

  get meuId(): number | null {
    return this.authService.getUsuario()?.id ?? null;
  }

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  carregarUsuarios(): void {
    this.http.get<UsuarioApi[]>(`${API_URL}/usuarios`).subscribe({
      next: (lista) => {
        this.usuarios.set(
          lista.map((u) => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            telefone: u.telefone || null,
            departamento: u.departamento || null,
            cargo: u.cargo || null,
            avatarUrl: u.avatarUrl || null,
            perfilCodigo: u.perfil,
            perfilRotulo: this.mapaPerfil[u.perfil] ?? u.perfil,
            status: u.status,
            ativo: u.status === 'Ativo',
            totalChamados: u.totalChamados ?? 0,
            totalEquipamentos: u.totalEquipamentos ?? 0,
          }))
        );
      },
      error: () => {},
    });
  }

  contarAba(aba: FiltroPerfil): number {
    return this.usuarios().filter((u) => this.passaAba(u, aba)).length;
  }

  private passaAba(u: Usuario, aba: FiltroPerfil): boolean {
    if (aba === 'inativos') return !u.ativo;
    if (aba === 'todos') return true;
    return u.perfilCodigo === aba && u.ativo;
  }

  filtrados = computed(() => {
    const termo = this.busca().toLowerCase().trim();
    const aba = this.abaFiltro();
    return this.usuarios()
      .filter((u) => this.passaAba(u, aba))
      .filter((u) =>
        `${u.nome} ${u.email} ${u.perfilRotulo} ${u.departamento || ''} ${u.cargo || ''}`
          .toLowerCase()
          .includes(termo)
      );
  });

  onBusca(event: Event): void {
    this.busca.set((event.target as HTMLInputElement).value);
  }

  iconePerfil(codigo: string): string {
    if (codigo === 'admin') return 'ti-shield-lock';
    if (codigo === 'tecnico') return 'ti-tool';
    return 'ti-user';
  }

  classePerfil(codigo: string): string {
    if (codigo === 'admin') return 'perfil-admin';
    if (codigo === 'tecnico') return 'perfil-tecnico';
    return 'perfil-cliente';
  }

  abrirModalNovo(): void {
    this.editandoId = null;
    this.formNome = '';
    this.formEmail = '';
    this.formTelefone = '';
    this.formDepartamento = '';
    this.formCargo = '';
    this.formPerfil = 'cliente';
    this.formStatus = 'Ativo';
    this.formSenha = '';
    this.arquivoFotoSelecionado = null;
    this.previewFotoUrl = null;
    this.erroModal = '';
    this.abrirDialog();
  }

  abrirModalEditar(u: Usuario): void {
    this.editandoId = u.id;
    this.formNome = u.nome;
    this.formEmail = u.email;
    this.formTelefone = u.telefone || '';
    this.formDepartamento = u.departamento || '';
    this.formCargo = u.cargo || '';
    this.formPerfil = u.perfilCodigo;
    this.formStatus = u.status;
    this.formSenha = '';
    this.arquivoFotoSelecionado = null;
    this.previewFotoUrl = u.avatarUrl || null;
    this.erroModal = '';
    this.abrirDialog();
  }

  private abrirDialog(): void {
    const dlg = this.dialogUsuarioRef?.nativeElement;
    if (dlg && !dlg.open) {
      registrarLightDismissFallback(dlg);
      dlg.showModal();
    }
  }

  fecharModal(): void {
    this.dialogUsuarioRef?.nativeElement.close();
    this.erroModal = '';
  }

  aoSelecionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arq = input.files?.[0];
    if (!arq) return;
    if (arq.size > 3 * 1024 * 1024) {
      this.erroModal = 'A foto deve ter no máximo 3MB.';
      input.value = '';
      return;
    }
    this.arquivoFotoSelecionado = arq;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewFotoUrl = String(reader.result);
    };
    reader.readAsDataURL(arq);
  }

  alternarStatusRapido(u: Usuario): void {
    if (!this.ehAdmin || u.id === this.meuId) return;
    const novoStatus = u.ativo ? 'Inativo' : 'Ativo';
    this.http.put<UsuarioApi>(`${API_URL}/usuarios/${u.id}`, { status: novoStatus }).subscribe({
      next: () => {
        this.feedbackSucesso = `Usuário ${u.nome} marcado como ${novoStatus.toLowerCase()}.`;
        this.carregarUsuarios();
      },
      error: (err) => {
        alert(err.error?.erro || 'Não foi possível alterar o status do usuário.');
      },
    });
  }

  salvarUsuario(): void {
    this.erroModal = '';
    if (!this.formNome.trim() || !this.formEmail.trim()) {
      this.erroModal = 'Preencha nome completo e e-mail institucional.';
      return;
    }
    if (!this.editandoId && (!this.formSenha || this.formSenha.length < 6)) {
      this.erroModal = 'Informe uma senha inicial com pelo menos 6 caracteres.';
      return;
    }
    if (this.editandoId && this.formSenha && this.formSenha.length < 6) {
      this.erroModal = 'A nova senha precisa ter pelo menos 6 caracteres.';
      return;
    }

    this.salvando = true;
    const payload: Record<string, any> = {
      nome: this.formNome.trim(),
      email: this.formEmail.trim(),
      telefone: this.formTelefone.trim() || null,
      departamento: this.formDepartamento.trim() || null,
      cargo: this.formCargo.trim() || null,
      perfil: this.formPerfil,
      status: this.formStatus,
    };
    if (this.formSenha) payload['senha'] = this.formSenha;

    const req$ = this.editandoId
      ? this.http.put<UsuarioApi>(`${API_URL}/usuarios/${this.editandoId}`, payload)
      : this.http.post<UsuarioApi>(`${API_URL}/usuarios`, payload);

    req$.subscribe({
      next: (salvo) => {
        if (this.arquivoFotoSelecionado) {
          const form = new FormData();
          form.append('avatar', this.arquivoFotoSelecionado);
          this.http.post<UsuarioApi>(`${API_URL}/usuarios/${salvo.id}/avatar`, form).subscribe({
            next: (comFoto) => this.finalizarSalvamento(comFoto),
            error: () => this.finalizarSalvamento(salvo),
          });
        } else {
          this.finalizarSalvamento(salvo);
        }
      },
      error: (err) => {
        this.salvando = false;
        this.erroModal = err.error?.erro ?? 'Erro ao salvar dados do usuário.';
      },
    });
  }

  private finalizarSalvamento(usuarioSalvo: UsuarioApi): void {
    this.salvando = false;
    if (usuarioSalvo.id === this.meuId) {
      this.authService.atualizarUsuarioLocal(usuarioSalvo);
    }
    this.feedbackSucesso = this.editandoId
      ? 'Cadastro do usuário atualizado com sucesso.'
      : 'Novo usuário cadastrado com sucesso.';
    this.fecharModal();
    this.carregarUsuarios();
  }
}
