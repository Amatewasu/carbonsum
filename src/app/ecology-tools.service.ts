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
    plane: { // http://bilans-ges.ademe.fr/fr/basecarbone/donnees-consulter/liste-element/categorie/190
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
    bike: 0.0,

    stats: {
      FR: {
        totalPerYearPerPerson: 11190.9, // kgCO2eq
        totalPerYearPerPersonTransport: 2670, // kgCO2eq, https://www.statistiques.developpement-durable.gouv.fr/chiffres-cles-du-climat-france-europe-et-monde-edition-2020-0
        
        objective2C2100: 2.1*1000, // kgCO2eq/an
        ratioTransport: 0.25, // 25%, totalPerYearPerPersonTransport/totalPerYearPerPerson = 0.25
        objective2C2100Transport: 525 // kgCO2eq, objective2C2100*ratioTransport
      }
    }
  };

  public thresholdMiddleObjective = 0.8; // 80%

  // explanation for the following value
  // relevant value for three reasons:
  // 1) average nb of kilometers traveled by a french person: 20000 km/year, average transport-related emissions by a french person: 2700 kgCO2eq/year, the quotient: 0.135 kgCO2eq/km
  // source: https://fr.forumviesmobiles.org/sites/default/files/editor/rapport_enquete_nationale_mobilite_modes_de_vie_2020_fvm.pdf
  // 2) middle sized electric car: 0.103 kgCO2eq/km => medium emission factor
  // 3) normal french car: 0.193 kgCO2eq/km, with two people : 0.1 kgCO2eq => from high to medium, incentive for share riding
  public thresholdHighEmissionFactor = 0.135; // kgCO2eq
  // explanation for the following value
  // relevant for two reasons
  // 1) two people in an electric vehicle => low emission factor, an average electric vehicle : 0.103 kgCO2eq/km / 2 = 0.0515 kgCO2eq/km
  // 2) 2°C scenario, every person has a 2.1 TCO2eq/year, we keep 25% for the transport, we an average of 10000km traveled/year => 0.052 kgCO2eq/km
  public thresholdMediumEmissionFactor = 0.052; // kgCO2eq

  constructor() {
    if (!localStorage.objectiveCO2){
      localStorage.objectiveCO2 = Math.round(this.getObjectiveTransport());
    }
  }

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

  getFactorEmissionMove(move){
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

    return this.computeCO2(move.distance, move.type, submode) / nbPeople / move.distance;
  }

  getDistanceMove(move : any){
    return move.distance;
  }
  getDistanceMoves(moves : any){
    let d = 0.0;
    for (let move of moves){
      d += this.getDistanceMove(move);
    }
    return d;
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

  yearlyObjectiveToText(sumCO2, yearlyObjective){
		if (sumCO2 > yearlyObjective){
			return "bad";
		} else if (sumCO2 > this.thresholdMiddleObjective*yearlyObjective){
			return "middle";
		} else {
			return "good";
		}
  }
  
  rateMoves(moves){
    let res = {
      nb: moves.length,
      good: 0,
      medium: 0,
      bad: 0
    };

    for (let move of moves){
      let factorEmission = this.getFactorEmissionMove(move);
      if (factorEmission > this.thresholdHighEmissionFactor){
        res.good++;
      } else if (factorEmission > this.thresholdMediumEmissionFactor){
        res.medium++;
      } else {
        res.bad++;
      }
    }

    console.log(moves, res);

    return res;
  }

  objectiveYearToCO2 (year : number){
    if (year > 2100){
      return 0;
    } else if (year < 2020) {
      return this.CO2table.stats.FR.totalPerYearPerPersonTransport;
    }

    return this.CO2table.stats.FR.totalPerYearPerPersonTransport - (this.CO2table.stats.FR.totalPerYearPerPersonTransport - this.CO2table.stats.FR.objective2C2100Transport)/(2100-2020)*(year-2020);
  }

  getObjectiveTransport (){
    let objCO2Str = localStorage.objectiveCO2;
    if (objCO2Str){
      return parseInt(objCO2Str, 10);
    } else {
      return Math.round(this.objectiveYearToCO2(new Date().getFullYear()));
    }
  }
}
