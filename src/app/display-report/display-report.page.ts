import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';


import { DataManagerService } from '../data-manager.service';
import { EcologyToolsService } from '../ecology-tools.service';

import { Chart } from "chart.js";

@Component({
  selector: 'app-display-report',
  templateUrl: './display-report.page.html',
  styleUrls: ['./display-report.page.scss'],
})
export class DisplayReportPage implements OnInit {
  AVG_FRENCH_PERSON_TRANSPORT : number = 1972 + 480 + 85; // annual value, source: http://ravijen.fr/?p=440
  percentageMoreThanAvgFrenchPerson : number;

  @ViewChild("dayByDayCanvas", {read: ElementRef, static: true}) private dayByDayCanvas : ElementRef;
  private dayByDayChart: Chart;

  monthID : string;
  yearID : string;
  
  year : number;
  month : number;

  notCompleteMonth : Boolean = false;

  currentMonth : number = (new Date()).getMonth();
  currentYear : number = (new Date()).getFullYear();
  funnyFact : number = 0;
  AVAILABLE_FUNNY_FACTS : number = 4;

  data;
  sumCO2 : number = 0;
  sumPlane : number = 0;
  sumCar : number = 0;
  sumDistance : number = 0;
  
  public monthsName = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  daysName = [];
  daysCO2 = [];

  constructor(private route: ActivatedRoute, private dataManager : DataManagerService, private Ecology : EcologyToolsService) {
  }

  ngOnInit() {
    this.monthID = this.route.snapshot.paramMap.get('monthID');
    this.yearID = this.route.snapshot.paramMap.get('yearID');
    
    this.year = parseInt(this.yearID, 10);
    this.month = parseInt(this.monthID, 10);

    this.data = JSON.parse(localStorage.mapsData)[this.year.toString()][this.month.toString()];

    let i = 1;
    let date = new Date(this.year, this.month, 0);
    while (i <= 31){
      date.setDate(date.getDate() + 1);

      if (date.getMonth() != this.month) break;

      if (this.data[i.toString()] === undefined){
        console.log(this.data, date);
        this.notCompleteMonth = true;
        break;
      }

      i++;
    }

    for (let day = 1; day <= 31; day++){
      let dayData = this.data[day.toString()];
      
      if (dayData !== undefined){
        dayData = this.Ecology.computeCO2day(dayData);

        this.sumCO2 += dayData.sumCO2;
        this.sumCar += dayData.sumCar;
        this.sumPlane += dayData.sumPlane;

        this.daysName.push(day);
        this.daysCO2.push(dayData.sumCO2.toFixed(1));
      }
    }

    this.percentageMoreThanAvgFrenchPerson = (this.sumCO2/(this.AVG_FRENCH_PERSON_TRANSPORT/12) - 1)*100;

    this.funnyFact = Math.floor(Math.random() * this.AVAILABLE_FUNNY_FACTS);
    console.log("Funny fact number:", this.funnyFact);

    
  }

  ionViewDidEnter() {
    this.createDayByDayChart();
  }

  createDayByDayChart(){
    this.dayByDayChart = new Chart(this.dayByDayCanvas.nativeElement, {
      type: "bar",
      data: {
        labels: this.daysName,
        datasets: [
          {
            label: "CO2 global (kg)",
            data: this.daysCO2,
            backgroundColor: new Array(this.daysCO2.length).fill('rgba(255, 99, 132, 0.2)', 0, this.daysCO2.length),
            borderColor: new Array(this.daysCO2.length).fill('rgba(255, 99, 132, 0.5)', 0, this.daysCO2.length),
            borderWidth: 1
          }
        ]
        
      }
    });
  }

}
