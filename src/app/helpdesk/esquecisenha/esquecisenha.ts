import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-esquecisenha',
  imports: [RouterLink, FormsModule, NgIf],
  templateUrl: './esquecisenha.html',
  styleUrl: './esquecisenha.css',
})
export class Esquecisenha {
  email = '';
  novaSenha = '';
  confirmarSenha = '';
  mostrarNovaSenha = false;
  mostrarConfirmarSenha = false;
  carregando = false;
  erroMensagem = '';
  sucessoMensagem = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  alternarNovaSenha(): void {
    this.mostrarNovaSenha = !this.mostrarNovaSenha;
  }

  alternarConfirmarSenha(): void {
    this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha;
  }

  onRedefinirSenha(): void {
    this.erroMensagem = '';
    this.sucessoMensagem = '';

    if (!this.email || !this.novaSenha || !this.confirmarSenha) {
      this.erroMensagem = 'Preencha todos os campos obrigatórios.';
      return;
    }

    if (this.novaSenha !== this.confirmarSenha) {
      this.erroMensagem = 'As senhas informadas não coincidem.';
      return;
    }

    if (this.novaSenha.length < 6) {
      this.erroMensagem = 'A nova senha deve ter pelo menos 6 caracteres.';
      return;
    }

    this.carregando = true;

    this.authService.esqueciSenha({
      email: this.email,
      novaSenha: this.novaSenha,
      confirmarSenha: this.confirmarSenha,
    }).subscribe({
      next: (resp) => {
        this.carregando = false;
        this.sucessoMensagem = resp.mensagem || 'Senha redefinida com sucesso! Redirecionando...';
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1500);
      },
      error: (err) => {
        this.carregando = false;
        if (err.status === 404) {
          this.erroMensagem = 'Nenhum usuário encontrado com este e-mail.';
        } else if (err.status === 0) {
          this.erroMensagem = 'Servidor indisponível. Verifique se o backend está rodando.';
        } else {
          this.erroMensagem = err.error?.erro ?? 'Erro ao redefinir senha. Tente novamente.';
        }
      },
    });
  }
}
