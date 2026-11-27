import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { Sidebar } from '../sidebar/sidebar';

interface CategoriaOpcao {
  id: number;
  nome: string;
  descricao?: string;
  icone?: string;
  slaHoras?: number;
  status?: string;
}

interface EquipamentoOpcao {
  id: number;
  nome: string;
  patrimonio: string;
  tipo: string;
  status: string;
}

interface UsuarioOpcao {
  id: number;
  nome: string;
  departamento?: string | null;
  status?: string;
}

const API_URL = '/api';
const LIMITE = 10 * 1024 * 1024;

@Component({
  selector: 'app-novochamado',
  imports: [RouterLink, ReactiveFormsModule, Sidebar],
  templateUrl: './novochamado.html',
  styleUrl: './novochamado.css',
})
export class Novochamado implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  categorias: CategoriaOpcao[] = [];
  equipamentos: EquipamentoOpcao[] = [];
  usuarios: UsuarioOpcao[] = [];
  prioridades = ['Baixa', 'Média', 'Alta', 'Crítica'];
  anexos: File[] = [];
  enviando = false;
  erro = '';

  readonly slaPorPrioridade: Record<string, number> = {
    'Crítica': 4,
    'Alta': 8,
    'Média': 24,
    'Baixa': 48,
  };

  form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(5)]],
    descricao: ['', [Validators.required, Validators.minLength(10)]],
    categoriaId: ['', Validators.required],
    prioridade: ['Média', Validators.required],
    equipamentoId: [''],
    solicitanteId: [''],
  });

  get podeEscolherSolicitante(): boolean {
    return this.authService.temPerfil('tecnico', 'admin');
  }

  ngOnInit(): void {
    const eqQuery = this.route.snapshot.queryParamMap.get('equipamentoId');
    if (eqQuery) {
      this.form.patchValue({ equipamentoId: eqQuery });
    }

    this.http.get<CategoriaOpcao[]>(`${API_URL}/categorias?status=Ativa`).subscribe({
      next: (d) => (this.categorias = d),
      error: () => {},
    });

    this.http.get<EquipamentoOpcao[]>(`${API_URL}/equipamentos`).subscribe({
      next: (d) => (this.equipamentos = d.filter((e) => e.status !== 'Inativo')),
      error: () => {},
    });

    if (this.podeEscolherSolicitante) {
      this.http.get<UsuarioOpcao[]>(`${API_URL}/usuarios?status=Ativo`).subscribe({
        next: (lista) => (this.usuarios = lista),
        error: () => {},
      });
    }
  }

  get prazoEstimadoHoras(): number {
    const prio = this.form.controls.prioridade.value;
    return this.slaPorPrioridade[prio] || 24;
  }

  selecionarArquivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const novos = input.files ? Array.from(input.files) : [];

    if (novos.some((a) => a.size > LIMITE)) {
      this.erro = 'Cada arquivo anexado deve ter no máximo 10MB.';
      input.value = '';
      return;
    }

    const combinados = [...this.anexos, ...novos].slice(0, 5);
    this.erro = '';
    this.anexos = combinados;
    input.value = '';
  }

  removerArquivo(index: number): void {
    this.anexos = this.anexos.filter((_, i) => i !== index);
  }

  formatarTamanho(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    if (v.solicitanteId && this.podeEscolherSolicitante) {
      dados.append('solicitanteId', v.solicitanteId);
    }
    this.anexos.forEach((f) => dados.append('anexos', f));

    this.http.post<{ id: number }>(`${API_URL}/chamados`, dados).subscribe({
      next: (criado) => this.router.navigate(['/detalhes-chamados', criado.id]),
      error: (err) => {
        this.erro = err.error?.erro || 'Não foi possível abrir o chamado. Tente novamente.';
        this.enviando = false;
      },
    });
  }
}
