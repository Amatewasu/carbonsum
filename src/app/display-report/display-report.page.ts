import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';


import { DataManagerService } from '../data-manager.service';
import { EcologyToolsService } from '../ecology-tools.service';

import { Chart } from "chart.js";

import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { TranslateService } from '@ngx-translate/core';

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

  private previousYear: number;
  private previousMonth: number;
  private nextYear: number;
  private nextMonth: number;

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

  constructor(private route: ActivatedRoute, private dataManager : DataManagerService, private Ecology : EcologyToolsService, private socialSharing: SocialSharing, private translate: TranslateService) {
  }

  ngOnInit() {
    this.monthID = this.route.snapshot.paramMap.get('monthID');
    this.yearID = this.route.snapshot.paramMap.get('yearID');
    
    this.year = parseInt(this.yearID, 10);
    this.month = parseInt(this.monthID, 10);

    this.computeNeighbourYearsAndMonths();

    let mapsData = localStorage.mapsData ? JSON.parse(localStorage.mapsData) : {};
    if (mapsData && mapsData[this.year.toString()] && mapsData[this.year.toString()][this.month.toString()]){
      this.data = mapsData[this.year.toString()][this.month.toString()];
    } else {
      this.data = [];
    }

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
  }

  createDayByDayChart(){
    let colorBg = "rgba(56, 128, 255, 0.2)";
    let colorBorder = "rgba(56, 128, 255, 0.5)";

    this.dayByDayChart = new Chart(this.dayByDayCanvas.nativeElement, {
      type: "bar",
      data: {
        labels: this.daysName,
        datasets: [
          {
            label: "CO2 global (kg)",
            data: this.daysCO2,
            backgroundColor: new Array(this.daysCO2.length).fill(colorBg, 0, this.daysCO2.length),
            borderColor: new Array(this.daysCO2.length).fill(colorBorder, 0, this.daysCO2.length),
            borderWidth: 1
          }
        ]
      },
      options: {
        scales: {
          yAxes: [{
            display: true,
            ticks: {
              suggestedMin: 0
            }
          }]
        }
      }
    });
  }

  computeMonthObjective(){
		let yearlyObjective = this.Ecology.getObjectiveTransport();
		let sumCO2month = this.monthReport.sumCO2;

		let co2PerDayPeriod = sumCO2month/this.monthReport.nbDaysSync;
		let projectedYearlyCO2 = co2PerDayPeriod*365;

		this.monthObjectiveMood = this.Ecology.yearlyObjectiveToText(projectedYearlyCO2, yearlyObjective);

		console.log("[computeMonthObjective] sumCO2month:", sumCO2month, "co2PerDayPeriod:", co2PerDayPeriod, "projectedYearlyCO2:", projectedYearlyCO2, "yearlyObjective:", yearlyObjective);
  }
  
  loadImage(src: string){
    return new Promise(resolve => {
      let img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.src = src;
    });
  }

  async shareReport(){
    let data = {
      month: this.translate.instant('general.monthsName.'+ this.month),
      year: this.year,
      totalImpact: this.monthReport.sumCO2, // kgCO2e
      nbMoves: this.monthReport.movesData.nb,
      nbMovesLowImpact: this.monthReport.movesData.good,
      nbMovesMediumImpact: this.monthReport.movesData.medium,
      nbMovesHighImpact: this.monthReport.movesData.bad
    };

    let img = await this.generateSharingImage(data);

    let options = {
      files: [img],
      message: this.translate.instant('display-report.social-sharing.message'),
      url: "https://getcarbonsum.app"
    };

    const onSuccess = (result) => {
      console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
      console.log("Shared to app: " + result.app); // On Android result.app since plugin version 5.4.0 this is no longer empty. On iOS it's empty when sharing is cancelled (result.completed=false)
    };
    const onError = (msg) => {
      console.log("Sharing failed with message: " + msg);
    };

    this.socialSharing.shareWithOptions(options)
      .then(onSuccess)
      .catch(onError)
    ;
  }

  async generateSharingImage(data){
    const W = 1080; // px
    const H = 1080; // px
    const goodColor = "#00DC91";
    const mediumColor = "#FFA700";
    const badColor = "#F55434";
    const greyColor = "grey";
    const bgColor = "#00A9FA";

    let logo : any = await this.loadImage('/assets/icon/logo-carbonsum.png');
    let bg : any = await this.loadImage('/assets/images/bg_social-sharing.jpg');

    let canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;

    let ctx = canvas.getContext("2d");

    // draw the background
    ctx.drawImage(bg, 0, 0);

    // draw the month name
    ctx.fillStyle = "black";
    ctx.font = 'bold 40px Helvetica, Gadget, sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(data.month +" "+ data.year, 125, 297);
    ctx.textBaseline = "alphabetic";

    // draw the circle
    let radius = 170; // px
    let partGood = data.nbMoves ? data.nbMovesLowImpact/data.nbMoves : 0;
    let partMedium = data.nbMoves ? data.nbMovesMediumImpact/data.nbMoves : 0;
    let partBad = data.nbMoves ? data.nbMovesHighImpact/data.nbMoves : 0;
    let centerCircle = { x: 361, y: 625 };
    let offsetAngle = -Math.PI/2;
    ctx.lineWidth = 35; // px
    ctx.strokeStyle = goodColor;
    if (data.nbMoves){
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
    } else {
      ctx.strokeStyle = greyColor;
      ctx.beginPath();
      ctx.arc(centerCircle.x, centerCircle.y, radius, 0, 2*Math.PI);
      ctx.stroke();
    }

    // draw the number of moves
    ctx.fillStyle = "black";
    ctx.font = 'bold 50px Helvetica, Gadget, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.nbMoves, centerCircle.x, centerCircle.y-30);
    ctx.font = '35px Helvetica, Gadget, sans-serif';
    ctx.fillStyle = "#656668";
    ctx.fillText(this.translate.instant('display-report.moves'), centerCircle.x, centerCircle.y+30);
    ctx.textBaseline = 'alphabetic';

    // draw the legend
    // the indicators first
    let xLegend = 655; // px
    let barLength = 80; // px
    let spaceBars = 150; // px
    ctx.lineWidth = 13; // px
    ctx.lineCap = 'round';
    ctx.strokeStyle = goodColor;
    ctx.beginPath();
    ctx.moveTo(xLegend, centerCircle.y - spaceBars - barLength/2);
    ctx.lineTo(xLegend, centerCircle.y - spaceBars + barLength/2);
    ctx.stroke();
    ctx.strokeStyle = mediumColor;
    ctx.beginPath();
    ctx.moveTo(xLegend, centerCircle.y - barLength/2);
    ctx.lineTo(xLegend, centerCircle.y + barLength/2);
    ctx.stroke();
    ctx.strokeStyle = badColor;
    ctx.beginPath();
    ctx.moveTo(xLegend, centerCircle.y + spaceBars - barLength/2);
    ctx.lineTo(xLegend, centerCircle.y + spaceBars + barLength/2);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // and then the associated text
    let spaceTextBar = 20; // px
    ctx.textAlign = 'left';
    ctx.font = 'bold 30px Helevtica, Gadget, sans-serif';
    ctx.fillText(data.nbMovesLowImpact, xLegend+spaceTextBar, centerCircle.y - spaceBars - 10);
    ctx.font = '25px Helvetica, Gadget, sans-serif';
    ctx.fillText(this.translate.instant('display-report.social-sharing.lowImpact'), xLegend+spaceTextBar, centerCircle.y - spaceBars + 25);

    ctx.font = 'bold 30px Helvetica, Gadget, sans-serif';
    ctx.fillText(data.nbMovesMediumImpact, xLegend+spaceTextBar, centerCircle.y - 10);
    ctx.font = '25px Helvetica, Gadget, sans-serif';
    ctx.fillText(this.translate.instant('display-report.social-sharing.mediumImpact'), xLegend+spaceTextBar, centerCircle.y + 25);

    ctx.font = 'bold 30px Helvetica, Gadget, sans-serif';
    ctx.fillText(data.nbMovesHighImpact, xLegend+spaceTextBar, centerCircle.y + spaceBars - 10);
    ctx.font = '25px Helvetica, Gadget, sans-serif';
    ctx.fillText(this.translate.instant('display-report.social-sharing.highImpact'), xLegend+spaceTextBar, centerCircle.y + spaceBars + 25);

    // let's draw the total impact
    ctx.fillStyle = "black";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.font = 'bold 40px Helvetica, Gadget, sans-serif';
    ctx.fillText(data.totalImpact.toFixed(0), 815, 297);
    ctx.textAlign = "left";
    ctx.font = '40px Helvetica, Gadget, sans-serif';
    ctx.fillText(this.translate.instant('display-report.social-sharing.kgCO2e'), 815, 297);
    ctx.textBaseline = "alphabetic";

    console.log(canvas.toDataURL());

    return canvas.toDataURL();
  }

  computeNeighbourYearsAndMonths(){
    if (this.month > 0){ // i.e. it's not january
      this.previousMonth = this.month - 1;
      this.previousYear = this.year;
    } else { // i.e. it's january
      this.previousMonth = 11; // december
      this.previousYear = this.year - 1;
    }

    if (this.month < 11){ // i.e. it's not december
      this.nextMonth = this.month + 1;
      this.nextYear = this.year;
    } else { // i.e. it's december
      this.nextMonth = 0; // january
      this.nextYear = this.year + 1;
    }
  }

}
