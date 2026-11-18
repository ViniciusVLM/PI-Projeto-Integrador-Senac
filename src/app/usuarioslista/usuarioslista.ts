import { Component, computed, signal } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
}

@Component({
  selector: 'app-usuarioslista',
  standalone: true,
  imports: [Sidebar],
  templateUrl: './usuarioslista.html',
  styleUrl: './usuarioslista.css',
})
export class Usuarioslista {
  usuarios = signal<Usuario[]>([
    { id: 1, nome: 'Ana Souza', email: 'ana.souza@empresa.com', perfil: 'Administrador', ativo: true },
    { id: 2, nome: 'Carlos Lima', email: 'carlos.lima@empresa.com', perfil: 'Técnico', ativo: true },
    { id: 3, nome: 'Marina Alves', email: 'marina.alves@empresa.com', perfil: 'Solicitante', ativo: true },
    { id: 4, nome: 'João Pereira', email: 'joao.pereira@empresa.com', perfil: 'Técnico', ativo: false },
    { id: 5, nome: 'Fernanda Rocha', email: 'fernanda.rocha@empresa.com', perfil: 'Solicitante', ativo: true },
  ]);

  busca = signal('');

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