import { Component, OnInit } from '@angular/core';

import { ChangeDetectorRef } from '@angular/core';

import { Plugins } from '@capacitor/core';

const { Storage } = Plugins;

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  changeDetectorRef: ChangeDetectorRef;

  constructor(changeDetectorRef: ChangeDetectorRef) {
    this.changeDetectorRef = changeDetectorRef;
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

}
