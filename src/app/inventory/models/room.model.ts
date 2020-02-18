export interface RoomModel {
  rid: number;
  gid?: number;
  Raum: string;
  Raumbezeichnung?: string;
  Etage?: string;
  Flaeche_m2?: number;
  created?: Date;
  modified?: Date;
}
