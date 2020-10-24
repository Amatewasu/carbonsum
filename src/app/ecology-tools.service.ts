import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EcologyToolsService {

  // gCO2eq/km
  public CO2table = {
    subway: 2.5, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
    tramway: 2.2, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
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
          return 258;
        } else if (km < 3500){
          return 187;
        } else {
          return 152;
        }
      }
    },
    train: {
      TGV: 1.73, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
      TER: 24.8, // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
      RER: 4.10 // source: http://www.bilans-ges.ademe.fr/fr/accueil/documentation-gene/index/page/Ferroviaire2
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
      if (move.nbPeople != undefined){
        nbPeople = move.nbPeople;
      }
    } else if (move.type == "train" && move.submode){
      submode = move.submode;
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

  translateGMapsMode (gmapsMode : string){
    switch (gmapsMode){
      case "On the subway":
        return "subway";
      break;

      case "On a tram":
        return "tramway";
      break;

      case "On a bus":
        return "bus";
      break;

      case "Driving":
			case "In a taxi or rideshare":
			case "Moving":
        return "car";
      break;

      case "Flying":
        return "plane";
      break;

      case "On a train":
        return "train";
      break;

      case "Motorcycling":
        return "moto";
      break;

      case "Cycling":
        return "bike";
      break;

      case "Walking":
      case "Running":
        return "walk";
      break;

      default:
        console.warn("[translateGMapsMode] Gmaps mode not catched:", gmapsMode);
        return "unknown";
    }
  }

  submodeExists(submode : string){
    return submode == "car" || submode == "train";
  }

  getDefaultNbOfPeople(mode : string){
    return (mode == "car" ? this.CO2table.car.averageNumberOfPeopleInACar : 1.0);
  }
}
