import { Component, OnInit } from '@angular/core';

import { EcologyToolsService } from '../ecology-tools.service';


@Component({
  selector: 'app-infos',
  templateUrl: './infos.page.html',
  styleUrls: ['./infos.page.scss'],
})
export class InfosPage implements OnInit {

  public CO2table: any;

  constructor(private Ecology : EcologyToolsService) {
    this.CO2table = this.Ecology.CO2table;
  }

  ngOnInit() {
  }

}
