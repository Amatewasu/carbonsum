import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HelpPageRoutingModule } from './help-routing.module';

import { HelpPage } from './help.page';

import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HelpPageRoutingModule,
    TranslateModule.forChild()
  ],
  declarations: [HelpPage]
})
export class HelpPageModule {}
