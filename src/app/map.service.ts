import { Injectable } from '@angular/core';

import polyline from '@mapbox/polyline';
import urlencode from 'urlencode';


@Injectable({
  providedIn: 'root'
})
export class MapService {

  MAPBOX_TOKEN = 'pk.eyJ1IjoiYW1hdGV3YXN1IiwiYSI6ImNrYXYzcnl6cDB4NGUycXB0OW1rNXMxN2cifQ.VYH28LCw2EJWdkmyp56k4Q';


  constructor() { }

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
    const strokeWidth = 2;
  
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

    return url;
  }
}
