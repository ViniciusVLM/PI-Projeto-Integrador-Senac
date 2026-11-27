import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface UsuarioPerfil {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  perfil: 'cliente' | 'tecnico' | 'admin';
  avatarUrl?: string | null;
  departamento?: string | null;
  cargo?: string | null;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioPerfil;
}

export interface CadastroPayload {
  email: string;
  senha: string;
  confirmarSenha?: string;
  nome?: string;
  telefone?: string;
  departamento?: string;
  cargo?: string;
}

export interface RedefinirSenhaPayload {
  email: string;
  codigo: string;
  novaSenha: string;
  confirmarSenha: string;
}

export interface MensagemResponse {
  mensagem: string;
  usuario?: UsuarioPerfil;
  smtpAtivo?: boolean;
  validadeMinutos?: number;
}

const API_URL = '/api';
const TOKEN_KEY = 'securedesk_token';
const USUARIO_KEY = 'securedesk_usuario';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly usuarioAtual = signal<UsuarioPerfil | null>(this.lerUsuarioStorage());

  constructor(private http: HttpClient) {}

  private lerUsuarioStorage(): UsuarioPerfil | null {
    const raw = localStorage.getItem(USUARIO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioPerfil;
    } catch {
      return null;
    }
  }

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { email, senha }).pipe(
      tap((resp) => {
        localStorage.setItem(TOKEN_KEY, resp.token);
        localStorage.setItem(USUARIO_KEY, JSON.stringify(resp.usuario));
        this.usuarioAtual.set(resp.usuario);
      })
    );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${API_URL}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this.usuarioAtual.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUsuario(): UsuarioPerfil | null {
    return this.usuarioAtual();
  }

  atualizarUsuarioLocal(parcial: Partial<UsuarioPerfil>): void {
    const atual = this.getUsuario();
    if (!atual) return;
    const atualizado = { ...atual, ...parcial };
    localStorage.setItem(USUARIO_KEY, JSON.stringify(atualizado));
    this.usuarioAtual.set(atualizado);
  }

  uploadMeuAvatar(arquivo: File): Observable<UsuarioPerfil> {
    const form = new FormData();
    form.append('avatar', arquivo);
    return this.http.post<UsuarioPerfil>(`${API_URL}/auth/me/avatar`, form).pipe(
      tap((u) => this.atualizarUsuarioLocal(u))
    );
  }

  getPerfil(): string | null {
    return this.getUsuario()?.perfil ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getUsuario();
  }

  temPerfil(...perfis: string[]): boolean {
    const perfil = this.getPerfil();
    return perfil ? perfis.includes(perfil) : false;
  }

  cadastrar(dados: CadastroPayload): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${API_URL}/auth/cadastro`, dados);
  }

  esqueciSenha(email: string): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${API_URL}/auth/esqueci-senha`, { email });
  }

  redefinirSenha(dados: RedefinirSenhaPayload): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${API_URL}/auth/redefinir-senha`, dados);
  }
}
