import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { AuthService, UsuarioPerfil } from '../core/services/auth.service';
import { Sidebar } from '../sidebar/sidebar';
import { extrairIniciais } from '../core/utils/ui.utils';

type SecaoConfig = 'perfil' | 'senha' | 'preferencias' | 'parametros' | 'smtp';

interface PreferenciasLocais {
  notifAtribuido: boolean;
  notifStatus: boolean;
  notifResumo: boolean;
  idioma: string;
  itensPorPagina: string;
  dashboardCompacto: boolean;
}

interface ProvedorSugerido {
  id: string;
  nome: string;
  host: string;
  port: number;
  secure: boolean;
  instrucoes: string;
}

interface ConfigServidorResposta {
  nomeOrganizacao: string;
  slaPadraoHoras: number;
  slaPorPrioridade: Record<string, number>;
  prioridadePadrao: string;
  cadastroPublicoAtivo: boolean;
  notificarPorEmail: boolean;
  smtpStatus: { ativo: boolean; modo: string; host: string | null };
  smtp?: {
    ativo: boolean;
    origem: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    possuiSenha: boolean;
    fromName: string;
    fromEmail: string;
    provedoresSugeridos: ProvedorSugerido[];
  };
}

const API_URL = '/api';
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
  departamento = '';
  cargo = '';
  avatarUrl: string | null = null;
  perfil: 'cliente' | 'tecnico' | 'admin' = 'cliente';

  nomeOriginal = '';
  telefoneOriginal = '';
  departamentoOriginal = '';
  cargoOriginal = '';

  senhaAtual = '';
  novaSenha = '';
  confirmarSenha = '';

  config: PreferenciasLocais = {
    notifAtribuido: true,
    notifStatus: true,
    notifResumo: false,
    idioma: 'pt-BR',
    itensPorPagina: '10',
    dashboardCompacto: false,
  };

  // Parâmetros globais no servidor
  slaPadraoHoras = 24;
  slaPorPrioridade: Record<string, number> = {
    'Crítica': 4,
    'Alta': 8,
    'Média': 24,
    'Baixa': 48,
  };
  prioridadePadrao = 'Média';
  cadastroPublicoAtivo = true;
  notificarPorEmail = true;

  // Configuração SMTP externa gratuita
  smtpAtivo = false;
  smtpOrigem = 'simulado';
  smtpHost = 'smtp.gmail.com';
  smtpPort = 587;
  smtpSecure = false;
  smtpUser = '';
  smtpPass = '';
  smtpPossuiSenha = false;
  smtpFromName = 'SecureDesk Central de TI';
  smtpFromEmail = '';
  emailDestinoTeste = '';
  provedoresSmtp: ProvedorSugerido[] = [];
  instrucaoProvedorAtual = '';

  enviandoFoto = false;
  salvando = false;
  salvandoSmtp = false;
  testandoSmtp = false;
  sucessoMensagem = '';
  erroMensagem = '';

  readonly iniciais = extrairIniciais;

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

    this.carregarParametrosServidor();
  }

  private aplicarUsuario(u: UsuarioPerfil): void {
    this.nome = u.nome || '';
    this.email = u.email || '';
    this.telefone = u.telefone || '';
    this.departamento = u.departamento || '';
    this.cargo = u.cargo || '';
    this.avatarUrl = u.avatarUrl || null;
    this.perfil = u.perfil || 'cliente';
    this.emailDestinoTeste = this.emailDestinoTeste || u.email || '';

    this.nomeOriginal = this.nome;
    this.telefoneOriginal = this.telefone;
    this.departamentoOriginal = this.departamento;
    this.cargoOriginal = this.cargo;
  }

  private carregarPreferenciasLocais(): void {
    try {
      const salvo = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (salvo) {
        this.config = { ...this.config, ...JSON.parse(salvo) };
      }
    } catch {}
  }

  carregarParametrosServidor(): void {
    this.http.get<ConfigServidorResposta>(`${API_URL}/configuracoes`).subscribe({
      next: (cfg) => {
        this.slaPadraoHoras = cfg.slaPadraoHoras;
        this.slaPorPrioridade = { ...this.slaPorPrioridade, ...(cfg.slaPorPrioridade || {}) };
        this.prioridadePadrao = cfg.prioridadePadrao;
        this.cadastroPublicoAtivo = cfg.cadastroPublicoAtivo;
        this.notificarPorEmail = cfg.notificarPorEmail;
        this.smtpAtivo = cfg.smtpStatus?.ativo ?? false;
        this.smtpOrigem = cfg.smtpStatus?.modo ?? 'simulado';

        if (cfg.smtp) {
          this.smtpHost = cfg.smtp.host || 'smtp.gmail.com';
          this.smtpPort = cfg.smtp.port || 587;
          this.smtpSecure = cfg.smtp.secure;
          this.smtpUser = cfg.smtp.user || '';
          this.smtpPossuiSenha = cfg.smtp.possuiSenha;
          this.smtpFromName = cfg.smtp.fromName || 'SecureDesk Central de TI';
          this.smtpFromEmail = cfg.smtp.fromEmail || '';
          this.provedoresSmtp = cfg.smtp.provedoresSugeridos || [];
          const prov = this.provedoresSmtp.find((p) => p.host === this.smtpHost);
          this.instrucaoProvedorAtual = prov?.instrucoes || '';
        }
      },
      error: () => {},
    });
  }

  get isAdmin(): boolean {
    return this.perfil === 'admin';
  }

  get perfilExibicao(): string {
    if (this.perfil === 'admin') return 'Administrador';
    if (this.perfil === 'tecnico') return 'Técnico de TI';
    return 'Solicitante';
  }

  selecionarSecao(secao: SecaoConfig): void {
    this.secaoAtiva = secao;
    this.erroMensagem = '';
    this.sucessoMensagem = '';
  }

  aplicarPresetSmtp(prov: ProvedorSugerido): void {
    this.smtpHost = prov.host;
    this.smtpPort = prov.port;
    this.smtpSecure = prov.secure;
    this.smtpAtivo = true;
    this.instrucaoProvedorAtual = prov.instrucoes;
  }

  aoSelecionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    if (arquivo.size > 3 * 1024 * 1024) {
      this.erroMensagem = 'A foto de perfil deve ter no máximo 3MB.';
      input.value = '';
      return;
    }

    this.enviandoFoto = true;
    this.erroMensagem = '';
    this.sucessoMensagem = '';

    this.authService.uploadMeuAvatar(arquivo).subscribe({
      next: (u) => {
        this.enviandoFoto = false;
        this.avatarUrl = u.avatarUrl || null;
        this.sucessoMensagem = 'Foto de perfil atualizada em todo o sistema!';
        input.value = '';
      },
      error: (err) => {
        this.enviandoFoto = false;
        this.erroMensagem = err.error?.erro || 'Não foi possível enviar a foto.';
      },
    });
  }

  removerFoto(): void {
    this.http.put<UsuarioPerfil>(`${API_URL}/auth/me`, { avatarUrl: null }).subscribe({
      next: (u) => {
        this.avatarUrl = null;
        this.authService.atualizarUsuarioLocal(u);
        this.sucessoMensagem = 'Foto removida.';
      },
      error: () => {},
    });
  }

  restaurar(): void {
    this.nome = this.nomeOriginal;
    this.telefone = this.telefoneOriginal;
    this.departamento = this.departamentoOriginal;
    this.cargo = this.cargoOriginal;
    this.senhaAtual = '';
    this.novaSenha = '';
    this.confirmarSenha = '';
    this.erroMensagem = '';
    this.sucessoMensagem = '';
    this.carregarPreferenciasLocais();
    this.carregarParametrosServidor();
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
        departamento: this.departamento.trim() || null,
        cargo: this.cargo.trim() || null,
      })
      .subscribe({
        next: (usuarioAtualizado) => {
          this.aplicarUsuario(usuarioAtualizado);
          this.authService.atualizarUsuarioLocal(usuarioAtualizado);

          const reqParametros$: Observable<unknown> = this.isAdmin
            ? this.http.put(`${API_URL}/configuracoes`, {
                slaPadraoHoras: this.slaPadraoHoras,
                slaPorPrioridade: this.slaPorPrioridade,
                prioridadePadrao: this.prioridadePadrao,
                cadastroPublicoAtivo: this.cadastroPublicoAtivo,
                notificarPorEmail: this.notificarPorEmail,
              })
            : of(null);

          reqParametros$.subscribe({
            next: () => {
              const reqSenha$: Observable<unknown> = querTrocarSenha
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
                    ? 'Perfil, preferências e senha atualizados com sucesso!'
                    : 'Configurações salvas com sucesso!';
                },
                error: (err) => {
                  this.salvando = false;
                  this.erroMensagem = err.error?.erro ?? 'Perfil salvo, mas não foi possível alterar a senha.';
                },
              });
            },
            error: () => {
              this.salvando = false;
              this.erroMensagem = 'Perfil salvo, mas ocorreu um erro ao gravar os parâmetros globais.';
            },
          });
        },
        error: (err) => {
          this.salvando = false;
          this.erroMensagem = err.error?.erro ?? 'Não foi possível salvar as alterações.';
        },
      });
  }

  salvarConfigSmtp(): void {
    if (!this.isAdmin) return;
    this.erroMensagem = '';
    this.sucessoMensagem = '';
    this.salvandoSmtp = true;

    this.http
      .put<ConfigServidorResposta>(`${API_URL}/configuracoes/smtp`, {
        ativo: this.smtpAtivo,
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        user: this.smtpUser,
        pass: this.smtpPass,
        fromName: this.smtpFromName,
        fromEmail: this.smtpFromEmail || this.smtpUser,
      })
      .subscribe({
        next: (resp) => {
          this.salvandoSmtp = false;
          this.smtpPass = '';
          this.smtpAtivo = resp.smtpStatus.ativo;
          this.smtpOrigem = resp.smtpStatus.modo;
          this.smtpPossuiSenha = resp.smtp?.possuiSenha ?? this.smtpPossuiSenha;
          this.sucessoMensagem = this.smtpAtivo
            ? 'Servidor SMTP salvo e ativado! O envio real de códigos de recuperação está pronto.'
            : 'Configuração SMTP salva (modo simulado ativo).';
        },
        error: (err) => {
          this.salvandoSmtp = false;
          this.erroMensagem = err.error?.erro || 'Erro ao salvar configuração SMTP.';
        },
      });
  }

  enviarTesteSmtp(): void {
    if (!this.isAdmin || this.testandoSmtp) return;
    this.erroMensagem = '';
    this.sucessoMensagem = '';
    this.testandoSmtp = true;

    this.http
      .post<{ mensagem: string }>(`${API_URL}/configuracoes/smtp/testar`, {
        destinatario: this.emailDestinoTeste || this.email,
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        user: this.smtpUser,
        pass: this.smtpPass || undefined,
        fromName: this.smtpFromName,
        fromEmail: this.smtpFromEmail || this.smtpUser,
      })
      .subscribe({
        next: (resp) => {
          this.testandoSmtp = false;
          this.sucessoMensagem = resp.mensagem;
        },
        error: (err) => {
          this.testandoSmtp = false;
          this.erroMensagem = err.error?.erro || 'Falha ao enviar e-mail de teste.';
        },
      });
  }
}
