import { Component, computed, signal } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';

interface Equipamento {
  id: number;
  tipo: string;
  nome: string;
  patrimonio: string;
  usuario: string;
  ativo: boolean;
}

@Component({
  selector: 'app-equipamentoslista',
  standalone: true,
  imports: [Sidebar],
  templateUrl: './equipamentoslista.html',
  styleUrl: './equipamentoslista.css',
})
export class Equipamentoslista {
  equipamentos = signal<Equipamento[]>([
    { id: 1, tipo: 'Notebook', nome: 'Acer Nitro 5', patrimonio: 'PAT-0001', usuario: 'Ana Souza', ativo: true },
    { id: 2, tipo: 'Desktop', nome: 'Dell OptiPlex 3090', patrimonio: 'PAT-0002', usuario: 'Carlos Lima', ativo: true },
    { id: 3, tipo: 'Monitor', nome: 'LG 24"', patrimonio: 'PAT-0003', usuario: 'Marina Alves', ativo: true },
    { id: 4, tipo: 'Impressora', nome: 'HP LaserJet P1102', patrimonio: 'PAT-0004', usuario: 'Recepção', ativo: false },
    { id: 5, tipo: 'Roteador', nome: 'TP-Link Archer C6', patrimonio: 'PAT-0005', usuario: 'Sala de TI', ativo: true },
  ]);

  busca = signal('');

  filtrados = computed(() => {
    const termo = this.busca().toLowerCase().trim();
    return this.equipamentos().filter(e =>
      `${e.nome} ${e.tipo} ${e.patrimonio} ${e.usuario}`.toLowerCase().includes(termo)
    );
  });

  onBusca(event: Event) {
    this.busca.set((event.target as HTMLInputElement).value);
  }
}