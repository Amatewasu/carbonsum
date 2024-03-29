import { Component, OnInit } from '@angular/core';

import { ChangeDetectorRef } from '@angular/core';

import { Plugins } from '@capacitor/core';

const { Storage } = Plugins;

import { TranslateService } from '@ngx-translate/core';

import { EcologyToolsService } from '../ecology-tools.service';

import { SocialSharing } from '@ionic-native/social-sharing/ngx';

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

  private objectiveYear: number = 2020;
  private objectiveCO2 : number = 0;

  private currentYear : number = new Date().getFullYear();

  constructor(changeDetectorRef: ChangeDetectorRef, private translateService: TranslateService, private Ecology: EcologyToolsService, private socialSharing: SocialSharing) {
    this.changeDetectorRef = changeDetectorRef;
    this.language = this.translateService.currentLang;
    console.log("current lang",  this.translateService.currentLang);

    let now = new Date();
    this.todayUSFormat = now.getFullYear() +"-"+ this.minTwoDigits(now.getMonth()+1) +"-"+ this.minTwoDigits(now.getDate());

    this.synchronizeUntil = localStorage.synchronizeUntil || "2020-01-01";

    this.objectiveYear = localStorage.objectiveYear ? parseInt(localStorage.objectiveYear, 10) : this.currentYear;
    this.objectiveCO2 = localStorage.objectiveCO2 ? parseInt(localStorage.objectiveCO2, 10) : this.Ecology.objectiveYearToCO2(this.currentYear);

    console.log(this.objectiveYear, this.objectiveCO2);
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

  updateobjectiveCO2(){
    this.objectiveCO2 = Math.round(this.Ecology.objectiveYearToCO2(this.objectiveYear));

    localStorage.objectiveCO2 = this.objectiveCO2;
    localStorage.objectiveYear = this.objectiveYear;
  }

  minTwoDigits(n : number){
    let nStr = n.toString();
    if (nStr.length == 1){
      nStr = "0"+ nStr;
    }
    return nStr;
  }

  reportABug(){
    let data = JSON.stringify(localStorage);

    const onSuccess = (result) => {
      console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
      console.log("Shared to app: " + result.app); // On Android result.app since plugin version 5.4.0 this is no longer empty. On iOS it's empty when sharing is cancelled (result.completed=false)
    };
    const onError = (msg) => {
      console.error("Sharing failed with message: " + msg);
    };

    this.socialSharing.shareViaEmail(
      "Hi Alexis,\nI found a bug in CarbonSum, I will explain to you what happened, maybe with a screenshot. I have also attached my data to this email.\n\nHave a great day!\n\n\n\n\n\n\n\n\n\n\nDATA:\n"+ data, // Message
      'I found a bug', // Subject
      ['alexis@getcarbonsum.app'], // to
      [], // cc
      [], // bcc
      [] // attachments
    ).then(onSuccess).catch(onError);
  };
}
