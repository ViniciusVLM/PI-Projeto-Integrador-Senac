import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Sidebar } from '../sidebar/sidebar';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
}

interface UsuarioApi {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  status: string;
}

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-usuarioslista',
  standalone: true,
  imports: [Sidebar],
  templateUrl: './usuarioslista.html',
  styleUrl: './usuarioslista.css',
})
export class Usuarioslista implements OnInit {
  private http = inject(HttpClient);

  usuarios = signal<Usuario[]>([]);

  busca = signal('');

  ngOnInit(): void {
    const mapaPerfil: Record<string, string> = {
      admin: 'Administrador',
      tecnico: 'Técnico',
      cliente: 'Solicitante',
    };

    this.http.get<UsuarioApi[]>(`${API_URL}/usuarios`).subscribe({
      next: (lista) => {
        this.usuarios.set(
          lista.map((u) => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            perfil: mapaPerfil[u.perfil] ?? u.perfil,
            ativo: u.status === 'Ativo',
          }))
        );
      },
      error: () => {},
    });
  }

  filtrados = computed(() => {
    const termo = this.busca().toLowerCase().trim();
    return this.usuarios().filter(u =>
      `${u.nome} ${u.email} ${u.perfil}`.toLowerCase().includes(termo)
    );
  });

  onBusca(event: Event) {
    this.busca.set((event.target as HTMLInputElement).value);
  }
}