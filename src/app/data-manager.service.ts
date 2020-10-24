import { Injectable } from '@angular/core';

import { Plugins } from '@capacitor/core';

const { Storage } = Plugins;

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

  constructor() { }

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
}
