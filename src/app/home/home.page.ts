import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
//import { InAppBrowser } from 'cordova-plugin-inappbrowser';

import { Platform } from '@ionic/angular';

import { ChangeDetectorRef } from '@angular/core';
import { AppComponent } from '../app.component';

import { MapService } from '../map.service';
import { EcologyToolsService } from '../ecology-tools.service';
import { DataManagerService } from '../data-manager.service';

import { Chart } from "chart.js";

// in geqC02/km
const CO2table = {
	subway: 5.7, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
	RER: 5.7, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire26
	tramway: 6, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
	bus: 154, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Routier2
	car: {
		city: 206, // source: https://www.ratp.fr/categorie-faq/5041?faqid=1616
		average: 253, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Routier2
		averageNumberOfPeopleInACar: 1.3 // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Routier2
	},
	moto: 204, // source: http://bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Routier2 
	plane: { // http://bilans-ges.ademe.fr/fr/basecarbone/donnees-consulter/liste-element/categorie/190 ; ignore the number of passengers and take between 180 and 250
		distanceToCO2: function (km){
			if (km < 1000){
				return 293;
			} else if (km < 2000){
				return 216;
			} else if (km < 3000){
				return 209;
			} else if (km < 4000){
				return 230;
			} else if (km < 5000){
				return 307;
			} else if (km < 6000){
				return 230;
			} else if (km < 7000){
				return 223;
			} else if (km < 8000){
				return 202;
			} else if (km < 9000){
				return 223;
			} else if (km < 10000){
				return 216;
			} else {
				return 216;
			}
		}
	},
	train: {
		TGV: 3.69, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
		TER: 8.91, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
		RER: 5.70 // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
	}
};

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  public hello : Number = 12;
  public logged : Boolean = false;
  iabRef;
  iabDLRef;
  lastClick;
  intervalID;

  changeDetectorRef: ChangeDetectorRef;
  synchronising : boolean = false;
  currentSyncDate : String;
  stopSync : boolean = false;

  timeoutManagement = {
	  timeoutThreshold: 15, // seconds
	  dateStartDownload: new Date(),
	  downloaded: true,
	  year: 0,
	  month: 0,
	  day: 0,
	  cb: function (){}
  };

  homeReport = {
	generated: false,
	sumC02: 0,
	date: ""
  };

  currentMonthReport;
  currentMonth : number = new Date().getMonth();
  currentYear : number = new Date().getFullYear();
  currentMonthObjectiveMood : string = "good";

  signInUrl : string = "https://accounts.google.com/signin/v2/identifier";
  kmlUrl : string = "https://www.google.fr/maps/timeline/kml?authuser=0&pb=!1m8!1m3!1i{year}!2i{month}!3i{day}!2m3!1i{year}!2i{month}!3i{day}";

  googleLogInHidden : boolean = false;

  private subscriptionLogIn;

  constructor(private router: Router, private iab: InAppBrowser, private iabDL: InAppBrowser, public platform: Platform, changeDetectorRef: ChangeDetectorRef, private mapService: MapService, private Ecology: EcologyToolsService, private dataManager: DataManagerService) {
	// let's check if the user saw the tutorial slides
	if (!localStorage.introSeen){
		this.router.navigateByUrl('/intro');
	}

	this.changeDetectorRef = changeDetectorRef;
  	platform.ready().then(() => {
		localStorage.dateLastSync = "";

		this.testGoogleConnection();

		//setInterval(this.checkTimeout, 1000, this);
	});
  }

  ionViewDidEnter(){

	let today = new Date();
	let startDateMonth = new Date(today.getFullYear(), today.getMonth(), 1);
	let endDateMonth = new Date(today.getFullYear(), today.getMonth()+1, 0)
	this.currentMonthReport = this.dataManager.getReportBetween(startDateMonth, endDateMonth);
	console.log(this.currentMonthReport);

	this.computeCurrentMonthObjective();
  }

  ngOnInit(){
	this.subscriptionLogIn = this.dataManager.onLogIn.subscribe(() => {
		this.logged = true;
	});
  }
  ngOnDestroy(){
    this.subscriptionLogIn.unsubscribe();
  }


  testGoogleConnection(){
	console.debug("testGoogleConnection");

	if (!this.platform.is('hybrid')){
		console.log("BROWSER - ignoring testGoogleConnection");
		return;
	}

	this.dataManager.testGoogleConnection();
  }

  logInOrLogOut(){
  	this.dataManager.logInOrLogOut();
  }

  checkTimeout (that){
	  if (!that.timeoutManagement.downloaded){
		  var now = new Date().getTime();
		  if ((now - that.timeoutManagement.dateStartDownload.getTime()) > that.timeoutManagement.timeoutThreshold*1000){
			console.log("[checkTimeout] timeout dected, downloading the data again");
			that.downloadData(that.timeoutManagement.year, that.timeoutManagement.month, that.timeoutManagement.day, that.timeoutManagement.cb);
		  }
	  }
  }

  downloadData (year, month, day, cb){
	console.log('downloadData');
	
	this.dataManager.downloadGmapsData(year, month, day, cb);
  }

  displayYesterdayHome(json, that){
	if (!json || !json.kml || !json.kml.Document || !json.kml.Document.Placemark){
		console.log("[displayYesterdayHome] Empty json. Function ignored.");
		return;
	}

	var report = that.processPlacemarks(json.kml.Document.Placemark);

	that.homeReport.sumC02 = report.sumCO2;
	that.homeReport.date = report.frDate;
	that.homeReport.generated = true;

	console.log("homeReport: ", that.homeReport);

	//that.changeDetectorRef.detectChanges();
  }

  addPlacemarkToPlacemarksList (placemark){
	var placemarkName = placemark.name;
	var distance = parseInt(placemark.ExtendedData.Data[2].value, 10);
	var list = localStorage.placemarksList ? JSON.parse(localStorage.placemarksList) : { list: [] };
	
	if (distance > 0.01 && list.list.indexOf(placemarkName) === -1){
		list.list.push(placemarkName);

		localStorage.placemarksList = JSON.stringify(list);
	}
  }

  processPlacemarks (placemarks, insertMoves : Boolean = true, datePlacemark : Date = new Date()){
	return this.dataManager.processPlacemarks(placemarks, insertMoves, datePlacemark);
	}

	askSync (){
		return this.dataManager.askSync();
	}

	askStopSync(){
		return this.dataManager.askStopSync();
	}

	synchronise (force : boolean = false){
		return this.dataManager.synchronise(force);
	}

	clickGoogleButton(){
		this.dataManager.logIn();
	}

	hideGoogleLogIn(){
		this.googleLogInHidden = true;
	}

	computeCurrentMonthObjective(){
		let yearlyObjective = this.Ecology.getObjectiveTransport();
		let sumCO2currentMonth = this.currentMonthReport.sumCO2;

		let co2PerDayPeriod = sumCO2currentMonth/this.currentMonthReport.nbDaysSync;
		let projectedYearlyCO2 = co2PerDayPeriod*365;

		this.currentMonthObjectiveMood = this.Ecology.yearlyObjectiveToText(projectedYearlyCO2, yearlyObjective);

		console.log("[computeCurrentMonthObjective] sumCO2currentMonth:", sumCO2currentMonth, "co2PerDayPeriod:", co2PerDayPeriod, "projectedYearlyCO2:", projectedYearlyCO2, "yearlyObjective:", yearlyObjective);
	}
}
  
