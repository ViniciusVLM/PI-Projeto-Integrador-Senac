/**
 * Funções utilitárias de interface compartilhadas entre as telas do SecureDesk.
 */

export function extrairIniciais(nome?: string | null): string {
  const limpo = (nome || '').trim();
  if (!limpo) return 'SD';
  const partes = limpo.split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function formatarStatusChamado(status?: string | null): string {
  const s = (status || '').trim();
  if (!s) return '—';
  const mapa: Record<string, string> = {
    'ABERTO': 'Aberto',
    'EM ANÁLISE': 'Em análise',
    'EM ATENDIMENTO': 'Em atendimento',
    'AGUARDANDO USUÁRIO': 'Aguardando usuário',
    'RESOLVIDO': 'Resolvido',
    'ENCERRADO': 'Encerrado',
    'CANCELADO': 'Cancelado',
  };
  return mapa[s.toUpperCase()] || s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function classeBadgeStatus(status?: string | null): string {
  const n = (status || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (n.includes('analise')) return 'sd-status-analise';
  if (n.includes('atendimento') || n.includes('andamento')) return 'sd-status-andamento';
  if (n.includes('aguardando')) return 'sd-status-aguardando';
  if (n.includes('resolvid')) return 'sd-status-resolvido';
  if (n.includes('abert')) return 'sd-status-aberto';
  if (n.includes('cancel')) return 'sd-status-cancelado';
  return 'sd-status-encerrado';
}

export function classeBadgePrioridade(prioridade?: string | null): string {
  const n = (prioridade || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (n.includes('crit')) return 'sd-prio-critica';
  if (n.includes('alta')) return 'sd-prio-alta';
  if (n.includes('media')) return 'sd-prio-media';
  return 'sd-prio-baixa';
}

export function classeSla(situacao?: string | null): string {
  if (situacao === 'vencido' || situacao === 'concluido_atrasado') return 'sd-sla-overdue';
  if (situacao === 'atencao') return 'sd-sla-warn';
  if (situacao === 'no_prazo' || situacao === 'concluido_no_prazo') return 'sd-sla-ok';
  return 'sd-sla-neutral';
}

export function textoResumoSla(sla?: {
  situacao: string;
  rotulo: string;
  horasRestantes: number | null;
  prazoHoras: number;
} | null): string {
  if (!sla) return '—';
  if (sla.situacao === 'vencido' && sla.horasRestantes !== null) {
    const atraso = Math.abs(Math.round(sla.horasRestantes));
    return atraso > 0 ? `Vencido há ${atraso}h` : 'SLA vencido';
  }
  if ((sla.situacao === 'atencao' || sla.situacao === 'no_prazo') && sla.horasRestantes !== null) {
    if (sla.horasRestantes < 1) {
      return `${Math.max(5, Math.round(sla.horasRestantes * 60))}min restantes`;
    }
    return `${Math.round(sla.horasRestantes)}h restantes`;
  }
  return sla.rotulo;
}

export function tempoRelativoCurto(data?: string | null): string {
  if (!data) return '—';
  const diffMin = Math.floor((Date.now() - new Date(data).getTime()) / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `Há ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `Há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  const m = Math.floor(d / 30);
  return `Há ${m} ${m === 1 ? 'mês' : 'meses'}`;
}

export function iconeEquipamentoPorTipo(tipo?: string | null): string {
  const mapa: Record<string, string> = {
    'Notebook': 'ti-device-laptop',
    'Desktop': 'ti-device-desktop',
    'Monitor': 'ti-device-desktop-analytics',
    'Impressora': 'ti-printer',
    'Roteador': 'ti-router',
    'Switch': 'ti-network',
    'Smartphone': 'ti-device-mobile',
    'Outro': 'ti-cpu',
  };
  return mapa[tipo || ''] || 'ti-devices';
}

/**
 * Fallback obrigatório para light-dismiss em navegadores que ainda não suportam <dialog closedby="any">
 * (modern-web-guidance: light-dismiss-a-dialog).
 */
export function registrarLightDismissFallback(dialog: HTMLDialogElement | null | undefined): void {
  if (!dialog || typeof HTMLDialogElement === 'undefined') return;
  if ('closedBy' in HTMLDialogElement.prototype) return;
  if ((dialog as any).__sdLightDismissBound) return;
  (dialog as any).__sdLightDismissBound = true;

  dialog.addEventListener('click', (event: MouseEvent) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const dentroDoConteudo =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (dentroDoConteudo) return;
    dialog.close();
  });
}
