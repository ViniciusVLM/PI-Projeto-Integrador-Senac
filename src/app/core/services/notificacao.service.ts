import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface NotificacaoItem {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  chamadoId: number | null;
  lida: boolean;
  criadaEm: string;
}

interface NotificacoesResposta {
  naoLidas: number;
  itens: NotificacaoItem[];
}

const API_URL = '/api';

@Injectable({
  providedIn: 'root',
})
export class NotificacaoService {
  private http = inject(HttpClient);

  readonly naoLidas = signal(0);
  readonly itens = signal<NotificacaoItem[]>([]);

  carregar(): void {
    this.http.get<NotificacoesResposta>(`${API_URL}/notificacoes`).subscribe({
      next: (resp) => {
        this.naoLidas.set(resp.naoLidas || 0);
        this.itens.set(resp.itens || []);
      },
      error: () => {},
    });
  }

  marcarComoLida(id: number): void {
    this.http.patch(`${API_URL}/notificacoes/${id}/lida`, {}).subscribe({
      next: () => {
        this.itens.update((lista) => lista.map((n) => (n.id === id ? { ...n, lida: true } : n)));
        this.naoLidas.update((n) => Math.max(0, n - 1));
      },
      error: () => {},
    });
  }

  marcarTodasComoLidas(): void {
    this.http.patch(`${API_URL}/notificacoes/ler-todas`, {}).subscribe({
      next: () => {
        this.itens.update((lista) => lista.map((n) => ({ ...n, lida: true })));
        this.naoLidas.set(0);
      },
      error: () => {},
    });
  }
}
