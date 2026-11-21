import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface UsuarioPerfil {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  perfil: 'cliente' | 'tecnico' | 'admin';
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
}

export interface EsqueciSenhaPayload {
  email: string;
  novaSenha?: string;
  confirmarSenha?: string;
  senha?: string;
}

export interface MensagemResponse {
  mensagem: string;
  usuario?: UsuarioPerfil;
}

const API_URL = 'http://localhost:3000/api';
const TOKEN_KEY = 'securedesk_token';
const USUARIO_KEY = 'securedesk_usuario';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { email, senha }).pipe(
      tap((resp) => {
        localStorage.setItem(TOKEN_KEY, resp.token);
        localStorage.setItem(USUARIO_KEY, JSON.stringify(resp.usuario));
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
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUsuario(): UsuarioPerfil | null {
    const raw = localStorage.getItem(USUARIO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioPerfil;
    } catch {
      return null;
    }
  }

  atualizarUsuarioLocal(parcial: Partial<UsuarioPerfil>): void {
    const atual = this.getUsuario();
    if (!atual) return;
    const atualizado = { ...atual, ...parcial };
    localStorage.setItem(USUARIO_KEY, JSON.stringify(atualizado));
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

  esqueciSenha(dados: EsqueciSenhaPayload): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${API_URL}/auth/esqueci-senha`, dados);
  }

  redefinirSenha(email: string, novaSenha: string, confirmarSenha?: string): Observable<MensagemResponse> {
    return this.esqueciSenha({ email, novaSenha, confirmarSenha });
  }
}
