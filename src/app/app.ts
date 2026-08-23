import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Helpdesk } from './helpdesk/helpdesk';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Helpdesk],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('PI-Projeto-Integrador-Senac');
}