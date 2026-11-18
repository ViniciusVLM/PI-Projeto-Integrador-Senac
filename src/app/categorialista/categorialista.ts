import { Component, signal } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';

// Modelo de dados: define os campos de cada categoria
interface Categoria {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
}

@Component({
  selector: 'app-categorialista',   // nome da tag deste componente
  standalone: true,                 // componente independente, sem NgModule
  imports: [Sidebar],               // permite usar <app-sidebar /> no HTML
  templateUrl: './categorialista.html',
  styleUrl: './categorialista.css',
})
export class Categorialista {
  // signal: guarda o valor e avisa a tela quando ele muda
  // Dados de exemplo (mock); depois podem vir da API
  categorias = signal<Categoria[]>([
    { id: 1, nome: 'Hardware', descricao: 'Problemas relacionados a equipamentos físicos', ativo: true },
    { id: 2, nome: 'Software', descricao: 'Problemas relacionados a programas e sistemas', ativo: true },
    { id: 3, nome: 'Rede', descricao: 'Problemas de conectividade e internet', ativo: true },
    { id: 4, nome: 'E-mail', descricao: 'Problemas com e-mail e contas', ativo: true },
    { id: 5, nome: 'Acesso', descricao: 'Acesso a sistemas e permissões', ativo: true },
  ]);
}