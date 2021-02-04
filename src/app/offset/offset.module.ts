import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OffsetPageRoutingModule } from './offset-routing.module';

import { OffsetPage } from './offset.page';

import { TranslateModule } from '@ngx-translate/core';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OffsetPageRoutingModule,
    TranslateModule.forChild()
  ],
  declarations: [OffsetPage]
})
export class OffsetPageModule {}
