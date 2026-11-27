import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NotificacaoItem, NotificacaoService } from '../core/services/notificacao.service';
import { extrairIniciais, tempoRelativoCurto } from '../core/utils/ui.utils';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  readonly authService = inject(AuthService);
  readonly notifService = inject(NotificacaoService);
  private router = inject(Router);

  painelNotifAberto = signal(false);
  erroImagemAvatar = signal(false);

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.notifService.carregar();
    }
  }

  get usuario() {
    return this.authService.usuarioAtual();
  }

  get nomeUsuario(): string {
    return this.usuario?.nome || 'Usuário';
  }

  get avatarUrl(): string | null {
    if (this.erroImagemAvatar()) return null;
    return this.usuario?.avatarUrl || null;
  }

  get cargoUsuario(): string {
    const u = this.usuario;
    if (u?.cargo) return u.cargo;
    const perfil = u?.perfil;
    if (perfil === 'admin') return 'Administrador de TI';
    if (perfil === 'tecnico') return 'Analista de Suporte';
    return 'Solicitante';
  }

  get iniciais(): string {
    return extrairIniciais(this.nomeUsuario);
  }

  get podeVerRelatorios(): boolean {
    return this.authService.temPerfil('tecnico', 'admin');
  }

  get isAdmin(): boolean {
    return this.authService.temPerfil('admin');
  }

  alternarNotificacoes(): void {
    const novo = !this.painelNotifAberto();
    this.painelNotifAberto.set(novo);
    if (novo) this.notifService.carregar();
  }

  abrirNotificacao(item: NotificacaoItem): void {
    if (!item.lida) {
      this.notifService.marcarComoLida(item.id);
    }
    this.painelNotifAberto.set(false);
    if (item.chamadoId) {
      this.router.navigate(['/detalhes-chamados', item.chamadoId]);
    }
  }

  tempoRelativo(data: string): string {
    return tempoRelativoCurto(data);
  }

  aoFalharAvatar(): void {
    this.erroImagemAvatar.set(true);
  }

  sair(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
