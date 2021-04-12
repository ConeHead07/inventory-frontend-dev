import {Injectable} from '@angular/core';


interface Tone {
  taste: number;
  en: string;
  de: string;
  freq: number;
}

const tempo = {
  n1: 1000,
  n2: 500,
  n3: 750,
  n4: 250,
  n8: 125,
  n16: 62.5,
  n32: 31.75
};

const tones: Tone[] = [
  { taste: 1, en: 'A0', de: 'A2', freq: 27.5 },
  { taste: 2, en: 'A#0/Bb0', de: 'Ais2/B2', freq: 29.1352 },
  { taste: 3, en: 'B0', de: 'H2', freq: 30.8677 },
  { taste: 4, en: 'C1', de: 'C1', freq: 32.7032 },
  { taste: 5, en: 'C#1/Db1', de: 'Cis1/Des1', freq: 34.6478 },
  { taste: 6, en: 'D1', de: 'D1', freq: 36.7081 },
  { taste: 7, en: 'D#1/Eb1', de: 'Dis1/Es1', freq: 38.8909 },
  { taste: 8, en: 'E1', de: 'E1', freq: 41.2034 },
  { taste: 9, en: 'F1', de: 'F1', freq: 43.6535 },
  { taste: 10, en: 'F#1/Gb1', de: 'Fis1/Ges1', freq: 46.2493 },
  { taste: 11, en: 'G1', de: 'G1', freq: 48.9994 },
  { taste: 12, en: 'G#1/Ab1', de: 'Gis1/As1', freq: 51.9131 },
  { taste: 13, en: 'A1', de: 'A1', freq: 55 },
  { taste: 14, en: 'A#1/Bb1', de: 'Ais1/B1', freq: 58.2705 },
  { taste: 15, en: 'B1', de: 'H1', freq: 61.7354 },
  { taste: 16, en: 'C2', de: 'C', freq: 65.4064 },
  { taste: 17, en: 'C#2/Db2', de: 'Cis/Des', freq: 69.2957 },
  { taste: 18, en: 'D2', de: 'D', freq: 73.4162 },
  { taste: 19, en: 'D#2/Eb2', de: 'Dis/Es', freq: 77.7817 },
  { taste: 20, en: 'E2', de: 'E', freq: 82.4069 },
  { taste: 21, en: 'F2', de: 'F', freq: 87.3071 },
  { taste: 22, en: 'F#2/Gb2', de: 'Fis/Ges', freq: 92.4986 },
  { taste: 23, en: 'G2', de: 'G', freq: 97.9989 },
  { taste: 24, en: 'G#2/Ab2', de: 'Gis/As', freq: 103.826 },
  { taste: 25, en: 'A2', de: 'A', freq: 110 },
  { taste: 26, en: 'A#2/Bb2', de: 'Ais/B', freq: 116.541 },
  { taste: 27, en: 'B2', de: 'H', freq: 123.471 },
  { taste: 28, en: 'C3', de: 'c', freq: 130.813 },
  { taste: 29, en: 'C#3/Db3', de: 'cis/des', freq: 138.591 },
  { taste: 30, en: 'D3', de: 'd', freq: 146.832 },
  { taste: 31, en: 'D#3/Eb3', de: 'dis/es', freq: 155.563 },
  { taste: 32, en: 'E3', de: 'e', freq: 164.814 },
  { taste: 33, en: 'F3', de: 'f', freq: 174.614 },
  { taste: 34, en: 'F#3/Gb3', de: 'fis/ges', freq: 184.997 },
  { taste: 35, en: 'G3', de: 'g', freq: 195.998 },
  { taste: 36, en: 'G#3/Ab3', de: 'gis/as', freq: 207.652 },
  { taste: 37, en: 'A3', de: 'a', freq: 220 },
  { taste: 38, en: 'A#3/Bb3', de: 'ais/b', freq: 233.082 },
  { taste: 39, en: 'B3', de: 'h', freq: 246.942 },
  { taste: 40, en: 'C4[3]', de: 'c1', freq: 261.626 },
  { taste: 41, en: 'C#4/Db4', de: 'cis1/des1', freq: 277.183 },
  { taste: 42, en: 'D4', de: 'd1', freq: 293.665 },
  { taste: 43, en: 'D#4/Eb4', de: 'dis1/es1', freq: 311.127 },
  { taste: 44, en: 'E4', de: 'e1', freq: 329.628 },
  { taste: 45, en: 'F4', de: 'f1', freq: 349.228 },
  { taste: 46, en: 'F#4/Gb4', de: 'fis1/ges1', freq: 369.994 },
  { taste: 47, en: 'G4', de: 'g1', freq: 391.995 },
  { taste: 48, en: 'G#4/Ab4', de: 'gis1/as1', freq: 415.305 },
  { taste: 49, en: 'A4[2]', de: 'a1 Kammerton', freq: 440 },
  { taste: 50, en: 'A#4/Bb4', de: 'ais1/b1', freq: 466.164 },
  { taste: 51, en: 'B4', de: 'h1', freq: 493.883 },
  { taste: 52, en: 'C5', de: 'c2', freq: 523.251 },
  { taste: 53, en: 'C#5/Db5', de: 'cis2/des2', freq: 554.365 },
  { taste: 54, en: 'D5', de: 'd2', freq: 587.33 },
  { taste: 55, en: 'D#5/Eb5', de: 'dis2/es2', freq: 622.254 },
  { taste: 56, en: 'E5', de: 'e2', freq: 659.255 },
  { taste: 57, en: 'F5', de: 'f2', freq: 698.456 },
  { taste: 58, en: 'F#5/Gb5', de: 'fis2/ges2', freq: 739.989 },
  { taste: 59, en: 'G5', de: 'g2', freq: 783.991 },
  { taste: 60, en: 'G#5/Ab5', de: 'gis2/as2', freq: 830.609 },
  { taste: 61, en: 'A5', de: 'a2', freq: 880 },
  { taste: 62, en: 'A#5/Bb5', de: 'ais2/b2', freq: 932.328 },
  { taste: 63, en: 'B5', de: 'h2', freq: 987.767 },
  { taste: 64, en: 'C6', de: 'c3', freq: 1046.5 },
  { taste: 65, en: 'C#6/Db6', de: 'cis3/des3', freq: 1108.73 },
  { taste: 66, en: 'D6', de: 'd3', freq: 1174.66 },
  { taste: 67, en: 'D#6/Eb6', de: 'dis3/es3', freq: 1244.51 },
  { taste: 68, en: 'E6', de: 'e3', freq: 1318.51 },
  { taste: 69, en: 'F6', de: 'f3', freq: 1396.91 },
  { taste: 70, en: 'F#6/Gb6', de: 'fis3/ges3', freq: 1479.98 },
  { taste: 71, en: 'G6', de: 'g3', freq: 1567.98 },
  { taste: 72, en: 'G#6/Ab6', de: 'gis3/as3', freq: 1661.22 },
  { taste: 73, en: 'A6', de: 'a3', freq: 1760 },
  { taste: 74, en: 'A#6/Bb6', de: 'ais3/b3', freq: 1864.66 },
  { taste: 75, en: 'B6', de: 'h3', freq: 1975.53 },
  { taste: 76, en: 'C7', de: 'c4', freq: 2093 },
  { taste: 77, en: 'C#7/Db7', de: 'cis4/des4', freq: 2217.46 },
  { taste: 78, en: 'D7', de: 'd4', freq: 2349.32 },
  { taste: 79, en: 'D#7/Eb7', de: 'dis4/es4', freq: 2489.02 },
  { taste: 80, en: 'E7', de: 'e4', freq: 2637.02 },
  { taste: 81, en: 'F7', de: 'f4', freq: 2793.83 },
  { taste: 82, en: 'F#7/Gb7', de: 'fis4/ges4', freq: 2959.96 },
  { taste: 83, en: 'G7', de: 'g4', freq: 3135.96 },
  { taste: 84, en: 'G#7/Ab7', de: 'gis4/as4', freq: 3322.44 },
  { taste: 85, en: 'A7', de: 'a4', freq: 3520 },
  { taste: 86, en: 'A#7/Bb7', de: 'ais4/b4', freq: 3729.31 },
  { taste: 87, en: 'B7', de: 'h4', freq: 3951.07 },
  { taste: 88, en: 'C8', de: 'c5', freq: 4186.01 }
];

@Injectable({
  providedIn: 'root'
})
export class SoundsService {
  success: HTMLAudioElement;
  error: HTMLAudioElement;

  constructor() {
    this.success = new Audio();
    this.success.src = '../assets/googlesounds/notification_simple-01.mp3';
    this.success.autoplay = true;
    this.success.muted = true;
    this.success.load();

    this.error = new Audio();
    this.error.src = '../assets/googlesounds/alert_error-01.mp3';
    this.error.autoplay = true;
    this.error.muted = true;
    this.error.load();
  }

  getSuccessSrc(): string {
    return this.success.src;
  }

  getErrorSrc(): string {
    return this.error.src;
  }

  async playSuccess(): Promise<void> {
    this.success.muted = false;
    this.success.play();
  }

  async playError(): Promise<void> {
    this.error.muted = false;
    this.error.play();
  }
}
