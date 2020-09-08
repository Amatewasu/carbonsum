import { Component, OnInit } from '@angular/core';

import { DataManagerService } from '../data-manager.service';
import { EcologyToolsService } from '../ecology-tools.service';

import { MapService } from '../map.service';

import * as moment from 'moment';
import 'moment/min/locales';

moment.locale('fr-FR');

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.page.html',
  styleUrls: ['./timeline.page.scss'],
})
export class TimelinePage implements OnInit {

  public selectedDate : Date = new Date();
  public maxPickingDate : Date = new Date();
  public data : any = {};
  private notCompleteMonth : boolean = false;

  private year : number;
  private month : number;
  private day : number;
  private currentMonth : number = new Date().getMonth();
  private currentYear : number = new Date().getFullYear();

  constructor(private dataManager : DataManagerService, public Ecology : EcologyToolsService, private mapService: MapService) {
    
  }

  ngOnInit() {
    this.selectedDate.setDate(this.selectedDate.getDate()-1);
    this.loadMovesFromDate(this.selectedDate);
  }

  rightArrow(){
    this.selectedDate.setDate( this.selectedDate.getDate() + 1);

    if (this.selectedDate > this.maxPickingDate){
      this.selectedDate = this.maxPickingDate;
    }

    this.data = [];
    this.loadMovesFromDate(this.selectedDate);
  }

  leftArrow(){
    this.selectedDate.setDate( this.selectedDate.getDate() - 1);

    this.data = [];
    this.loadMovesFromDate(this.selectedDate);
  }

  // we load the data from the month of the date
  loadMovesFromDate(date : Date){
    let year = date.getFullYear();
    let month = date.getMonth();
    let day = date.getDate();
    this.year = year;
    this.month = month;
    this.day = day;

    if (!localStorage || !localStorage.mapsData) return;

    let mapsData = JSON.parse(localStorage.mapsData);
    let yearData = (mapsData && mapsData[year.toString()]) ? mapsData[year.toString()] : [];
    let monthData = (yearData && yearData[month.toString()]) ? yearData[month.toString()] : [];
    let dayData = (monthData && monthData[day.toString()]) ? monthData[day.toString()] : '';
    
    if (!dayData){
      console.log("[loadMovesFromDate] No data for", date);
    }

    this.data = dayData;

    console.log("[loadMovesFromDate]", this.data);
  }

  ascOrderToInt = (a: any, b: any) => {
    return parseInt(a.key, 10) < parseInt(a.key, 10);
  }

  displayDateSubtitleMove(dt : string){
    return moment(dt).format('LLLL');
  }

  displayDateNoDataToday(){
    return moment().format('dddd D MMMM YYYY');
  }

  updateSelectedTime(e : any){
    let el = e.target;
    let value = el.value;
    let date = new Date(value);
    this.selectedDate = date;
    this.loadMovesFromDate(this.selectedDate);
  }

  updateMoveType(e : any, move : any){
    let el = e.target;
    let value = el.value;

    move.type = value;
    move.CO2 = this.Ecology.computeCO2move(move);

    this.dataManager.saveMove(move);
  }

  toggleProStatusMove(e : any, move : any){
    let value = !move.professional;
    move.professional = value;

    this.dataManager.saveMove(move);
  }

  updateCarType(e : any, move : any){
    let el = e.target;
    let value = el.value;

    move.carType = value;
    move.CO2 = this.Ecology.computeCO2move(move);

    this.dataManager.saveMove(move);
  }

  updateNbPeopleCar(e : any, move : any){
    let el = e.target;
    let value = parseFloat(el.value);

    move.nbPeopleCar = value;
    move.CO2 = this.Ecology.computeCO2move(move);

    this.dataManager.saveMove(move);
  }

  updateTrainType(e : any, move : any){
    let el = e.target;
    let value = el.value;

    move.trainType = value;
    if (value == ""){
      delete move.trainType;
    }
    move.CO2 = this.Ecology.computeCO2move(move);

    this.dataManager.saveMove(move);
  }

  getDefaultSubmode(mode: string){
    return this.Ecology.getDefaultSubmode(mode);
  }
  getAverageNumberOfPeopleInACar(move){
    return this.Ecology.CO2table.car.averageNumberOfPeopleInACar;
  }
}

