import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-esquecisenha',
  imports: [RouterLink, FormsModule],
  templateUrl: './esquecisenha.html',
  styleUrl: './esquecisenha.css',
})
export class Esquecisenha {
  email = '';
  codigo = '';
  novaSenha = '';
  confirmarSenha = '';
  codigoEnviado = false;
  smtpRealAtivo = false;
  mostrarNovaSenha = false;
  mostrarConfirmarSenha = false;
  carregando = false;
  erroMensagem = '';
  sucessoMensagem = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  alternarNovaSenha(): void {
    this.mostrarNovaSenha = !this.mostrarNovaSenha;
  }

  alternarConfirmarSenha(): void {
    this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha;
  }

  voltarEtapaEmail(): void {
    this.codigoEnviado = false;
    this.codigo = '';
    this.erroMensagem = '';
    this.sucessoMensagem = '';
  }

  onRedefinirSenha(): void {
    if (this.codigoEnviado) {
      this.trocarSenha();
    } else {
      this.pedirCodigo();
    }
  }

  pedirCodigo(): void {
    this.erroMensagem = '';
    this.sucessoMensagem = '';

    if (!this.email.trim()) {
      this.erroMensagem = 'Informe o seu e-mail institucional.';
      return;
    }

    this.carregando = true;

    this.authService.esqueciSenha(this.email.trim()).subscribe({
      next: (resp) => {
        this.carregando = false;
        this.codigoEnviado = true;
        this.smtpRealAtivo = Boolean(resp.smtpAtivo);
        this.sucessoMensagem = this.smtpRealAtivo
          ? 'Enviamos um código de 6 dígitos para sua caixa de e-mail (válido por 15 minutos).'
          : 'Código de 6 dígitos gerado (válido por 15 min). Como o SMTP externo ainda não foi ativado, consulte o log do servidor ou configure o SMTP em Configurações.';
      },
      error: (err) => {
        this.carregando = false;
        this.erroMensagem = this.mensagemDeErro(err);
      },
    });
  }

  trocarSenha(): void {
    this.erroMensagem = '';
    this.sucessoMensagem = '';

    if (!this.codigo.trim() || !this.novaSenha || !this.confirmarSenha) {
      this.erroMensagem = 'Preencha o código de verificação e a nova senha.';
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

    this.authService
      .redefinirSenha({
        email: this.email.trim(),
        codigo: this.codigo.trim(),
        novaSenha: this.novaSenha,
        confirmarSenha: this.confirmarSenha,
      })
      .subscribe({
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
    return err.error?.erro ?? 'Não foi possível concluir a solicitação. Tente novamente.';
  }
}
