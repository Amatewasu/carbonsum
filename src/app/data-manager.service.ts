import { Injectable } from '@angular/core';

import { Plugins } from '@capacitor/core';

const { Storage } = Plugins;

@Injectable({
  providedIn: 'root'
})
export class DataManagerService {

  constructor() { }

  saveMove(move : any){
    let mapsData = JSON.parse(localStorage.mapsData);
    let date = new Date(move.begin);
    let day = date.getDate().toString();
    let month = date.getMonth().toString();
    let year = date.getFullYear().toString();

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

      return false;
    } else {
      console.warn("[saveMove] move not found in mapsData, move:", move, ", mapsData:", mapsData);
      return false;
    }
  }
}
