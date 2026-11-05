import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

interface Opcao { id: number; nome: string; }

const API_URL = 'http://localhost:3000/api';
const LIMITE = 10 * 1024 * 1024;

@Component({
  selector: 'app-novochamado',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './novochamado.html',
  styleUrl: './novochamado.css',
})
export class Novochamado implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  categorias: Opcao[] = [];
  equipamentos: Opcao[] = [];
  prioridades = ['Baixa', 'Média', 'Alta', 'Crítica'];
  anexos: File[] = [];
  enviando = false;
  erro = '';

  form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(5)]],
    descricao: ['', [Validators.required, Validators.minLength(10)]],
    categoriaId: ['', Validators.required],
    prioridade: ['Média', Validators.required],
    equipamentoId: [''],
  });

  ngOnInit(): void {
    this.http.get<Opcao[]>(`${API_URL}/categorias`).subscribe({ next: (d) => (this.categorias = d), error: () => {} });
    this.http.get<Opcao[]>(`${API_URL}/equipamentos`).subscribe({ next: (d) => (this.equipamentos = d), error: () => {} });
  }

  get textoAnexos(): string {
    return this.anexos.length
      ? this.anexos.map((a) => a.name).join(', ')
      : 'Nenhum arquivo selecionado (Limite: 10MB por arquivo)';
  }

  selecionarArquivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivos = input.files ? Array.from(input.files) : [];

    if (arquivos.some((a) => a.size > LIMITE)) {
      this.erro = 'Cada arquivo deve ter no máximo 10MB.';
      input.value = '';
      this.anexos = [];
      return;
    }
    this.erro = '';
    this.anexos = arquivos;
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando = true;
    this.erro = '';

    const v = this.form.getRawValue();
    const dados = new FormData();
    dados.append('titulo', v.titulo);
    dados.append('descricao', v.descricao);
    dados.append('categoriaId', v.categoriaId);
    dados.append('prioridade', v.prioridade);
    if (v.equipamentoId) dados.append('equipamentoId', v.equipamentoId);
    this.anexos.forEach((f) => dados.append('anexos', f));

    this.http.post(`${API_URL}/chamados`, dados).subscribe({
      next: () => this.router.navigate(['/chamados']),
      error: () => {
        this.erro = 'Não foi possível abrir o chamado. Tente novamente.';
        this.enviando = false;
      },
    });
  }
}