import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

import polyline from '@mapbox/polyline';
import urlencode from 'urlencode';

import { HttpClient } from '@angular/common/http';

export interface MapboxOutputSearchWord {
  attribution: string;
  features: Feature[];
  query: [];
}
export interface MapboxOutputItinary {
  routes: Itinary[];
  code: string;
}
export interface Itinary {
  distance: number;
  geometry: number[][];
  duration: number;
}
export interface Feature {
  place_name: string;
  center: number[];
}

@Injectable({
  providedIn: 'root'
})
export class MapService {

  MAPBOX_TOKEN = 'pk.eyJ1IjoiYW1hdGV3YXN1IiwiYSI6ImNrYXYzcnl6cDB4NGUycXB0OW1rNXMxN2cifQ.VYH28LCw2EJWdkmyp56k4Q';


  constructor(private http: HttpClient) { }

  decToHex = (dec) => (dec < 16 ? '0' : '') + dec.toString(16);
  hexToDec = (hex) => parseInt(hex, 16);

  rgbToHexString = (rgb) => this.decToHex(rgb[0]) + this.decToHex(rgb[1]) + this.decToHex(rgb[2])
  hexStringToRGB = (hexString) => {
    const s = hexString.replace('#', '');
    return [this.hexToDec(s.substr(0, 2)), this.hexToDec(s.substr(2, 2)), this.hexToDec(s.substr(4, 2))];
  }

  // sRGB: starting RGB color, like [255, 0, 0]
  // eRGB: ending RGB color, like [122, 122, 122]
  // numSteps: number of steps in the gradient
  createSpectrum(sRGB, eRGB, numSteps) {
    const colors = [];
    for (let i = 0; i < numSteps; i++) {
      const r = Math.round(((eRGB[0] - sRGB[0]) * i / numSteps)) + sRGB[0];
      const g = Math.round(((eRGB[1] - sRGB[1]) * i / numSteps)) + sRGB[1];
      const b = Math.round(((eRGB[2] - sRGB[2]) * i / numSteps)) + sRGB[2];
      colors.push(this.rgbToHexString([r, g, b]));
    }
    return colors;
  }

  makePathWithGradient(coords, spectrumColors) {
    const pathStrings = [];
    const strokeWidth = 8;
  
    for (let i = 0; i < coords.length - 1; i++) {
      let path = polyline.encode([[coords[i][1], coords[i][0]], [coords[i + 1][1], coords[i + 1][0]]]);
      pathStrings.push(`path-${strokeWidth}+${spectrumColors[i]}(${path})`); // format from https://docs.mapbox.com/api/maps/#path
    }
  
    return pathStrings.join(',');
  }

  gmapsCoordToArray(coord : string){
    let res = [];
    let points = coord.trim().split(" ");
    for (let point of points){
      let xy = point.split(",").map(el => parseFloat(el));
      res.push(xy);
    }
    return res;
  }

  itinaryToGmapsCoords(itinary: Itinary){
    let coords = (itinary as any).geometry.coordinates;
    let coordsStr = [];
    let coordsConstrain = this.limitArraySize(coords);
    for (let point of coordsConstrain){
      coordsStr.push(point[1] +","+ point[0]);
    }
    return coordsStr.join(" ");
  }

  generateMapURL(coordStr : string){
    let coords = this.gmapsCoordToArray(coordStr);

    const startColor = '#FF512F';
    const endColor = '#F09819';
    const width = 500; // px
    const height = 400; // px

    const colorA = this.hexStringToRGB(startColor);
    const colorB = this.hexStringToRGB(endColor);
    const spectrumColors = this.createSpectrum(colorA, colorB, coords.length - 1);

    const firstCoord = coords[0];
    const lastCoord = coords[coords.length - 1];
    const startMarker = `pin-s-a+${this.rgbToHexString(colorA)}(${firstCoord[0]},${firstCoord[1]})`;
    const endMarker = `pin-s-b+${this.rgbToHexString(colorB)}(${lastCoord[0]},${lastCoord[1]})`;

    const pathWithGradient = this.makePathWithGradient(coords, spectrumColors) + ',' + startMarker + ',' + endMarker;
    
    const url = `https://api.mapbox.com/styles/v1/mapbox/light-v9/static/${urlencode(pathWithGradient)}/auto/${width}x${height}?access_token=${this.MAPBOX_TOKEN}`;

    console.log(url);

    return url;
  }

  geometryToMapURL(geometry){
    let coords = this.limitArraySize(geometry.coordinates, 100);

    console.log(coords.length)

    const startColor = '#00E19B';
    const endColor = '#00A9FA';
    const width = 500; // px
    const height = 400; // px

    const colorA = this.hexStringToRGB(startColor);
    const colorB = this.hexStringToRGB(endColor);
    const spectrumColors = this.createSpectrum(colorA, colorB, coords.length - 1);

    const firstCoord = coords[0];
    const lastCoord = coords[coords.length - 1];
    const startMarker = `pin-s+${this.rgbToHexString(colorA)}(${firstCoord[0]},${firstCoord[1]})`;
    const endMarker = `pin-s+${this.rgbToHexString(colorB)}(${lastCoord[0]},${lastCoord[1]})`;

    const pathWithGradient = this.makePathWithGradient(coords, spectrumColors) + ',' + startMarker + ',' + endMarker;

    const url = `https://api.mapbox.com/styles/v1/mapbox/light-v9/static/${urlencode(pathWithGradient)}/auto/${width}x${height}?access_token=${this.MAPBOX_TOKEN}`;
    console.log(url);

    return url;
  }

  limitArraySize(arr : any[], maxSize? : number){
    if (maxSize === undefined) maxSize = 100;

    if (arr.length < maxSize){
      return arr;
    }

    let arr2 = [];
    for (let i = 0, l = arr.length; i < l; i++){
      if (i % 2 == 0){
        arr2.push(arr[i]);
      }
    }

    if (arr2.length > maxSize){
      return this.limitArraySize(arr2, maxSize);
    } else {
      return arr2;
    }
  }

  search_word(query: string){
    const token = this.MAPBOX_TOKEN;
    const lang = "fr-FR";
    const limit = 5;

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?type=address&language=${lang}&limit=${limit}&access_token=${token}`;

    return this.http.get(url)
              .pipe(map((res: MapboxOutputSearchWord) => {
                return res.features;
              }));
  }

  getItinary(coordsFrom, coordsTo, moveType?){
    if (!moveType) moveType = "driving";

    const token = this.MAPBOX_TOKEN;
    const profile = `mapbox/${moveType}`;
    const coordinates = `${coordsFrom};${coordsTo}`;

    const url = `https://api.mapbox.com/directions/v5/${profile}/${coordinates}?access_token=${token}&geometries=geojson`;
    console.log(coordsFrom, coordsTo);
    let a = this.http.get(url);
    return a;
  }

  distanceBetweenPoints(A, B){
    const lat1 = A[1];
    const lat2 = B[1];
    const lon1 = A[0];
    const lon2 = B[0];

    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // in metres

    return d;
  }
}
