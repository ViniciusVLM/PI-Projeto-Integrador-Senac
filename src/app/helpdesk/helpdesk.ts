import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';

interface ContaDemo {
  nome: string;
  papel: string;
  email: string;
  avatar: string;
}

@Component({
  imports: [RouterLink, FormsModule],
  selector: 'app-helpdesk',
  styleUrl: './helpdesk.css',
  templateUrl: './helpdesk.html',
})
export class Helpdesk {
  email = '';
  senha = '';
  mostrarSenha = false;
  lembrar = true;
  carregando = false;
  erroMensagem = '';

  readonly contasDemo: ContaDemo[] = [
    {
      nome: 'Carlos Lima',
      papel: 'Administrador',
      email: 'carlos.lima@empresa.com',
      avatar: 'img/avatars/avatar-3.jpg',
    },
    {
      nome: 'Fernanda Souza',
      papel: 'Técnico N2',
      email: 'fernanda.souza@empresa.com',
      avatar: 'img/avatars/avatar-2.jpg',
    },
    {
      nome: 'João Silva',
      papel: 'Solicitante',
      email: 'joao.silvia@empresa.com',
      avatar: 'img/avatars/avatar-1.jpg',
    },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  alternarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  preencherDemo(conta: ContaDemo): void {
    this.email = conta.email;
    this.senha = '123456';
    this.erroMensagem = '';
  }

  onLogin(): void {
    this.erroMensagem = '';

    if (!this.email.trim() || !this.senha) {
      this.erroMensagem = 'Preencha seu e-mail institucional e a senha.';
      return;
    }

    this.carregando = true;

    this.authService.login(this.email.trim(), this.senha).subscribe({
      next: () => {
        this.carregando = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.carregando = false;
        if (err.status === 401) {
          this.erroMensagem = 'Credenciais incorretas ou conta inativa.';
        } else if (err.status === 0) {
          this.erroMensagem = 'Servidor indisponível. Inicie a API com: npm run server';
        } else {
          this.erroMensagem = err.error?.erro ?? 'Erro ao realizar login. Tente novamente.';
        }
      },
    });
  }
}
