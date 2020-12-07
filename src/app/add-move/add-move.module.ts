import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { AddMovePageRoutingModule } from './add-move-routing.module';

import { AddMovePage } from './add-move.page';

import { TranslateModule } from '@ngx-translate/core';

const routes: Routes = [
  {
    path: ':yearID/:monthID/:dayID',
    component: AddMovePage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddMovePageRoutingModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild()
  ],
  declarations: [AddMovePage]
})
export class AddMovePageModule {}
