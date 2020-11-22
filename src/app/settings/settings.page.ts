import { Component, OnInit } from '@angular/core';

import { ChangeDetectorRef } from '@angular/core';

import { Plugins } from '@capacitor/core';

const { Storage } = Plugins;

import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  changeDetectorRef: ChangeDetectorRef;

  private language: string;

  private todayUSFormat : string;
  private synchronizeUntil : string;

  constructor(changeDetectorRef: ChangeDetectorRef, private translateService: TranslateService) {
    this.changeDetectorRef = changeDetectorRef;
    this.language = this.translateService.currentLang;
    console.log("current lang",  this.translateService.currentLang);

    let now = new Date();
    this.todayUSFormat = now.getFullYear() +"-"+ (now.getMonth()+1) +"-"+ now.getDate();

    this.synchronizeUntil = localStorage.synchronizeUntil || "2020-01-01";
  }

  ngOnInit() {
  }

  deleteLocalData(){
    let confirmed = confirm("Êtes-vous sûr de vouloir supprimer les données enregistrées liés à l'application enregistrées localement sur le téléphone ?");

    if (confirmed){
      localStorage.clear();

      this.changeDetectorRef.detectChanges();
      alert('Données supprimées avec succès.');
    }
  }

  languageChange(){
    console.log("new lang", this.language);
    this.translateService.use(this.language);
    localStorage.lang = this.language;

    location.reload();
  }

  updateSynchronizeUntil(e : any){
    let el = e.target;
    let value = el.value;

    this.synchronizeUntil = value;
    localStorage.synchronizeUntil = this.synchronizeUntil;
  }

}
