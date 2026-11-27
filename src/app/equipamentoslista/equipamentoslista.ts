import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { Sidebar } from '../sidebar/sidebar';
import {
  extrairIniciais,
  iconeEquipamentoPorTipo,
  registrarLightDismissFallback,
} from '../core/utils/ui.utils';

interface EquipamentoApi {
  id: number;
  tipo: string;
  nome: string;
  marca?: string | null;
  modelo?: string | null;
  patrimonio: string;
  localizacao?: string | null;
  numeroSerie?: string | null;
  usuarioId?: number | null;
  usuarioNome?: string | null;
  usuarioAvatar?: string | null;
  usuarioDepartamento?: string | null;
  imagemUrl?: string;
  chamadosAbertos?: number;
  status: 'Ativo' | 'Em manutenção' | 'Inativo';
}

interface UsuarioOpcao {
  id: number;
  nome: string;
  departamento?: string | null;
}

type FiltroAtivo = 'todos' | 'computadores' | 'rede_impressao' | 'manutencao' | 'estoque';

const API_URL = '/api';

@Component({
  selector: 'app-equipamentoslista',
  standalone: true,
  imports: [FormsModule, RouterLink, Sidebar],
  templateUrl: './equipamentoslista.html',
  styleUrl: './equipamentoslista.css',
})
export class Equipamentoslista implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  @ViewChild('dialogEquipRef') dialogEquipRef?: ElementRef<HTMLDialogElement>;

  equipamentos = signal<EquipamentoApi[]>([]);
  usuariosOpcoes: UsuarioOpcao[] = [];
  busca = signal('');
  abaFiltro = signal<FiltroAtivo>('todos');

  tiposValidos = ['Notebook', 'Desktop', 'Monitor', 'Impressora', 'Roteador', 'Switch', 'Smartphone', 'Outro'];
  statusValidos: ('Ativo' | 'Em manutenção' | 'Inativo')[] = ['Ativo', 'Em manutenção', 'Inativo'];

  editandoId: number | null = null;
  salvando = false;
  erroModal = '';
  feedbackSucesso = '';

  formTipo = 'Notebook';
  formMarca = '';
  formModelo = '';
  formPatrimonio = '';
  formLocalizacao = '';
  formNumeroSerie = '';
  formUsuarioId = '';
  formStatus: 'Ativo' | 'Em manutenção' | 'Inativo' = 'Ativo';

  readonly iniciais = extrairIniciais;
  readonly iconeTipo = iconeEquipamentoPorTipo;

  get ehAdmin(): boolean {
    return this.authService.temPerfil('admin');
  }

  ngOnInit(): void {
    this.carregarEquipamentos();
    if (this.authService.temPerfil('admin', 'tecnico')) {
      this.http.get<UsuarioOpcao[]>(`${API_URL}/usuarios?status=Ativo`).subscribe({
        next: (lista) => (this.usuariosOpcoes = lista),
        error: () => {},
      });
    }
  }

  carregarEquipamentos(): void {
    this.http.get<EquipamentoApi[]>(`${API_URL}/equipamentos`).subscribe({
      next: (lista) => this.equipamentos.set(lista),
      error: () => {},
    });
  }

  totalPorStatus(st: string): number {
    return this.equipamentos().filter((e) => e.status === st).length;
  }

  get totalEmEstoque(): number {
    return this.equipamentos().filter((e) => !e.usuarioId && e.status === 'Ativo').length;
  }

  private passaAba(e: EquipamentoApi, aba: FiltroAtivo): boolean {
    switch (aba) {
      case 'computadores':
        return ['Notebook', 'Desktop', 'Monitor', 'Smartphone'].includes(e.tipo);
      case 'rede_impressao':
        return ['Impressora', 'Roteador', 'Switch'].includes(e.tipo);
      case 'manutencao':
        return e.status === 'Em manutenção';
      case 'estoque':
        return !e.usuarioId && e.status === 'Ativo';
      default:
        return true;
    }
  }

  filtrados = computed(() => {
    const termo = this.busca().toLowerCase().trim();
    const aba = this.abaFiltro();
    return this.equipamentos()
      .filter((e) => this.passaAba(e, aba))
      .filter((e) =>
        `${e.nome} ${e.tipo} ${e.patrimonio} ${e.usuarioNome || ''} ${e.localizacao || ''} ${e.numeroSerie || ''}`
          .toLowerCase()
          .includes(termo)
      );
  });

  onBusca(event: Event): void {
    this.busca.set((event.target as HTMLInputElement).value);
  }

  classeStatus(status: string): string {
    if (status === 'Ativo') return 'sd-status-aberto';
    if (status === 'Em manutenção') return 'sd-status-andamento';
    return 'sd-status-encerrado';
  }

  abrirModalNovo(): void {
    this.editandoId = null;
    this.formTipo = 'Notebook';
    this.formMarca = '';
    this.formModelo = '';
    this.formPatrimonio = '';
    this.formLocalizacao = '';
    this.formNumeroSerie = '';
    this.formUsuarioId = '';
    this.formStatus = 'Ativo';
    this.erroModal = '';
    this.abrirDialog();
  }

  abrirModalEditar(e: EquipamentoApi): void {
    this.editandoId = e.id;
    this.formTipo = e.tipo;
    this.formMarca = e.marca || '';
    this.formModelo = e.modelo || '';
    this.formPatrimonio = e.patrimonio;
    this.formLocalizacao = e.localizacao || '';
    this.formNumeroSerie = e.numeroSerie || '';
    this.formUsuarioId = e.usuarioId ? String(e.usuarioId) : '';
    this.formStatus = e.status;
    this.erroModal = '';
    this.abrirDialog();
  }

  private abrirDialog(): void {
    const dlg = this.dialogEquipRef?.nativeElement;
    if (dlg && !dlg.open) {
      registrarLightDismissFallback(dlg);
      dlg.showModal();
    }
  }

  fecharModal(): void {
    this.dialogEquipRef?.nativeElement.close();
    this.erroModal = '';
  }

  salvarEquipamento(): void {
    this.erroModal = '';
    if (!this.formTipo || !this.formMarca.trim() || !this.formModelo.trim() || !this.formPatrimonio.trim()) {
      this.erroModal = 'Preencha tipo, marca, modelo e código de patrimônio.';
      return;
    }

    this.salvando = true;
    const payload = {
      tipo: this.formTipo,
      marca: this.formMarca.trim(),
      modelo: this.formModelo.trim(),
      patrimonio: this.formPatrimonio.trim(),
      localizacao: this.formLocalizacao.trim() || null,
      numeroSerie: this.formNumeroSerie.trim() || null,
      usuarioId: this.formUsuarioId ? Number(this.formUsuarioId) : null,
      status: this.formStatus,
    };

    const req$ = this.editandoId
      ? this.http.put<EquipamentoApi>(`${API_URL}/equipamentos/${this.editandoId}`, payload)
      : this.http.post<EquipamentoApi>(`${API_URL}/equipamentos`, payload);

    req$.subscribe({
      next: () => {
        this.salvando = false;
        this.feedbackSucesso = this.editandoId
          ? 'Ativo de TI atualizado com sucesso.'
          : 'Novo equipamento incorporado ao inventário.';
        this.fecharModal();
        this.carregarEquipamentos();
      },
      error: (err) => {
        this.salvando = false;
        this.erroModal = err.error?.erro ?? 'Erro ao salvar equipamento.';
      },
    });
  }
}
