import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Sidebar } from '../sidebar/sidebar';
import { extrairIniciais } from '../core/utils/ui.utils';

interface Opcao {
  id: number;
  nome: string;
}

interface ItemMes {
  mes: string;
  rotulo: string;
  total: number;
}

interface ItemCategoria {
  categoriaId: number;
  categoriaNome: string;
  total: number;
}

interface ItemTecnico {
  tecnicoId: number | null;
  tecnicoNome: string;
  tecnicoAvatar?: string | null;
  tecnicoDepartamento?: string | null;
  atendidos: number;
  resolvidos: number;
  taxaResolucao: number;
  tempoMedioResolucaoHoras: number | null;
  notaMedia?: number | null;
}

interface RelatorioDados {
  totalChamados: number;
  chamadosResolvidos: number;
  taxaResolucao: number;
  conformidadeSla?: number;
  tempoMedioResolucaoHoras: number | null;
  porMes: ItemMes[];
  porCategoria: ItemCategoria[];
  porTecnico: ItemTecnico[];
  geradoEm: string;
}

const API_URL = '/api';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [FormsModule, Sidebar],
  templateUrl: './relatorios.html',
  styleUrl: './relatorios.css',
})
export class Relatorios implements OnInit {
  private http = inject(HttpClient);

  dados: RelatorioDados | null = null;
  categorias: Opcao[] = [];
  tecnicos: Opcao[] = [];

  meses = '6';
  categoriaId = '';
  tecnicoId = '';
  status = '';

  readonly iniciais = extrairIniciais;

  statusOpcoes = [
    { valor: 'ABERTO', nome: 'Aberto' },
    { valor: 'EM ANÁLISE', nome: 'Em análise' },
    { valor: 'EM ATENDIMENTO', nome: 'Em atendimento' },
    { valor: 'AGUARDANDO USUÁRIO', nome: 'Aguardando usuário' },
    { valor: 'RESOLVIDO', nome: 'Resolvido' },
    { valor: 'ENCERRADO', nome: 'Encerrado' },
    { valor: 'CANCELADO', nome: 'Cancelado' },
  ];

  carregando = true;
  exportando = false;
  erro = '';
  semPermissao = false;

  ngOnInit(): void {
    this.http.get<Opcao[]>(`${API_URL}/categorias`).subscribe({
      next: (lista) => (this.categorias = lista),
      error: () => {},
    });

    this.http.get<Opcao[]>(`${API_URL}/usuarios/tecnicos`).subscribe({
      next: (lista) => (this.tecnicos = lista),
      error: () => {},
    });

    this.carregarRelatorio();
  }

  private montarParametros(): Record<string, string> {
    const params: Record<string, string> = { meses: this.meses };
    if (this.categoriaId) params['categoriaId'] = this.categoriaId;
    if (this.tecnicoId) params['tecnicoId'] = this.tecnicoId;
    if (this.status) params['status'] = this.status;
    return params;
  }

  carregarRelatorio(): void {
    this.carregando = true;
    this.erro = '';
    this.semPermissao = false;

    this.http
      .get<RelatorioDados>(`${API_URL}/relatorios`, { params: this.montarParametros() })
      .subscribe({
        next: (resp) => {
          this.dados = resp;
          this.carregando = false;
        },
        error: (err) => {
          this.carregando = false;
          if (err.status === 403) {
            this.semPermissao = true;
            this.erro = 'Acesso restrito: apenas técnicos e administradores podem consultar relatórios gerenciais.';
          } else if (err.status === 0) {
            this.erro = 'Não foi possível conectar ao servidor. Execute: npm run server';
          } else {
            this.erro = err.error?.erro ?? 'Erro ao carregar os dados do relatório.';
          }
        },
      });
  }

  exportarCsv(): void {
    if (this.exportando || this.semPermissao) return;
    this.exportando = true;

    this.http
      .get(`${API_URL}/relatorios/exportar`, {
        params: this.montarParametros(),
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          this.exportando = false;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `relatorio-chamados-${new Date().toISOString().slice(0, 10)}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.exportando = false;
        },
      });
  }

  alturaBarraMes(total: number): number {
    const lista = this.dados?.porMes ?? [];
    const maior = Math.max(1, ...lista.map((m) => m.total));
    return Math.max(4, Math.round((total / maior) * 100));
  }

  larguraCategoria(total: number): number {
    const lista = this.dados?.porCategoria ?? [];
    const maior = Math.max(1, ...lista.map((c) => c.total));
    return Math.max(6, Math.round((total / maior) * 100));
  }

  formatarTempo(horas: number | null | undefined): string {
    if (horas === null || horas === undefined) return '—';
    const totalMinutos = Math.round(horas * 60);
    const h = Math.floor(totalMinutos / 60);
    const min = totalMinutos % 60;
    if (h === 0) return `${min}min`;
    if (min === 0) return `${h}h`;
    return `${h}h ${min}min`;
  }
}
