import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

interface ChamadoDetalhe {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  categoriaNome: string;
  equipamentoNome?: string;
  solicitanteNome?: string;
  tecnicoNome?: string;
  dataAbertura: string;
  dataAtualizacao?: string;
}

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-detalheschamados',
  imports: [RouterLink, DatePipe],
  templateUrl: './detalheschamados.html',
  styleUrl: './detalheschamados.css',
})
export class DetalhesChamados implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  chamado: ChamadoDetalhe | null = null;
  carregando = true;
  erro = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<ChamadoDetalhe>(`${API_URL}/chamados/${id}`).subscribe({
      next: (c) => {
        this.chamado = c;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Chamado não encontrado.';
        this.carregando = false;
      },
    });
  }

  classe(valor: string): string {
    const v = (valor || '').toLowerCase();
    if (v.includes('abert')) return 'aberto';
    if (v.includes('andamento')) return 'andamento';
    if (v.includes('resolvid')) return 'resolvido';
    if (v.includes('cancel')) return 'cancelado';
    if (v.includes('cr')) return 'critica';
    if (v.includes('alta')) return 'alta';
    if (v.includes('m')) return 'media';
    if (v.includes('baixa')) return 'baixa';
    return '';
  }
}