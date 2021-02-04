import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OffsetPage } from './offset.page';

const routes: Routes = [
  {
    path: ':co2ToOffset',
    component: OffsetPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OffsetPageRoutingModule {}
