import { Component, OnInit } from '@angular/core';


interface Kunde {
  Name: string;
}

interface Gebaeude {
  Adresse: string;
}

interface Raum {
  Name: string;
  Nr: string;
}

interface InventarObjekt {
  barcode: string;
  Bezeichnung: string;
  ArtikelTyp: string;
}

interface RaumStatus {
  hasTotal: boolean;
  total: number;
  numDone: number;
}

@Component({
  selector: 'app-invent-form',
  templateUrl: './invent-form.component.html',
  styleUrls: ['./invent-form.component.scss']
})
export class InventFormComponent implements OnInit {

  public kunde: Kunde;
  public gebaeude: Gebaeude;
  public raum: Raum;
  public invObject: InventarObjekt;
  public raumStatus: RaumStatus;

  public kundeName = '';
  public adresse ? = '';
  public raumNr?: string;

  constructor() { }

  ngOnInit() {

  }

}
