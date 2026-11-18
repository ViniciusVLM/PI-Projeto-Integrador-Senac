import { Routes } from '@angular/router';
import { Cadastro } from './helpdesk/cadastro/cadastro';
import { Helpdesk } from './helpdesk/helpdesk';
import { Esquecisenha } from './helpdesk/esquecisenha/esquecisenha';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Helpdesk, title: 'Login | SecureDesk' },
  { path: 'esquecisenha', component: Esquecisenha, title: 'Recuperar Senha | SecureDesk' },
  { path: 'cadastro', component: Cadastro, title: 'Cadastro | SecureDesk' },
  {
    path: 'dashboard',
    component: Dashboard,
    title: 'Dashboard | SecureDesk',
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];