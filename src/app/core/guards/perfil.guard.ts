import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const perfilGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/']);
  }

  const perfisPermitidos: string[] = route.data['perfis'] ?? [];

  if (perfisPermitidos.length === 0 || authService.temPerfil(...perfisPermitidos)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
