import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cadastro',
  imports: [RouterLink],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css',
})
export class Cadastro {
  mostrarSenha = false;
  mostrarConfirmarSenha = false;

  alternarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  alternarConfirmarSenha(): void {
    this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha;
  }
}