import { Injectable, EventEmitter, Output } from '@angular/core';

import { Plugins } from '@capacitor/core';

const { Storage } = Plugins;

import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { Platform } from '@ionic/angular';

import { EcologyToolsService } from './ecology-tools.service';
import { MapService } from './map.service';

import { LocalNotifications } from '@ionic-native/local-notifications/ngx';

import { TranslateService } from '@ngx-translate/core';

export interface DayData {
  sumCO2: number;
  sumPlane: number;
  sumCar: number;
  sumDistance: number;
  moves: any[];
  usDate: string;
  frDate: string;
};

@Injectable({
  providedIn: 'root'
})
export class DataManagerService {
  private verbose: boolean = true;

  public logged: boolean = false;
  public syncing: boolean = false;
  public synced: boolean = false;
  public stopSync: boolean = false;
  private timeoutThreshold: number = 10000; // ms, duration after which we retry the request

  public currentSync: Date;
  public syncUntil: Date;
  public remainingSyncTimePercent: number = 0.0;

  private currentSyncDate: string;
  private iabRef;
  private iabDLRef;
  private signInUrl : string = "https://accounts.google.com/signin/v2/identifier";
  private kmlUrl : string = "https://www.google.com/maps/timeline/kml?authuser=0&pb=!1m8!1m3!1i{year}!2i{month}!3i{day}!2m3!1i{year}!2i{month}!3i{day}";

  @Output() onLogIn: EventEmitter<any> = new EventEmitter();
  @Output() onNewDaySync: EventEmitter<any> = new EventEmitter();

  constructor(private iab: InAppBrowser, private iabDL: InAppBrowser, private platform: Platform, private Ecology: EcologyToolsService, private mapService: MapService,  private localNotifications: LocalNotifications, private translate: TranslateService) {
    this.testGoogleConnection();

    this.localNotifications.on('stopSync').subscribe(() => {
      this.askStopSync();
    });
  }

  saveMove(move : any){
    if (!localStorage.mapsData){
      localStorage.mapsData = "{}";
    }

    let mapsData = JSON.parse(localStorage.mapsData);
    let date = new Date(move.begin);
    let day = date.getDate().toString();
    let month = date.getMonth().toString();
    let year = date.getFullYear().toString();

    if (!mapsData) 													                        mapsData 												= {};

		if (!mapsData[year]) 							            mapsData[year] 						            = {};
    if (!mapsData[year][month])   	mapsData[year][month] 	= {};
    if (!mapsData[year][month][day]){
      let d : DayData = {
        sumCar: 0,
        sumPlane: 0,
        sumCO2: 0,
        sumDistance: 0,
        moves: [],
        usDate: "",
        frDate: ""
      };
      mapsData[year][month][day] = d;
    }

    if (move.coordinates){
      delete move.coordinates;
    }
    

    if (mapsData[year] && mapsData[year][month] && mapsData[year][month][day]){
      let dayData = mapsData[year][month][day];

      for (let i = 0; i < dayData.moves.length; i++){
        if (move.begin === dayData.moves[i].begin){
          dayData.moves[i] = move;

          localStorage.mapsData = JSON.stringify(mapsData);
          console.log("[saveMove] move saved");
          return true;
        }
      }

      dayData.moves.push(move);
      localStorage.mapsData = JSON.stringify(mapsData);
      console.log("[saveMove] new move saved");
      return true;
    } else {
      console.warn("[saveMove] move not found in mapsData, move:", move, ", mapsData:", mapsData);
      return false;
    }
  }

  testGoogleConnection(){
    console.debug("testGoogleConnection");
  
    if (!this.platform.is('hybrid')){
      console.log("BROWSER - ignoring testGoogleConnection");
      return;
    }

    let iabOptions = "location=no,hidden=yes";
  
    var iabRef = this.iab.create(this.signInUrl, "_blank", iabOptions);
  
      iabRef.on('loadstart').subscribe(event => {
        var url = new URL(event.url);
        if (url.hostname == "myaccount.google.com"){
          this.logged = true;
          console.log("logged", this.logged); 
          iabRef.hide();

          this.onLogIn.emit(null);

          this.iabRef.close();
        }
      });
  
      this.iabRef = iabRef;
    }

    logInOrLogOut(){
      if (this.logged && confirm("Etes-vous sûr de vouloir vous déconnecter ?")){ // we log out the user
        this.logOut();
      } else { // we display the login page to connect the user
        this.logIn();
      }
    }

    logIn(){
      console.log("[LOG IN] Display the sign in page.");
      this.testGoogleConnection();
      this.iabRef.show();
    }

    logOut(){
      this.iabRef.hide(); 
      this.iabRef.executeScript({ code: "window.location = 'https://www.google.com/accounts/Logout'" });
      this.logged = false;
      console.log("logged", this.logged);  
    }

    downloadGmapsData(year, month, day, cb){
      console.log('downloadData');

      var successfullyLoaded = false;
      var startDLTime = Date.now();

      setTimeout(() => {
        if (!successfullyLoaded){
          console.warn("[downloadGmapsData] Request timed out - we retry, params:", { year: year, month: month, day: day });

          this.iabDLRef.close();
          
          this.downloadGmapsData(year, month, day, cb ? cb : () => {});
        }
      }, this.timeoutThreshold);
	
      year = year || (new Date().getFullYear());
      month = (month >= 0 && month <= 12) ? month : (new Date().getMonth());
      if (day !== 0) day = day || (new Date().getDate());
      
      var urlDate = (this.kmlUrl).replace("{year}", year).replace("{month}", month).replace("{day}", day).replace("{year}", year).replace("{month}", month).replace("{day}", day);
      console.log(urlDate);
      var nb = 0;

      if (this.logged){
        this.iabRef.hide();
        this.iabDLRef = this.iab.create("https://www.google.com/", "_blank", "EnableViewPortScale=yes,location=no,hidden=yes,hardwareback=no,hidenavigationbuttons=yes,zoom=no,fullscreen=no");
        
        //this.timeoutManagement.dateStartDownload = new Date();
        //this.timeoutManagement.downloaded = false;
        //this.timeoutManagement.year = year;
        //this.timeoutManagement.month = month;
        //this.timeoutManagement.day = day;
        //this.timeoutManagement.cb = cb ? cb : function (foo){};

          this.iabDLRef.on('loadstop').subscribe(event => {
            nb++;

            if (this.verbose) console.log('[downloadGmapsData] loadStop:', event, "params:", { year: year, month: month, day: day }, "nb:", nb);

            if (nb > 1) return;

            this.iabDLRef.on('message').subscribe((event) => {
              // console.log('postmessage received', event);
              //this.timeoutManagement.downloaded = true;

              if (event.data.status != "ok"){
                console.error('[downloadGmapsData] Error while doing the xhr request. data:', event);
                return;
              }

              if (localStorage.monitorPerformance) console.time("KML parsing");
              
              const parser = new DOMParser();
              const srcDOM = parser.parseFromString(event.data.kml, "application/xml");
              const json = xml2json(srcDOM);

              if (localStorage.monitorPerformance) console.timeEnd("KML parsing");
        
              console.log(json);

              successfullyLoaded = true;
              if (this.verbose) console.log("[downloadGmapsData] data loaded in:", (Date.now() - startDLTime)/1000, "s., data size:", event.data.kml.length/1000, "kB");

              this.iabDLRef.close();

              if (cb){
                cb(json, this);
              }
            });

          this.iabDLRef.on('loaderror').subscribe((event) => {
            console.error('[downloadGmapsData] loadError:', event);
          });

          this.iabDLRef.on('exit').subscribe((event) => {
            if (this.verbose) console.log('[downloadGmapsData] exit:', event);
          });

          this.iabDLRef.executeScript({ code:  "const req = new XMLHttpRequest(); req.open('GET', '"+ urlDate +"'); req.ontimeout = function(){ console.error('XHR request timed out -', req.responseText || 'Unknown reason'); }; req.onerror = function(){ console.error('XHR request failed. -', req.responseText || 'Unknown reason'); var message = { status: 'nok', error: req.responseText || 'unknown error', kml: '' }; webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(message)); }; req.onload = function(){ var message = { status: 'ok', kml: req.response }; webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(message)); }; req.send(null);" });
          
          
          });
        }
    }

    processPlacemarks (placemarks, insertMoves : Boolean = true, datePlacemark : Date = new Date()){
      var out = {
        sumCO2: 0,
        sumPlane: 0,
        sumCar: 0,
        sumDistance: 0,
        moves: [],
        usDate: "",
        frDate: ""
      };
    
      for (let i = 0; i < placemarks.length; i++){ 
        let placemark = placemarks[i];
        this.addPlacemarkToPlacemarksList(placemark);
        console.log("[PLACEMARK]", placemark);
    
        var data = placemark.ExtendedData.Data;
        var o : any = {
          distance: parseInt(data[2].value, 10)/1000, // km 
          type: this.Ecology.translateGMapsMode(placemark.name),
          CO2: 0,
          coordinates: []
        };
        if (o.type == "unknown"){
          console.log(placemark.name, "classified as 'unknown'=> skipping the move");
          continue;
        }
        o.submode = this.Ecology.submodeExists(o.type) ? this.Ecology.getDefaultSubmode(o.type) : "";
        o.nbPeople = this.Ecology.getDefaultNbOfPeople(o.type);
        o.CO2move = this.Ecology.computeCO2(o.distance, o.type, o.submode);
        o.CO2 = o.CO2move / o.nbPeople;
    
        if (placemark.LineString && placemark.LineString.coordinates){
          o.coordinates = placemark.LineString.coordinates;
        }
    
        if (o){
          o.begin = placemark && placemark.TimeSpan && placemark.TimeSpan.begin ? placemark.TimeSpan.begin : "";
          o.end = placemark && placemark.TimeSpan && placemark.TimeSpan.end ? placemark.TimeSpan.end : "";
          if (o.begin && o.end){
            o.duration = ((new Date(o.end)).getTime() - (new Date(o.begin)).getTime())/1000;
          }
    
          if (o.coordinates && o.coordinates.length){
            o.mapURL = this.mapService.generateMapURL(o.coordinates);
          }
    
          var now = new Date();
          if (datePlacemark.getFullYear() != now.getFullYear() && datePlacemark.getMonth() != now.getMonth() && datePlacemark.getDate() != now.getDate()){
            var dateOfThisPlacemark = new Date(placemark.TimeSpan.begin);
            if (dateOfThisPlacemark.getFullYear() != datePlacemark.getFullYear() || dateOfThisPlacemark.getMonth() != datePlacemark.getMonth() || dateOfThisPlacemark.getDay() != datePlacemark.getDay()){
              console.log("[processPlacemarks] Placemark of another day detected. Ignored.", placemark, "Sync date: ", datePlacemark, "Placemark date: ", dateOfThisPlacemark);
              continue;
            }
          }
    
          out.sumCO2 += o.CO2;
          if (o.type == "plane") out.sumPlane += o.CO2;
          if (o.type == "car") out.sumCar += o.CO2;
          out.sumDistance += o.distance;
          if (insertMoves){
            out.moves.push(o);
          }
        }
      }
    
      if (placemarks.length){
        var date = new Date(placemarks[0].TimeSpan.end);
        out.usDate = date.getFullYear() +"-"+ (date.getMonth() + 1) +"-"+ date.getDate();
        out.frDate = date.getDate() +"/"+ (date.getMonth() + 1) +"/"+ date.getFullYear();
      }
    
      console.log("[processPlacemarks] placemarks: ", out);
    
    
      return out;
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

  synchronise (force : boolean = false){
    console.log("[synchronise]");

		if (!this.logged /* && !this.homeReport.generated*/){
			console.error("Synchronisation aborted. Not logged or home report not generated yet.");
			return;
		}

		if (this.stopSync){
			console.log("Synchronisation stopped due to a stop sync event previsouly triggered.");
			this.syncing = false;
			this.stopSync = false;
			//this.changeDetectorRef.detectChanges();
			return;
		}

		if (!force && this.syncing){
			console.error("The app is already synchronising the data.");
			return;
		}
		if (!this.syncing) this.syncing = true;
		
		if (!localStorage.mapsData) localStorage.mapsData = "{}";

		var syncDate = new Date(localStorage.dateLastSync || new Date()); 
		syncDate.setDate(syncDate.getDate() - 1);

		if (localStorage.monitorPerformance) console.time("Read JSON maps data");
		var mapsData = localStorage.mapsData;
		if (!mapsData) 													mapsData 												= {};
		else 															mapsData 												= JSON.parse(mapsData);

		if (!mapsData[syncDate.getFullYear()]) 							mapsData[syncDate.getFullYear()] 						= {};
		if (!mapsData[syncDate.getFullYear()][syncDate.getMonth()]) 	mapsData[syncDate.getFullYear()][syncDate.getMonth()] 	= {};
		if (localStorage.monitorPerformance) console.timeEnd("Read JSON maps data");

		var today = new Date();
		//if (!mapsData[today.getFullYear()] || !mapsData[today.getFullYear()][today.getMonth()] || !mapsData[today.getFullYear()][today.getMonth()][today.getDate()]){
		//	syncDate = today;
		//}
		if (mapsData[syncDate.getFullYear()] && mapsData[syncDate.getFullYear()][syncDate.getMonth()] && mapsData[syncDate.getFullYear()][syncDate.getMonth()][syncDate.getDate()]){
			while (mapsData[syncDate.getFullYear()] && mapsData[syncDate.getFullYear()][syncDate.getMonth()] && mapsData[syncDate.getFullYear()][syncDate.getMonth()][syncDate.getDate()]){
				console.log("syncDate", syncDate);
				syncDate.setDate(syncDate.getDate() - 1);
			}
			syncDate.setDate(syncDate.getDate() + 1);
			localStorage.dateLastSync = syncDate;
			this.synchronise(true);
			return;
		}

    //var stopDate = new Date (2018, 0, 1);
    let synchronizeUntil = (localStorage.synchronizeUntil || "2020-01-01").split("-");
    var stopDate = new Date(parseInt(synchronizeUntil[0], 10), parseInt(synchronizeUntil[1], 10)-1, parseInt(synchronizeUntil[2], 10));

    this.syncUntil = stopDate;
    this.currentSync = syncDate;
    this.computeRemainingDateSync();

		this.currentSyncDate = syncDate.getDate() +"/"+ (syncDate.getMonth()+1) +"/"+ syncDate.getFullYear();
		//this.changeDetectorRef.detectChanges();

		if (syncDate > stopDate){
      this.localNotifications.schedule({
        title: this.translate.instant('general.synchronising') +'...',
        text: this.currentSyncDate,
        actions: [{
          id: 'stopSync',
          title: 'Stop'
        }],
        id: 42,
        smallIcon: 'res://ic_stat_onesignal_default'
      });

			var that = this;
			this.downloadGmapsData(syncDate.getFullYear(), syncDate.getMonth(), syncDate.getDate(), function (json){
				if (!json || !json.kml || !json.kml.Document){
					console.log("[synchronise] Empty json. Function ignored.");
					return;
				}
				if (!json.kml.Document.Placemark) json.kml.Document.Placemark = [];
			
				var report = that.processPlacemarks(json.kml.Document.Placemark, true, syncDate);

				mapsData[syncDate.getFullYear()][syncDate.getMonth()][syncDate.getDate()] = report;

				if (localStorage.monitorPerformance) console.time("Save JSON maps data");
				localStorage.mapsData = JSON.stringify(mapsData);
				if (localStorage.monitorPerformance) console.timeEnd("Save JSON maps data");
				localStorage.dateLastSync = syncDate;

				that.synchronise(true);
			});
		} else {
      this.syncing = false;
      this.synced = true;
      //that.changeDetectorRef.detectChanges();
      
      this.localNotifications.schedule({
        title: this.translate.instant('general.synchronisationComplete'),
        text: '',
        id: 42
        // , smallIcon: 'res://ic_stat_cloud_done'
      });
		}
  }

  askSync(){
    localStorage.dateLastSync = new Date();
    this.synchronise();
  }

  askStopSync(){
    if (this.syncing){
			this.stopSync = true;
			this.syncing = false;
			console.log("Stop sync triggered.");
    }
    
    this.localNotifications.cancelAll();
  }

  getReportBetween(from: Date, to: Date){
    let differenceTime = to.getTime() - from.getTime();
    let nbDays = Math.ceil(differenceTime / (1000 * 3600 * 24))+1;

    let report = {
      sumCO2: 0.0,
      sumPlane: 0.0,
      sumCar: 0.0,
      sumDistance: 0.0,
      nbDaysSync: 0,
      nbDays: nbDays,
      movesData: {
        nb: 0,
        good: 0,
        medium: 0,
        bad: 0
      }
    };

    let mapsData = localStorage.mapsData ? JSON.parse(localStorage.mapsData) : {};
    let currDate = from;

    while (currDate.getTime() < to.getTime()){
      if (this.isDaySync(mapsData, currDate)){
        let dayData = this.getDayData(mapsData, currDate);
        if (Object.keys(dayData).length){
          let data = this.Ecology.computeCO2day(dayData);

          report.sumCO2 += data.sumCO2;
          report.sumCar += data.sumCar;
          report.sumPlane += data.sumPlane;
          report.sumDistance += this.Ecology.getDistanceMoves(dayData.moves);

          let ratedMoves = this.Ecology.rateMoves(dayData.moves ? dayData.moves : []);
          report.movesData.nb += ratedMoves.nb;
          report.movesData.good += ratedMoves.good;
          report.movesData.medium += ratedMoves.medium;
          report.movesData.bad += ratedMoves.bad;

          report.nbDaysSync++;
        }
      }

      currDate.setDate(currDate.getDate()+1);
    }

    return report;
  }

  isDaySync(mapsData, date){
    let year = date.getFullYear().toString();
    let month = date.getMonth().toString();
    let day = date.getDate().toString();

    return !!(mapsData && mapsData[year] && mapsData[year][month] && mapsData[year][month][day]);
  }

  getDayData(mapsData, date){
    let year = date.getFullYear().toString();
    let month = date.getMonth().toString();
    let day = date.getDate().toString();

    if (mapsData && mapsData[year] && mapsData[year][month] && mapsData[year][month][day]){
      return mapsData && mapsData[year] && mapsData[year][month] && mapsData[year][month][day];
    } else {
      return {};
    }
  }

  computeRemainingDateSync(){
    let now = Date.now();
    let deltaTimeCurrentSync = now - this.currentSync.getTime();
    let deltaTimeSyncUntil = now - this.syncUntil.getTime();

    this.remainingSyncTimePercent = deltaTimeCurrentSync/deltaTimeSyncUntil;
    
    return this.remainingSyncTimePercent;
  }
}

/**
 * This function coverts a DOM Tree into JavaScript Object. 
 * @param srcDOM: DOM Tree to be converted. 
 */
function xml2json(srcDOM) {
	let children = [...srcDOM.children];
	
	// base case for recursion. 
	if (!children.length) {
	  return srcDOM.innerHTML
	}
	
	// initializing object to be returned. 
	let jsonResult = {};
	
	for (let child of children) {
	  
	  // checking is child has siblings of same name. 
	  let childIsArray = children.filter(eachChild => eachChild.nodeName === child.nodeName).length > 1;
  
	  // if child is array, save the values as array, else as strings. 
	  if (childIsArray) {
		if (jsonResult[child.nodeName] === undefined) {
		  jsonResult[child.nodeName] = [xml2json(child)];
		} else {
		  jsonResult[child.nodeName].push(xml2json(child));
		}
	  } else {
		jsonResult[child.nodeName] = xml2json(child);
	  }
	}
	
	return jsonResult;
}