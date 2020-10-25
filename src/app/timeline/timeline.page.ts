import { Component, OnInit } from '@angular/core';

import { DataManagerService } from '../data-manager.service';
import { EcologyToolsService } from '../ecology-tools.service';

import * as moment from 'moment';
import 'moment/min/locales';

import { ToastController } from '@ionic/angular';

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

  public year : number;
  public month : number;
  public day : number;
  private currentMonth : number = new Date().getMonth();
  private currentYear : number = new Date().getFullYear();

  constructor(private dataManager : DataManagerService, public Ecology : EcologyToolsService, public toastController: ToastController) {
    
  }

  ngOnInit() {
    this.selectedDate.setDate(this.selectedDate.getDate()-1);
    this.maxPickingDate.setDate(this.maxPickingDate.getDate()-1);
  }

  ionViewDidEnter(){
    this.loadMovesFromDate(this.selectedDate);
  }

  rightArrow(){
    this.selectedDate.setDate( this.selectedDate.getDate() + 1);
    
    if (this.selectedDate > this.maxPickingDate){
      this.selectedDate = new Date(this.maxPickingDate.getTime());
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
    return moment(this.selectedDate).format('dddd D MMMM YYYY');
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
    move.submode = value;
    move.CO2 = this.Ecology.computeCO2move(move);

    this.dataManager.saveMove(move);
  }

  updatenbPeople(e : any, move : any){
    let el = e.target;
    let value = parseFloat(el.value);

    move.nbPeople = value;
    move.CO2 = this.Ecology.computeCO2move(move);

    this.dataManager.saveMove(move);
  }

  updateTrainType(e : any, move : any){
    let el = e.target;
    let value = el.value;

    move.trainType = value;
    move.submode = value;
    if (value == ""){
      delete move.trainType;
      delete move.submode;
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


  async deleteMovesOfToday(){
    let isUserOk = confirm("Êtes-vous sûr de vouloir supprimer les données de ce jour ? (vous pourrez les synchroniser de nouveau)");
    if (isUserOk){
      let year = this.year;
      let month = this.month;
      let day = this.day;

      let mapsData = JSON.parse(localStorage.mapsData);
      let yearData = (mapsData && mapsData[year.toString()]) ? mapsData[year.toString()] : [];
      let monthData = (yearData && yearData[month.toString()]) ? yearData[month.toString()] : [];
      let dayData = (monthData && monthData[day.toString()]) ? monthData[day.toString()] : '';

      delete mapsData[year.toString()][month.toString()][day.toString()];

      localStorage.mapsData = JSON.stringify(mapsData);

      this.loadMovesFromDate(this.selectedDate);

      const toast = await this.toastController.create({
        message: 'Données du jour supprimées avec succès',
        duration: 2000
      });
      toast.present();
    }
  }
}

