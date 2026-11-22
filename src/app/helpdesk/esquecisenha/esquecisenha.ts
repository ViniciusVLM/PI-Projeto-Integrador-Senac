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
  codigo = '';
  novaSenha = '';
  confirmarSenha = '';
  codigoEnviado = false;
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

  // O mesmo botão faz as duas etapas: primeiro pede o código, depois troca a senha
  onRedefinirSenha(): void {
    if (this.codigoEnviado) {
      this.trocarSenha();
    } else {
      this.pedirCodigo();
    }
  }

  // Etapa 1: a API gera um código de 6 dígitos (o envio de e-mail é simulado)
  pedirCodigo(): void {
    this.erroMensagem = '';
    this.sucessoMensagem = '';

    if (!this.email) {
      this.erroMensagem = 'Informe o seu e-mail institucional.';
      return;
    }

    this.carregando = true;

    this.authService.esqueciSenha(this.email).subscribe({
      next: () => {
        this.carregando = false;
        this.codigoEnviado = true;
        this.sucessoMensagem = 'Enviamos um código de 6 dígitos para o seu e-mail. Ele vale por 15 minutos.';
      },
      error: (err) => {
        this.carregando = false;
        this.erroMensagem = this.mensagemDeErro(err);
      },
    });
  }

  // Etapa 2: confere o código e grava a nova senha
  trocarSenha(): void {
    this.erroMensagem = '';
    this.sucessoMensagem = '';

    if (!this.codigo || !this.novaSenha || !this.confirmarSenha) {
      this.erroMensagem = 'Preencha o código e a nova senha.';
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

    this.authService.redefinirSenha({
      email: this.email,
      codigo: this.codigo,
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
        this.erroMensagem = this.mensagemDeErro(err);
      },
    });
  }

  private mensagemDeErro(err: any): string {
    if (err.status === 0) {
      return 'Servidor indisponível. Verifique se o backend está rodando.';
    }
    return err.error?.erro ?? 'Não foi possível concluir. Tente novamente.';
  }
}
