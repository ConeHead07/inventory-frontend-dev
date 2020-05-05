export interface RoomModel {
  rid: number;
  gid?: number;
  raumid?: string;
  Raum: string;
  Raumbezeichnung?: string;
  Etage?: string;
  Flaeche_m2?: number;
  created_at?: Date;
  modified_at?: Date;
  created_uid?: number;
  modified_uid?: number;
}
