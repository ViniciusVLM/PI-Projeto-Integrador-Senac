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

export interface RedefinirSenhaPayload {
  email: string;
  codigo: string;
  novaSenha: string;
  confirmarSenha: string;
}

export interface MensagemResponse {
  mensagem: string;
  usuario?: UsuarioPerfil;
}

// Endereço relativo: em produção a API e a tela ficam no mesmo site;
// no npm start, o proxy.conf.json encaminha /api para a porta 3000.
const API_URL = '/api';
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

  // Passo 1: gera um código de 6 dígitos (aparece no terminal/log da API, o e-mail é simulado)
  esqueciSenha(email: string): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${API_URL}/auth/esqueci-senha`, { email });
  }

  // Passo 2: confere o código e grava a nova senha
  redefinirSenha(dados: RedefinirSenhaPayload): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${API_URL}/auth/redefinir-senha`, dados);
  }
}
