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

  monthReport : any;
  
  public monthsName = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  monthObjectiveMood : string;

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

    let startDateMonth = new Date(this.year, this.month, 1);
	  let endDateMonth = new Date(this.year, this.month+1, 0)
    this.monthReport = this.dataManager.getReportBetween(startDateMonth, endDateMonth);
    this.computeMonthObjective();
  }

  ionViewDidEnter() {
    this.createDayByDayChart();

    setTimeout(() => {
      this.generateSharingImage();
    }, 100);
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

  computeMonthObjective(){
		let yearlyObjective = parseFloat(localStorage.yearlyObjective) || this.Ecology.CO2table.stats.FR.totalPerYearPerPersonTransport;
		let sumCO2month = this.monthReport.sumCO2;

		let co2PerDayPeriod = sumCO2month/this.monthReport.nbDaysSync;
		let projectedYearlyCO2 = co2PerDayPeriod*365;

		this.monthObjectiveMood = this.Ecology.yearlyObjectiveToText(projectedYearlyCO2, yearlyObjective);

		console.log("[computeMonthObjective] sumCO2month:", sumCO2month, "co2PerDayPeriod:", co2PerDayPeriod, "projectedYearlyCO2:", projectedYearlyCO2, "yearlyObjective:", yearlyObjective);
  }
  
  loadLogo(){
    return new Promise(resolve => {
      let logo = new Image();
      logo.onload = () => {
        resolve(logo);
      };
      logo.src = '/assets/icon/logo-carbonsum.png';
    });
  }

  async generateSharingImage(){
    const W = 1080; // px
    const H = 1080; // px
    const goodColor = "#00DC91";
    const mediumColor = "#FFA700";
    const badColor = "#F55434";
    const bgColor = "#00A9FA";

    let logo : any = await this.loadLogo();

    let canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;

    let ctx = canvas.getContext("2d");

    // draw the background
    ctx.fillStyle = bgColor; // background color
    ctx.fillRect(0, 0, W, H);

    // draw the corner
    ctx.fillStyle = "white";
    let cornerSize = 0.4;
    ctx.beginPath();
    ctx.moveTo(W, H); // right bottom corner
    ctx.lineTo(W, H - Math.round(H*cornerSize));
    ctx.lineTo(W - Math.round(W*cornerSize), H);
    ctx.lineTo(W, H);
    ctx.fill();

    // draw the logo
    ctx.drawImage(logo, W-200-30, H-140-30);

    // draw the month name
    ctx.fillStyle = "white";
    ctx.font = '80px "Arial Black", Gadget, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText('Septembre', W - 100, 100);
    ctx.fillText('2020', W - 100, 100+100);

    // draw the circle
    let radius = 200; // px
    let partGood = 1/3;
    let partMedium = 1/3;
    let partBad = 1/3;
    let centerCircle = { x: W/2, y: H/2 };
    let offsetAngle = -Math.PI/2;
    ctx.lineWidth = 20; // px
    ctx.strokeStyle = goodColor;
    ctx.beginPath();
    ctx.arc(centerCircle.x, centerCircle.y, radius, offsetAngle+0, offsetAngle+2*Math.PI*partGood);
    ctx.stroke();
    ctx.strokeStyle = mediumColor;
    ctx.beginPath();
    ctx.arc(centerCircle.x, centerCircle.y, radius, offsetAngle+2*Math.PI*partGood, offsetAngle+2*Math.PI*(partGood+partMedium));
    ctx.stroke();
    ctx.strokeStyle = badColor;
    ctx.beginPath();
    ctx.arc(centerCircle.x, centerCircle.y, radius, offsetAngle+2*Math.PI*(partGood+partMedium), offsetAngle+2*Math.PI);
    ctx.stroke();

    // draw the number of moves
    ctx.fillStyle = "white";
    ctx.font = '35px bold "Arial Black", Gadget, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('126', Math.round(W/2), Math.round(H/2)-30);
    ctx.font = '35px "Arial Black", Gadget, sans-serif';
    ctx.fillText('déplacements', Math.round(W/2), Math.round(H/2)+30);
    ctx.textBaseline = 'alphabetic';

    // draw the legend
    // the indicators first
    let xLegend = 50; // px
    ctx.lineWidth = 10; // px
    ctx.lineCap = 'round';
    ctx.strokeStyle = goodColor;
    ctx.beginPath();
    ctx.moveTo(xLegend, 100);
    ctx.lineTo(xLegend, 100+50);
    ctx.stroke();
    ctx.strokeStyle = mediumColor;
    ctx.beginPath();
    ctx.moveTo(xLegend, 200);
    ctx.lineTo(xLegend, 200+50);
    ctx.stroke();
    ctx.strokeStyle = badColor;
    ctx.beginPath();
    ctx.moveTo(xLegend, 300);
    ctx.lineTo(xLegend, 300+50);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // and then the associated text
    ctx.textAlign = 'left';
    ctx.font = 'bold 25px "Arial Black", Gadget, sans-serif';
    ctx.fillText('42', xLegend+20, 125);
    ctx.font = '15px "Arial Black", Gadget, sans-serif';
    ctx.fillText('impact faible', xLegend+20, 150);

    ctx.font = 'bold 25px "Arial Black", Gadget, sans-serif';
    ctx.fillText('42', xLegend+20, 225);
    ctx.font = '15px "Arial Black", Gadget, sans-serif';
    ctx.fillText('impact modéré', xLegend+20, 250);

    ctx.font = 'bold 25px "Arial Black", Gadget, sans-serif';
    ctx.fillText('42', xLegend+20, 325);
    ctx.font = '15px "Arial Black", Gadget, sans-serif';
    ctx.fillText('impact important', xLegend+20, 350);

    // let's draw the total impact
    ctx.fillStyle = "white";
    ctx.font = '80px "Arial Black", Gadget, sans-serif';
    ctx.fillText('346', xLegend, H-200+100);
    ctx.font = '40px "Arial Black", Gadget, sans-serif';
    ctx.fillText('kgCO2e', xLegend, H-150+100);

    console.log(canvas.toDataURL());

    return canvas.toDataURL();
  }

}
