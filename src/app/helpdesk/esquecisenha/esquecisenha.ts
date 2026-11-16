import { Component } from '@angular/core';

@Component({
  selector: 'app-esquecisenha',
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