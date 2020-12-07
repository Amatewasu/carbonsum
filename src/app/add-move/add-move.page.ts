import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { EcologyToolsService } from '../ecology-tools.service';
import { MapService, Feature, Itinary, MapboxOutputItinary } from '../map.service';
import { DataManagerService } from '../data-manager.service';

interface ComputedMove {
  mapURL: string;
  CO2: number;
  distance: number;
  duration: number;
  type: string;
  coords: string;
}

@Component({
  selector: 'app-add-move',
  templateUrl: './add-move.page.html',
  styleUrls: ['./add-move.page.scss'],
})
export class AddMovePage implements OnInit {
  yearID : string;
  monthID : string;
  dayID : string;

  addressesFrom : Feature[] = [];
  selectedAddressFrom : string;
  selectCoordsFrom : number[] = [];;
  addressesTo : Feature[] = [];
  selectedAddressTo : string;
  selectedCoordsTo : number[] = [];

  nbPeople: number = 1;

  computedMove : ComputedMove;

  lastClick : number = 0;
  loading : boolean = false;
  noRoute : boolean = false;

  moveTypeElement : HTMLSelectElement;
  nbPeopleEl : HTMLInputElement;

  constructor(private route: ActivatedRoute, private router: Router, private mapService: MapService, private Ecology : EcologyToolsService, private dataManager : DataManagerService) { }

  ngOnInit() {
    this.yearID = this.route.snapshot.paramMap.get('yearID');
    this.monthID = this.route.snapshot.paramMap.get('monthID');
    this.dayID = this.route.snapshot.paramMap.get('dayID');

    this.moveTypeElement = document.querySelector("#moveType");
    this.nbPeopleEl = document.querySelector("#nb-people");

    if (!this.yearID || !this.monthID || !this.dayID){
      alert('Invalid date');
      console.error("yearID:", this.yearID, "monthID:", this.monthID, "dayID:", this.dayID);

      (document.querySelector("ion-searchbar") as HTMLIonSearchbarElement).disabled = true;
    }
  }

  updateSearbarLocation(e){
    const el = e.target;
    const query = el.value.toLowerCase();

    if (Date.now() - this.lastClick < 1000) return;

    if (query && query.length){
      this.mapService
        .search_word(query)
        .subscribe((features: Feature[]) => {
          const addresses = features.map(feat => feat.place_name);
          const coords = features.map(feat => feat.center);

          console.log(addresses);
          console.log(coords);
          
          if (el.id.split("-")[2] == "from"){
            this.addressesFrom = features;
          } else {
            this.addressesTo = features;
          }
          
        });
    } else {
      if (el.id.split("-")[2] == "from"){
        this.addressesFrom = [];
      } else {
        this.addressesTo = [];
      }
    }

    this.loading = false;
}

  selectLocation(e, address, coords){
    this.lastClick = Date.now();

    const parentEl = e.target.parentElement;
    if (parentEl.id.split("-")[2] == "from"){
      this.selectedAddressFrom = address;
      this.selectCoordsFrom = coords;
      this.addressesFrom = [];
    } else {
      this.selectedAddressTo = address;
      this.selectedCoordsTo = coords;
      this.addressesTo = [];
    }

    this.updateStateAddButton();
  }

  onChangeMoveType(e){
    this.updateStateAddButton();

    const el = e.target;
    const value = el.value;
    if (value != 'car'){
      this.nbPeople = 1;
      this.nbPeopleEl.value = '1';
    }
  }

  updateStateAddButton(){
    const addButtonEl = document.querySelector("#add-move") as HTMLButtonElement;

    if (this.selectedAddressFrom && this.selectedAddressFrom.length && this.selectedAddressTo && this.selectedAddressTo.length
      && this.moveTypeElement && this.moveTypeElement.value){
      this.computeMove();
    } else {
      addButtonEl.disabled = true;
    }
  }

  addPerson(){
    const nbPeopleEl = this.nbPeopleEl;
    const newValue = (parseInt(nbPeopleEl.value, 10) + 1);
    const max = parseInt(nbPeopleEl.max, 10);

    if (newValue <= max){
      nbPeopleEl.value = ""+ newValue;
    }

    this.nbPeople = newValue;
  }

  removePerson(){
    const nbPeopleEl = this.nbPeopleEl;
    const newValue = (parseInt(nbPeopleEl.value, 10) - 1);
    const min = parseInt(nbPeopleEl.min, 10);

    if (newValue >= min){
      nbPeopleEl.value = ""+ newValue;
    }

    this.nbPeople = newValue;
  }

  toInt(str){
    return parseInt(str, 10);
  }

  computeMove(){
    this.loading = true;
    this.noRoute = false;

    let moveType = this.moveTypeElement.value;
    let mode = "";
    if (moveType == "walk"){
      mode = "walking";
    } else if (moveType == "bike"){
      mode = "cycling";
    } else if (moveType == "car"){
      mode = "driving";
    }

    if (moveType == "plane"){
      const AVG_SPEED_PLANE = 650; // km/h, to be improved
      // with a plane, we just compute the distance between the two points
      let distance = this.mapService.distanceBetweenPoints(this.selectCoordsFrom, this.selectedCoordsTo)/1000; // m -> km
      let computedMove = {
        distance: distance,
        CO2: this.Ecology.computeCO2(distance, moveType)/1,
        mapURL: this.mapService.geometryToMapURL({ coordinates: [this.selectCoordsFrom, this.selectedCoordsTo] }),
        duration: distance/AVG_SPEED_PLANE*60*60,
        type: moveType,
        coords: [this.selectCoordsFrom, this.selectedCoordsTo].reverse().join(" ")
      };

      console.log(computedMove);

      this.computedMove = computedMove;

      const addButtonEl = document.querySelector("#add-move") as HTMLButtonElement;
      addButtonEl.disabled = false;
      this.loading = false;
    } else {

      this.mapService.getItinary(this.selectCoordsFrom, this.selectedCoordsTo, mode)
        .subscribe((data : MapboxOutputItinary) => {
          console.log(data);

          if (data.code == "NoRoute"){
            this.noRoute = true;
            this.loading = false;
            return;
          }

          let itinary = data.routes[0];

          let mode = this.moveTypeElement.value;
          let distance = itinary.distance / 1000; // m -> km
          let computedMove = {
            distance: distance,
            CO2: this.Ecology.computeCO2(distance, mode),
            mapURL: this.mapService.geometryToMapURL(itinary.geometry),
            duration: itinary.duration,
            type: moveType,
            coords: this.mapService.itinaryToGmapsCoords(itinary)
          };

          console.log(computedMove);

          this.computedMove = computedMove;
          this.loading = false;

          const addButtonEl = document.querySelector("#add-move") as HTMLButtonElement;
          addButtonEl.disabled = false;
        });  
      
    }
  }

  addMove(){
    let year = parseInt(this.yearID, 10);
    let month = parseInt(this.monthID, 10) - 1;
    let day = parseInt(this.dayID, 10);
    let duration = this.computedMove.duration;
    let random = Math.round(Math.random()*100);
    let move = {
      begin: new Date((new Date(year, month, day, 12).getTime() - duration*1000/2 - random)).toString(), // we center the time around midday
      end: new Date((new Date(year, month, day, 12).getTime() + duration*1000/2 - random)).toString(),

      distance: this.computedMove.distance,
      CO2: this.computedMove.CO2/this.nbPeople,
      type: this.computedMove.type,
      duration: duration,
      coordinates: this.computedMove.coords,
      manual: true,
      professional: false,
      nbPeople: this.nbPeople,
      mapURL: this.computedMove.mapURL
    };

    console.log("move to be added:", move);

    this.dataManager.saveMove(move);

    this.router.navigateByUrl("/tabs/timeline");
  }
}