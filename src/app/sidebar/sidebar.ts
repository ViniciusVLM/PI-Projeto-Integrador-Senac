import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private authService = inject(AuthService);

  get nomeUsuario(): string {
    return this.authService.getUsuario()?.nome || 'Administrador';
  }

  get cargoUsuario(): string {
    const perfil = this.authService.getPerfil();
    if (perfil === 'admin') return 'Administrador';
    if (perfil === 'tecnico') return 'Técnico de TI';
    if (perfil === 'cliente') return 'Usuário';
    return 'Perfil de acesso';
  }

  get iniciais(): string {
    const nome = this.nomeUsuario.trim();
    if (!nome) return 'AD';
    const partes = nome.split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }
}