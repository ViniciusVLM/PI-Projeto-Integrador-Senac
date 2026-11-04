import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { AuthService, UsuarioPerfil } from '../core/services/auth.service';

interface Metricas {
  totalChamados: number;
  prioridadeAltaCritica: number;
  chamadosAbertos: number;
  chamadosEmAndamento: number;
  chamadosResolvidos: number;
  chamadosCancelados: number;
  porCategoria: { categoriaId: number; categoriaNome: string; total: number }[];
  porStatus: { status: string; total: number }[];
  porPrioridade: { prioridade: string; total: number }[];
  recentes: {
    id: number;
    titulo: string;
    status: string;
    prioridade: string;
    categoriaNome: string;
    tecnicoNome: string;
    dataAbertura: string;
  }[];
  geradoEm: string;
}

const API_URL = 'http://localhost:3000/api';

@Component({
  selector: 'app-dashboard',
  imports: [NgIf, NgFor, DatePipe],
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  usuario: UsuarioPerfil | null = null;
  metricas: Metricas | null = null;
  carregando = true;
  erro = '';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
    this.carregarMetricas();
  }

  carregarMetricas(): void {
    this.carregando = true;
    this.erro = '';
    this.http.get<Metricas>(`${API_URL}/dashboard/metricas`).subscribe({
      next: (dados) => {
        this.metricas = dados;
        this.carregando = false;
      },
      error: (err) => {
        this.carregando = false;
        if (err.status === 0) {
          this.erro = 'Não foi possível conectar ao servidor. Execute: npm run server';
        } else {
          this.erro = 'Erro ao carregar métricas.';
        }
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  getPerfilLabel(): string {
    const mapa: Record<string, string> = {
      admin: 'Administrador',
      tecnico: 'Técnico',
      cliente: 'Usuário',
    };
    return mapa[this.usuario?.perfil ?? ''] ?? this.usuario?.perfil ?? '';
  }

  getStatusClass(status: string): string {
    const mapa: Record<string, string> = {
      'ABERTO': 'badge-aberto',
      'EM ANÁLISE': 'badge-analise',
      'EM ATENDIMENTO': 'badge-atendimento',
      'AGUARDANDO USUÁRIO': 'badge-aguardando',
      'RESOLVIDO': 'badge-resolvido',
      'ENCERRADO': 'badge-encerrado',
      'CANCELADO': 'badge-cancelado',
    };
    return mapa[status] ?? 'badge-default';
  }

  getPrioridadeClass(prioridade: string): string {
    const mapa: Record<string, string> = {
      'Baixa': 'prioridade-baixa',
      'Média': 'prioridade-media',
      'Alta': 'prioridade-alta',
      'Crítica': 'prioridade-critica',
    };
    return mapa[prioridade] ?? '';
  }
}
