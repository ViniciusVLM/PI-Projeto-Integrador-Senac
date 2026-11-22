import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../sidebar/sidebar';

interface Categoria {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface CategoriaApi {
  id: number;
  nome: string;
  descricao: string;
  status: string;
}

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-categorialista',
  standalone: true,
  imports: [FormsModule, Sidebar],
  templateUrl: './categorialista.html',
  styleUrl: './categorialista.css',
})
export class Categorialista implements OnInit {
  private http = inject(HttpClient);

  categorias = signal<Categoria[]>([]);

  modalAberto = false;
  salvando = false;
  erroModal = '';

  novoNome = '';
  novaDescricao = '';

  ngOnInit(): void {
    this.carregarCategorias();
  }

  carregarCategorias(): void {
    this.http.get<CategoriaApi[]>(`${API_URL}/categorias`).subscribe({
      next: (lista) => {
        this.categorias.set(
          lista.map((c) => ({
            id: c.id,
            nome: c.nome,
            descricao: c.descricao,
            ativo: c.status === 'Ativa',
          }))
        );
      },
      error: () => {},
    });
  }

  abrirModal(): void {
    this.novoNome = '';
    this.novaDescricao = '';
    this.erroModal = '';
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.erroModal = '';
  }

  salvarCategoria(): void {
    this.erroModal = '';
    if (!this.novoNome.trim()) {
      this.erroModal = 'Informe o nome da categoria.';
      return;
    }

    this.salvando = true;
    this.http
      .post<CategoriaApi>(`${API_URL}/categorias`, {
        nome: this.novoNome.trim(),
        descricao: this.novaDescricao.trim(),
      })
      .subscribe({
        next: () => {
          this.salvando = false;
          this.fecharModal();
          this.carregarCategorias();
        },
        error: (err) => {
          this.salvando = false;
          if (err.status === 403) {
            this.erroModal = 'Apenas administradores podem cadastrar categorias.';
          } else {
            this.erroModal = err.error?.erro ?? 'Erro ao cadastrar categoria.';
          }
        },
      });
  }
}
