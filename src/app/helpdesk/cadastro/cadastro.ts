import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-cadastro',
  imports: [RouterLink, FormsModule, NgIf],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css',
})
export class Cadastro {
  email = '';
  senha = '';
  confirmarSenha = '';
  mostrarSenha = false;
  mostrarConfirmarSenha = false;
  carregando = false;
  erroMensagem = '';
  sucessoMensagem = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  alternarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  alternarConfirmarSenha(): void {
    this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha;
  }

  onCadastrar(): void {
    this.erroMensagem = '';
    this.sucessoMensagem = '';

    if (!this.email || !this.senha || !this.confirmarSenha) {
      this.erroMensagem = 'Preencha todos os campos obrigatórios.';
      return;
    }

    if (this.senha !== this.confirmarSenha) {
      this.erroMensagem = 'As senhas informadas não coincidem.';
      return;
    }

    if (this.senha.length < 6) {
      this.erroMensagem = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }

    this.carregando = true;

    this.authService.cadastrar({
      email: this.email,
      senha: this.senha,
      confirmarSenha: this.confirmarSenha,
    }).subscribe({
      next: (resp) => {
        this.carregando = false;
        this.sucessoMensagem = resp.mensagem || 'Conta criada com sucesso! Redirecionando...';
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1500);
      },
      error: (err) => {
        this.carregando = false;
        if (err.status === 409) {
          this.erroMensagem = 'Já existe uma conta cadastrada com este e-mail.';
        } else if (err.status === 0) {
          this.erroMensagem = 'Servidor indisponível. Verifique se o backend está rodando.';
        } else {
          this.erroMensagem = err.error?.erro ?? 'Erro ao criar conta. Tente novamente.';
        }
      },
    });
  }
}
