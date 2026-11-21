import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { AuthService, UsuarioPerfil } from '../core/services/auth.service';
import { Sidebar } from '../sidebar/sidebar';

type SecaoConfig = 'perfil' | 'senha' | 'notificacoes' | 'preferencias' | 'parametros';

interface PreferenciasSalvas {
  notifAtribuido: boolean;
  notifStatus: boolean;
  notifResumo: boolean;
  idioma: string;
  itensPorPagina: string;
  dashboardCompacto: boolean;
  slaPadraoHoras: number;
  prioridadePadrao: string;
  cadastroPublicoAtivo: boolean;
  fotoBase64?: string;
}

const API_URL = 'http://localhost:3000/api';
const CONFIG_STORAGE_KEY = 'securedesk_preferencias';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [FormsModule, Sidebar],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css',
})
export class Configuracoes implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  secaoAtiva: SecaoConfig = 'perfil';

  nome = '';
  email = '';
  telefone = '';
  perfil: 'cliente' | 'tecnico' | 'admin' = 'cliente';

  nomeOriginal = '';
  telefoneOriginal = '';

  senhaAtual = '';
  novaSenha = '';
  confirmarSenha = '';

  config: PreferenciasSalvas = {
    notifAtribuido: true,
    notifStatus: true,
    notifResumo: false,
    idioma: 'pt-BR',
    itensPorPagina: '5',
    dashboardCompacto: false,
    slaPadraoHoras: 24,
    prioridadePadrao: 'Média',
    cadastroPublicoAtivo: true,
  };

  salvando = false;
  sucessoMensagem = '';
  erroMensagem = '';

  ngOnInit(): void {
    this.carregarPreferenciasLocais();

    const local = this.authService.getUsuario();
    if (local) {
      this.aplicarUsuario(local);
    }

    this.http.get<UsuarioPerfil>(`${API_URL}/auth/me`).subscribe({
      next: (u) => {
        this.aplicarUsuario(u);
        this.authService.atualizarUsuarioLocal(u);
      },
      error: () => {},
    });
  }

  private aplicarUsuario(u: UsuarioPerfil): void {
    this.nome = u.nome || '';
    this.email = u.email || '';
    this.telefone = u.telefone || '';
    this.perfil = u.perfil || 'cliente';
    this.nomeOriginal = this.nome;
    this.telefoneOriginal = this.telefone;
  }

  private carregarPreferenciasLocais(): void {
    try {
      const salvo = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (salvo) {
        this.config = { ...this.config, ...JSON.parse(salvo) };
      }
    } catch {
      // mantém valores padrão
    }
  }

  get isAdmin(): boolean {
    return this.perfil === 'admin';
  }

  get inicial(): string {
    const texto = (this.nome || 'U').trim();
    return texto.charAt(0).toUpperCase();
  }

  get cargoSubtitulo(): string {
    if (this.perfil === 'admin') return 'Administrador';
    if (this.perfil === 'tecnico') return 'Técnico de TI';
    return 'Cliente / Solicitante';
  }

  get perfilExibicao(): string {
    if (this.perfil === 'admin') return 'Administrador';
    if (this.perfil === 'tecnico') return 'Técnico';
    return 'Cliente';
  }

  selecionarSecao(secao: SecaoConfig, elementoId: string): void {
    this.secaoAtiva = secao;
    setTimeout(() => {
      const el = document.getElementById(elementoId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 30);
  }

  aoSelecionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    if (arquivo.size > 2 * 1024 * 1024) {
      this.erroMensagem = 'A foto deve ter no máximo 2MB.';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.config.fotoBase64 = String(reader.result);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
      this.sucessoMensagem = 'Foto de perfil atualizada!';
    };
    reader.readAsDataURL(arquivo);
  }

  restaurar(): void {
    this.nome = this.nomeOriginal;
    this.telefone = this.telefoneOriginal;
    this.senhaAtual = '';
    this.novaSenha = '';
    this.confirmarSenha = '';
    this.erroMensagem = '';
    this.sucessoMensagem = '';
    this.carregarPreferenciasLocais();
  }

  salvarAlteracoes(): void {
    this.erroMensagem = '';
    this.sucessoMensagem = '';

    const nomeLimpo = this.nome.trim();
    if (!nomeLimpo || nomeLimpo.length < 3) {
      this.erroMensagem = 'Informe o nome completo (mínimo de 3 caracteres).';
      return;
    }

    const querTrocarSenha = !!(this.senhaAtual || this.novaSenha || this.confirmarSenha);
    if (querTrocarSenha) {
      if (!this.senhaAtual || !this.novaSenha || !this.confirmarSenha) {
        this.erroMensagem = 'Para alterar a senha, preencha a senha atual, a nova senha e a confirmação.';
        return;
      }
      if (this.novaSenha.length < 6) {
        this.erroMensagem = 'A nova senha deve ter ao menos 6 caracteres.';
        return;
      }
      if (this.novaSenha !== this.confirmarSenha) {
        this.erroMensagem = 'A confirmação da nova senha não confere.';
        return;
      }
    }

    this.salvando = true;
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));

    this.http
      .put<UsuarioPerfil>(`${API_URL}/auth/me`, {
        nome: nomeLimpo,
        telefone: this.telefone.trim() || null,
      })
      .subscribe({
        next: (usuarioAtualizado) => {
          this.aplicarUsuario(usuarioAtualizado);
          this.authService.atualizarUsuarioLocal(usuarioAtualizado);

          const reqSenha$: Observable< unknown > = querTrocarSenha
            ? this.http.put(`${API_URL}/auth/me/senha`, {
                senhaAtual: this.senhaAtual,
                novaSenha: this.novaSenha,
                confirmarSenha: this.confirmarSenha,
              })
            : of(null);

          reqSenha$.subscribe({
            next: () => {
              this.salvando = false;
              this.senhaAtual = '';
              this.novaSenha = '';
              this.confirmarSenha = '';
              this.sucessoMensagem = querTrocarSenha
                ? 'Dados do perfil e senha atualizados com sucesso!'
                : 'Alterações salvas com sucesso!';
            },
            error: (err) => {
              this.salvando = false;
              this.erroMensagem = err.error?.erro ?? 'Perfil salvo, mas não foi possível alterar a senha.';
            },
          });
        },
        error: (err) => {
          this.salvando = false;
          this.erroMensagem = err.error?.erro ?? 'Não foi possível salvar as alterações.';
        },
      });
  }
}
