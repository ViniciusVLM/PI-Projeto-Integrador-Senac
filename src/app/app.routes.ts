import { Routes } from '@angular/router';
import { Cadastro } from './helpdesk/cadastro/cadastro';
import { Helpdesk } from './helpdesk/helpdesk';
import { Esquecisenha } from './helpdesk/esquecisenha/esquecisenha';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Helpdesk },
  { path: 'esquecisenha', component: Esquecisenha },
  { path: 'cadastro', component: Cadastro },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
