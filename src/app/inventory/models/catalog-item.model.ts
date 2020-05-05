export interface CatalogItemModel {
  gcid: number;
  hid?: number;
  lid?: number;
  Bezeichnung?: string;
  Produktnr?: string;
  Typ?: string;
  Gruppe?: string;
  Kategorie?: string;
  Farbe?: string;
  Groesse?: string;
  Bild?: string;
  AnlagenNr?: string;
  GeraetNr?: string;
  FibuNr?: string;
  Flaeche?: string;
  Gewicht?: string;
  Baujahr?: string;
  Kst?: string;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid: number;
}
