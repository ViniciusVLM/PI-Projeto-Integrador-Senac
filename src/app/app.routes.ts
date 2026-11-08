import { Routes } from '@angular/router';
import { Cadastro } from './helpdesk/cadastro/cadastro';
import { Helpdesk } from './helpdesk/helpdesk';
import { Esquecisenha } from './helpdesk/esquecisenha/esquecisenha';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';
import { Chamados } from './chamados/chamados';
import { Novochamado } from './novochamado/novochamado';
import { DetalhesChamados } from './detalheschamados/detalheschamados';

export const routes: Routes = [
  { path: '', component: Helpdesk },
  { path: 'esquecisenha', component: Esquecisenha },
  { path: 'cadastro', component: Cadastro },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  { path: 'chamados', component: Chamados, canActivate: [authGuard] },
  { path: 'novochamado', component: Novochamado, canActivate: [authGuard] },
  { path: 'detalhes-chamados/:id', component: DetalhesChamados, canActivate: [authGuard] },
  // precisa ser a última rota: qualquer endereço desconhecido volta para o início
  { path: '**', redirectTo: '' },
];
