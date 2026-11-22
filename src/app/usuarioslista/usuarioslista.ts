import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../sidebar/sidebar';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  perfil: string;
  ativo: boolean;
}

interface UsuarioApi {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  perfil: string;
  status: string;
}

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-usuarioslista',
  standalone: true,
  imports: [FormsModule, Sidebar],
  templateUrl: './usuarioslista.html',
  styleUrl: './usuarioslista.css',
})
export class Usuarioslista implements OnInit {
  private http = inject(HttpClient);

  usuarios = signal<Usuario[]>([]);
  busca = signal('');

  modalAberto = false;
  salvando = false;
  erroModal = '';

  novoNome = '';
  novoEmail = '';
  novoTelefone = '';
  novoPerfil: 'cliente' | 'tecnico' | 'admin' = 'cliente';
  novaSenha = '';

  private mapaPerfil: Record<string, string> = {
    admin: 'Administrador',
    tecnico: 'Técnico',
    cliente: 'Solicitante',
  };

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
            telefone: u.telefone,
            perfil: this.mapaPerfil[u.perfil] ?? u.perfil,
            ativo: u.status === 'Ativo',
          }))
        );
      },
      error: () => {},
    });
  }

  filtrados = computed(() => {
    const termo = this.busca().toLowerCase().trim();
    return this.usuarios().filter((u) =>
      `${u.nome} ${u.email} ${u.perfil}`.toLowerCase().includes(termo)
    );
  });

  onBusca(event: Event): void {
    this.busca.set((event.target as HTMLInputElement).value);
  }

  abrirModal(): void {
    this.novoNome = '';
    this.novoEmail = '';
    this.novoTelefone = '';
    this.novoPerfil = 'cliente';
    this.novaSenha = '';
    this.erroModal = '';
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.erroModal = '';
  }

  salvarUsuario(): void {
    this.erroModal = '';
    if (!this.novoNome.trim() || !this.novoEmail.trim() || !this.novaSenha) {
      this.erroModal = 'Preencha nome, e-mail e senha.';
      return;
    }
    if (this.novaSenha.length < 6) {
      this.erroModal = 'A senha precisa ter pelo menos 6 caracteres.';
      return;
    }

    this.salvando = true;
    this.http
      .post<UsuarioApi>(`${API_URL}/usuarios`, {
        nome: this.novoNome.trim(),
        email: this.novoEmail.trim(),
        telefone: this.novoTelefone.trim() || null,
        perfil: this.novoPerfil,
        senha: this.novaSenha,
      })
      .subscribe({
        next: () => {
          this.salvando = false;
          this.fecharModal();
          this.carregarUsuarios();
        },
        error: (err) => {
          this.salvando = false;
          if (err.status === 403) {
            this.erroModal = 'Apenas administradores podem cadastrar novos usuários por aqui.';
          } else {
            this.erroModal = err.error?.erro ?? 'Erro ao cadastrar usuário.';
          }
        },
      });
  }
}
