import { Routes } from '@angular/router';
import { Cadastro } from './helpdesk/cadastro/cadastro';
import { Helpdesk } from './helpdesk/helpdesk';
import { Esquecisenha } from './helpdesk/esquecisenha/esquecisenha';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';
import { Chamados } from './chamados/chamados';
import { Novochamado } from './novochamado/novochamado';
import { DetalhesChamados } from './detalheschamados/detalheschamados';
import { Usuarioslista } from './usuarioslista/usuarioslista';
import { Equipamentoslista } from './equipamentoslista/equipamentoslista';
import { Categorialista } from './categorialista/categorialista';
import { Relatorios } from './relatorios/relatorios';
import { Configuracoes } from './configuracoes/configuracoes';

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
  { path: 'chamados', component: Chamados, title: 'Chamados | SecureDesk', canActivate: [authGuard] },
  { path: 'novochamado', component: Novochamado, title: 'Novo Chamado | SecureDesk', canActivate: [authGuard] },
  { path: 'detalhes-chamados/:id', component: DetalhesChamados, title: 'Detalhes do Chamado | SecureDesk', canActivate: [authGuard] },
  { path: 'usuarios', component: Usuarioslista, title: 'Usuários | SecureDesk', canActivate: [authGuard] },
  { path: 'equipamentos', component: Equipamentoslista, title: 'Equipamentos | SecureDesk', canActivate: [authGuard] },
  { path: 'categorias', component: Categorialista, title: 'Categorias | SecureDesk', canActivate: [authGuard] },
  { path: 'relatorios', component: Relatorios, title: 'Relatórios | SecureDesk', canActivate: [authGuard] },
  { path: 'configuracoes', component: Configuracoes, title: 'Configurações | SecureDesk', canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];