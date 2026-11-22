import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../sidebar/sidebar';

interface Equipamento {
  id: number;
  tipo: string;
  nome: string;
  patrimonio: string;
  usuario: string;
  status: string;
  ativo: boolean;
}

interface EquipamentoApi {
  id: number;
  tipo: string;
  nome: string;
  marca?: string | null;
  modelo?: string | null;
  patrimonio: string;
  usuarioId?: number | null;
  usuarioNome?: string | null;
  status: string;
}

interface UsuarioOpcao {
  id: number;
  nome: string;
}

// Endereço relativo: em produção a API e a tela ficam no mesmo site;
// no npm start, o proxy.conf.json encaminha /api para a porta 3000.
const API_URL = '/api';

@Component({
  selector: 'app-equipamentoslista',
  standalone: true,
  imports: [FormsModule, Sidebar],
  templateUrl: './equipamentoslista.html',
  styleUrl: './equipamentoslista.css',
})
export class Equipamentoslista implements OnInit {
  private http = inject(HttpClient);

  equipamentos = signal<Equipamento[]>([]);
  usuariosOpcoes: UsuarioOpcao[] = [];
  busca = signal('');

  tiposValidos = ['Notebook', 'Desktop', 'Monitor', 'Impressora', 'Roteador', 'Switch', 'Smartphone', 'Outro'];

  modalAberto = false;
  salvando = false;
  erroModal = '';

  novoTipo = 'Notebook';
  novaMarca = '';
  novoModelo = '';
  novoPatrimonio = '';
  novoUsuarioId = '';

  ngOnInit(): void {
    this.carregarEquipamentos();
    this.http.get<UsuarioOpcao[]>(`${API_URL}/usuarios`).subscribe({
      next: (lista) => (this.usuariosOpcoes = lista),
      error: () => {},
    });
  }

  carregarEquipamentos(): void {
    this.http.get<EquipamentoApi[]>(`${API_URL}/equipamentos`).subscribe({
      next: (lista) => {
        this.equipamentos.set(
          lista.map((e) => ({
            id: e.id,
            tipo: e.tipo,
            nome: e.nome,
            patrimonio: e.patrimonio,
            usuario: e.usuarioNome || '—',
            status: e.status,
            ativo: e.status === 'Ativo',
          }))
        );
      },
      error: () => {},
    });
  }

  filtrados = computed(() => {
    const termo = this.busca().toLowerCase().trim();
    return this.equipamentos().filter((e) =>
      `${e.nome} ${e.tipo} ${e.patrimonio} ${e.usuario}`.toLowerCase().includes(termo)
    );
  });

  onBusca(event: Event): void {
    this.busca.set((event.target as HTMLInputElement).value);
  }

  abrirModal(): void {
    this.novoTipo = 'Notebook';
    this.novaMarca = '';
    this.novoModelo = '';
    this.novoPatrimonio = '';
    this.novoUsuarioId = '';
    this.erroModal = '';
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.erroModal = '';
  }

  salvarEquipamento(): void {
    this.erroModal = '';
    if (!this.novoTipo || !this.novaMarca.trim() || !this.novoModelo.trim() || !this.novoPatrimonio.trim()) {
      this.erroModal = 'Preencha tipo, marca, modelo e patrimônio.';
      return;
    }

    this.salvando = true;
    this.http
      .post<EquipamentoApi>(`${API_URL}/equipamentos`, {
        tipo: this.novoTipo,
        marca: this.novaMarca.trim(),
        modelo: this.novoModelo.trim(),
        patrimonio: this.novoPatrimonio.trim(),
        usuarioId: this.novoUsuarioId ? Number(this.novoUsuarioId) : null,
      })
      .subscribe({
        next: () => {
          this.salvando = false;
          this.fecharModal();
          this.carregarEquipamentos();
        },
        error: (err) => {
          this.salvando = false;
          if (err.status === 403) {
            this.erroModal = 'Apenas administradores podem cadastrar equipamentos.';
          } else {
            this.erroModal = err.error?.erro ?? 'Erro ao cadastrar equipamento.';
          }
        },
      });
  }
}
