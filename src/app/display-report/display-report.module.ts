import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { DisplayReportPage } from './display-report.page';

import { TranslateModule } from '@ngx-translate/core';

const routes: Routes = [
  {
    path: ':yearID/:monthID',
    component: DisplayReportPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild()
  ],
  declarations: [DisplayReportPage]
})
export class DisplayReportPageModule {}
