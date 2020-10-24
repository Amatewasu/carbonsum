import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddMovePage } from './add-move.page';

const routes: Routes = [
  {
    path: '',
    component: AddMovePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddMovePageRoutingModule {}
