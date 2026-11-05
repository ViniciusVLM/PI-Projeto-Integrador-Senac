import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  imports: [RouterLink, FormsModule, NgIf],
  selector: 'app-helpdesk',
  styleUrl: './helpdesk.css',
  templateUrl: './helpdesk.html',
})
export class Helpdesk {
  email = '';
  senha = '';
  lembrar = true;
  carregando = false;
  erroMensagem = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onLogin(): void {
    this.erroMensagem = '';

    if (!this.email || !this.senha) {
      this.erroMensagem = 'Preencha o e-mail e a senha.';
      return;
    }

    this.carregando = true;

    this.authService.login(this.email, this.senha).subscribe({
      next: () => {
        this.carregando = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.carregando = false;
        if (err.status === 401) {
          this.erroMensagem = 'E-mail ou senha incorretos.';
        } else if (err.status === 0) {
          this.erroMensagem = 'Servidor indisponível. Verifique se o backend está rodando.';
        } else {
          this.erroMensagem = err.error?.erro ?? 'Erro ao realizar login. Tente novamente.';
        }
      },
    });
  }
}