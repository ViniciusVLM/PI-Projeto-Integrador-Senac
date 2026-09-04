import { Routes } from '@angular/router';
import { Cadastro } from './helpdesk/cadastro/cadastro';
import { Helpdesk } from './helpdesk/helpdesk';
import { Esquecisenha } from './helpdesk/esquecisenha/esquecisenha';

export const routes: Routes = [
  { path: 'esquecisenha', component: Esquecisenha},
  { path: 'cadastro', component: Cadastro },
  { path: '', component: Helpdesk },
];
