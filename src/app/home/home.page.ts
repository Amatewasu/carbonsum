import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
//import { InAppBrowser } from 'cordova-plugin-inappbrowser';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';

import { Platform } from '@ionic/angular';

import { ChangeDetectorRef } from '@angular/core';
import { AppComponent } from '../app.component';

import { MapService } from '../map.service';

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
  synchronising : Boolean = false;
  currentSyncDate : String;
  stopSync : Boolean = false;

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

  signInUrl : string = "https://accounts.google.com/signin/v2/identifier";
  kmlUrl : string = "https://www.google.fr/maps/timeline/kml?authuser=0&pb=!1m8!1m3!1i{year}!2i{month}!3i{day}!2m3!1i{year}!2i{month}!3i{day}";

  constructor(private router: Router, private iab: InAppBrowser, private localNotifications: LocalNotifications, private iabDL: InAppBrowser, public platform: Platform, changeDetectorRef: ChangeDetectorRef, private mapService: MapService) {
	// let's check if the user saw the tutorial slides
	if (!localStorage.introSeen){
		this.router.navigateByUrl('/intro');
	}

	this.changeDetectorRef = changeDetectorRef;
  	platform.ready().then(() => {
		localStorage.dateLastSync = "";

		this.testGoogleConnection();

		setInterval(this.checkTimeout, 1000, this);
	  });
  }




  testGoogleConnection(){
	console.debug("testGoogleConnection");

	var iabRef = this.iab.create(this.signInUrl, "_blank", "location=no,hidden=yes,hardwareback=no,hidenavigationbuttons=yes,zoom=no");

	if (!this.platform.is('hybrid')){
		console.log("BROWSER - ignoring testGoogleConnection");
		return;
	}

    iabRef.on('loadstart').subscribe(event => {
    	var url = new URL(event.url);
    	if (url.hostname == "myaccount.google.com"){
			this.logged = true;
			console.log("logged", this.logged); 
			iabRef.hide();

			this.changeDetectorRef.detectChanges();
			
			var date = new Date();
			date.setDate(date.getDate() - 1);

			this.downloadData(date.getFullYear(), date.getMonth(), date.getDate(), this.displayYesterdayHome);
    	}
    });

    this.iabRef = iabRef;
  }

  logInOrLogOut(){
  	if (this.logged && confirm("Etes-vous sûr de vouloir vous déconnecter ?")){ // we log out the user
  		this.iabRef.hide(); 
		this.iabRef.executeScript({ code: "window.location = 'https://www.google.com/accounts/Logout'" });
  		this.logged = false;
		console.log("logged", this.logged);  

		this.changeDetectorRef.detectChanges();
	  } else { // we display the login page to connect the user
		console.log("[LOG IN] Display the sign in page.");
		this.testGoogleConnection();
		this.iabRef.show();
  	}
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
	

	year = year || (new Date().getFullYear());
	month = (month >= 0 && month <= 12) ? month : (new Date().getMonth());
	if (day !== 0) day = day || (new Date().getDate());
	
	var urlDate = (this.kmlUrl).replace("{year}", year).replace("{month}", month).replace("{day}", day).replace("{year}", year).replace("{month}", month).replace("{day}", day);
	console.log(urlDate);
	var nb = 0;

  	if (this.logged){
		this.iabRef.hide();
		this.iabDLRef = this.iab.create("https://www.google.fr/", "_blank", "EnableViewPortScale=yes,location=no,hidden=yes");
		
		this.timeoutManagement.dateStartDownload = new Date();
		this.timeoutManagement.downloaded = false;
		this.timeoutManagement.year = year;
		this.timeoutManagement.month = month;
		this.timeoutManagement.day = day;
		this.timeoutManagement.cb = cb ? cb : function (foo){};

  		this.iabDLRef.on('loadstop').subscribe(event => {
			nb++;
			if (nb > 1) return;

			this.iabDLRef.on('message').subscribe((event) => {
				// console.log('postmessage received', event);
				this.timeoutManagement.downloaded = true;

				if (localStorage.monitorPerformance) console.time("KML parsing");
				
				const parser = new DOMParser();
				const srcDOM = parser.parseFromString(event.data.kml, "application/xml");
				const json = xml2json(srcDOM);

				if (localStorage.monitorPerformance) console.timeEnd("KML parsing");
	
				console.log(json);

				if (cb){
					cb(json, this);
				}
			});

			this.iabDLRef.executeScript({ code:  "const req = new XMLHttpRequest(); req.open('GET', '"+ urlDate +"'); req.onload = function(){ var message = { kml: req.response }; webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(message)); }; req.send(null);" });
			
			
		  });
  	}
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

	that.changeDetectorRef.detectChanges();
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
		var o : any = {};
		switch (placemark.name){
			case "On the subway":
				var data = placemark.ExtendedData.Data;
				o = {
					distance: parseInt(data[2].value, 10)/1000, // km 
					type: "subway",
					CO2: 0,
					coordinates: []
				};
				o.CO2 = o.distance*(CO2table.subway/1000); // ekgCO2
				if (placemark.LineString && placemark.LineString.coordinates){
					o.coordinates = placemark.LineString.coordinates;
				}
			break;

			case "On a tram":
					var data = placemark.ExtendedData.Data;
					o = {
						distance: parseInt(data[2].value, 10)/1000, // km 
						type: "tramway",
						CO2: 0,
						coordinates: []
					};
					o.CO2 = o.distance*(CO2table.tramway/1000); // ekgCO2
					if (placemark.LineString && placemark.LineString.coordinates){
						o.coordinates = placemark.LineString.coordinates;
					}
			break;

			case "On a bus":
					var data = placemark.ExtendedData.Data;
					o = {
						distance: parseInt(data[2].value, 10)/1000, // km 
						type: "bus",
						CO2: 0,
						coordinates: []
					};
					o.CO2 = o.distance*(CO2table.bus/1000); // ekgCO2
					if (placemark.LineString && placemark.LineString.coordinates){
						o.coordinates = placemark.LineString.coordinates;
					}
			break;

			case "Driving":
			case "In a taxi or rideshare":
			case "Moving":
				var data = placemark.ExtendedData.Data;
				o = {
					distance: parseInt(data[2].value, 10)/1000, // km
					type: "car",
					CO2: 0,
					coordinates: []
				};
				o.CO2 = o.distance*(CO2table.car.average/1000)/CO2table.car.averageNumberOfPeopleInACar; // ekgCO2
				if (placemark.LineString && placemark.LineString.coordinates){
					o.coordinates = placemark.LineString.coordinates;
				}
			break;

			case "Flying":
				var data = placemark.ExtendedData.Data;
				o = {
					distance: parseInt(data[2].value, 10)/1000, // km
					type: "plane",
					CO2: 0,
					coordinates: []
				};
				var CO2byKm = CO2table.plane.distanceToCO2(o.distance);
				o.CO2 = o.distance*(CO2byKm/1000); // ekgCO2
				if (placemark.LineString && placemark.LineString.coordinates){
					o.coordinates = placemark.LineString.coordinates;
				}
			break;

			case "On a train":
					var data = placemark.ExtendedData.Data;
					o = {
						distance: parseInt(data[2].value, 10)/1000, // km 
						type: "train",
						CO2: 0,
						coordinates: []
					};
					let typeTrain = o.distance < 100 ? "RER" : "TGV";
					if (typeTrain == "TGV"){
						o.CO2 = o.distance*(CO2table.train.TGV/1000); // ekgCO2
					} else if (typeTrain == "RER"){
						o.CO2 = o.distance*(CO2table.train.RER/1000); // ekgCO2
					}
					if (placemark.LineString && placemark.LineString.coordinates){
						o.coordinates = placemark.LineString.coordinates;
					}

					console.log("On a train:", o);
			break;

			case "Motorcycling":
				var data = placemark.ExtendedData.Data;
				o = {
					distance: parseInt(data[2].value, 10)/1000, // km
					type: "moto",
					CO2: 0,
					coordinates: []
				};
				o.CO2 = o.distance*(CO2table.moto/1000); // ekgCO2
				if (placemark.LineString && placemark.LineString.coordinates){
					o.coordinates = placemark.LineString.coordinates;
				}
			break;

			case "Cycling":
			case "Walking":
				let type = placemark.name == "Cycling" ? "bike" : "walk";
				var data = placemark.ExtendedData.Data;
				o = {
					distance: parseInt(data[2].value, 10)/1000, // km
					type: type,
					CO2: 0,
					coordinates: []
				};
				if (placemark.LineString && placemark.LineString.coordinates){
					o.coordinates = placemark.LineString.coordinates;
				}
			break;

			default:
				o = { distance: 0, type: "unknown", CO2: 0, coordinates: [] };
		}
		if (o && o.CO2){
			o.begin = placemark && placemark.TimeSpan && placemark.TimeSpan.begin ? placemark.TimeSpan.begin : "";
			o.end = placemark && placemark.TimeSpan && placemark.TimeSpan.end ? placemark.TimeSpan.end : "";
			if (o.begin && o.end){
				o.duration = (new Date(o.end)).getTime() - (new Date(o.begin)).getTime();
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

	askSync (){
		if (this.synchronising){
			this.stopSync = true;
			this.synchronising = false;
			console.log("Stop sync triggered.");
		} else {
			localStorage.dateLastSync = new Date();
			this.synchronise();
		}
	}

	synchronise (force : Boolean = false){
		console.log("[synchronise]");

		if (!this.logged && !this.homeReport.generated){
			console.error("Synchronisation aborted. Not logged or home report not generated yet.");
			return;
		}

		if (this.stopSync){
			console.log("Synchronisation stopped due to a stop sync event previsouly triggered.");
			this.synchronising = false;
			this.stopSync = false;
			this.changeDetectorRef.detectChanges();
			return;
		}

		if (!force && this.synchronising){
			console.error("The app is already synchronising the data.");
			return;
		}
		if (!this.synchronising) this.synchronising = true;
		
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
		if (!mapsData[today.getFullYear()] || !mapsData[today.getFullYear()][today.getMonth()] || !mapsData[today.getFullYear()][today.getMonth()][today.getDate()]){
			syncDate = today;
		}
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

		var stopDate = new Date (2010, 0, 1);

		this.currentSyncDate = syncDate.getDate() +"/"+ (syncDate.getMonth()+1) +"/"+ syncDate.getFullYear();
		this.changeDetectorRef.detectChanges();

		if (syncDate > stopDate){
			var that = this;
			this.downloadData(syncDate.getFullYear(), syncDate.getMonth(), syncDate.getDate(), function (json){
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
			that.synchronising = false;
			that.changeDetectorRef.detectChanges();
		}
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
  
