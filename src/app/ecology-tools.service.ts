import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EcologyToolsService {

  // gCO2eq/km
  public CO2table = {
    subway: 5.7, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
    tramway: 6, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
    bus: 154, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Routier2
    car: {
      city: 206, // source: https://www.ratp.fr/categorie-faq/5041?faqid=1616
      average: 193, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Routier2
      averageCarAdeme: 193,
      averageCarPetrolAdeme: 202,
      averageCarDieselAdeme: 190,
      compactElectric: 103,
      sedanElectric: 139,
      averageNumberOfPeopleInACar: 1.4 // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Routier2
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
    },
    walk: 0.0,
    bike: 0.0
  };

  constructor() { }

  // distance : km, mode : mode of transportation (ex: "train"), submode: more precise mode of transportation (ex: "TGV")(optional)
  computeCO2(distance : number, mode : string, submode? : string){
    if (this.CO2table[mode] === undefined){
      console.error("[computeCO2] Mode", mode, "not found in the database");
      return 0;
    }

    if (mode == "plane"){
      var gCO2PerKm = this.CO2table["plane"].distanceToCO2(distance);
    } else if (submode && this.CO2table[mode][submode]){
      var gCO2PerKm = this.CO2table[mode][submode];
    } else if (isNaN(this.CO2table[mode])){
      var gCO2PerKm = this.CO2table[mode][this.getDefaultSubmode(mode, distance)];
    } else {
      var gCO2PerKm = this.CO2table[mode];
    }

    console.log("[computeCO2] gCO2PerKm:", gCO2PerKm, "mode:", mode, "distance:", distance, "submode:", submode);

    return gCO2PerKm/1000*distance;
  }

  computeCO2move(move : any){
    let submode = "";
    let nbPeople = 1.0;
    if (move.type == "car"){
      if (move.carType){
        submode = move.carType;
      }
      if (move.nbPeopleCar != undefined){
        nbPeople = move.nbPeopleCar;
      }
    } else if (move.type == "train" && move.trainType){
      submode = move.trainType;
    }

    console.log("nbPeople", nbPeople);

    return this.computeCO2(move.distance, move.type, submode) / nbPeople;
  }

  computeCO2moves(moves : any){
    let sum = 0.0;
    for (let move of moves){
      sum += this.computeCO2move(move);
    }
    return sum;
  }

  computeCO2day(day : any){
    let sumCO2 = 0.0;
    let sumPlane = 0.0;
    let sumCar = 0.0;

    for (let move of day.moves){
      let CO2move = this.computeCO2move(move);
      sumCO2 += CO2move;

      if (move.type == "car"){
        sumCar += CO2move;
      } else if (move.type == "plane"){
        sumPlane += CO2move;
      }
    }

    day.sumCO2 = sumCO2;
    day.sumCar = sumCar;
    day.sumPlane = sumPlane;

    return day;
  }

  getDefaultSubmode(mode: string, distance?: number){
    if (mode == "car"){
      return 'averageCarAdeme';
    } else if (mode == "train"){
      if (distance > 100){
        return 'TGV';
      } else {
        return 'RER';
      }
    } else {
      console.warn('[getDefaultSubmode] mode:', mode, 'not found in the database');
      return '0';
    }
  }
}
