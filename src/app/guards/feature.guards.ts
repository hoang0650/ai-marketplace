import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isHiddenCategory } from '../models/categories';
import { WORK_BOARD_ENABLED } from '../models/feature-flags';

export const workBoardGuard: CanActivateFn = () =>
  WORK_BOARD_ENABLED ? true : inject(Router).createUrlTree(['/']);

/** Category hubs read `data.category`; `/marketplace/:category` reads the param. */
export const visibleCategoryGuard: CanActivateFn = (route) => {
  const category = route.data?.['category'] || route.paramMap.get('category');
  return isHiddenCategory(category) ? inject(Router).createUrlTree(['/marketplace']) : true;
};
