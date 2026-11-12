import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-esquecisenha',
  imports: [RouterLink],
  templateUrl: './esquecisenha.html',
  styleUrl: './esquecisenha.css',
})
export class Esquecisenha {
  mostrarSenha = false;
  mostrarConfirmarSenha = false;

  alternarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  alternarConfirmarSenha(): void {
    this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha;
  }
}