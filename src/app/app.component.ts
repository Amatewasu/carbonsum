import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  public appPages = [
    {
      title: 'Home',
      url: '/home',
      icon: 'home'
    }, {
      title: 'Informations',
      url: '/infos',
      icon: 'help-circle'
    }, {
      title: 'Mes trajets',
      url: '/timeline',
      icon: 'location'
    }, {
      title: 'Paramètres',
      url: '/settings',
      icon: 'settings'
    }
  ];

  public syncedMonths = [];
  lastSizeMapsData = 0;

  public monthsName = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private screenOrientation: ScreenOrientation
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      if (this.platform.is('hybrid')){
        this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
      }

      this.statusBar.styleDefault();
      this.splashScreen.hide();

      this.getSyncedMonths();

      setInterval(this.checkNewData, 5000, this);
    });
  }

  public getSyncedMonths(){
    let mapsData = localStorage.mapsData ? JSON.parse(localStorage.mapsData) : {};
    this.lastSizeMapsData = localStorage.mapsData ? localStorage.mapsData.length : Math.random();
    this.syncedMonths = [];
      for (let y in mapsData){
        for (let m in mapsData[y]){
          this.syncedMonths.push(y +"/"+ m);
        }
      }
      
      this.syncedMonths.sort((a, b) => {
        let A = a.split("/");
        let Ay = parseInt(A[0], 10);
        let Am = parseInt(A[1], 10);

        let B = b.split("/");
        let By = parseInt(B[0], 10);
        let Bm = parseInt(B[1], 10);

        if (Ay < By){
          return -1;
        } else if (Ay > By){
          return 1;
        } else if (Am < Bm){
          return -1;
        } else if (Am > Bm){
          return 1;
        } else {
          return 0;
        }
      }).reverse();
  }

  checkNewData (that){
    let shouldSync = !localStorage.mapsData || that.lastSizeMapsData != localStorage.mapsData.length;
    if (shouldSync){
      that.getSyncedMonths();
    }
  }
}
