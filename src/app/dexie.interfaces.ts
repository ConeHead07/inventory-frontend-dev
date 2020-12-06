
export interface DBDITableWithBarcode {
  code?: string;
  uuid?: string;
  for_jobid?: number;
}

export enum DBDIRaumEditStatus {
  Init = 0,
  Started = 1,
  Closed = 2
}
/**
 * @PREFIX DBDI DataBasaDataInterface
 */
export interface DBDIClientChangeLog {
  id?: number;
  jobid?: number;
  timestamp: Date;
  table: string;
  type: number;
  key: number;
  uuid?: string;
  obj?: any;
  oldObj?: any;
  mods?: any;
  mid?: number;
  uid?: number;
  devid?: string;
  sync_attempts?: number;
  sync_lastattempt?: Date;
  sync_time?: Date;
  sync_done: number;
}

export interface DBDIDevices {
  id?: number;
  name: string;
  user_agent?: string;
  created_uid: string;
  created_at: Date;
  modified_uid?: string;
  modified_at?: Date;
}

export interface DBDIGebaeude {
  gid: number;
  mid: number;
  mandanten_id: number;
  Gebaeude: string;
  Adresse: string;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
}

export interface DBDIHersteller {
  hid?: number;
  uuid?: string;
  for_jobid?: number;
  Hersteller: string;
  created_at?: Date;
  updated_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_jobid?: number;
  modified_jobid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  log?: boolean;
}

export interface DBDIInventar extends DBDITableWithBarcode {
  ivid?: number;
  mcid: number;
  uuid?: string;
  for_jobid?: number;
  mcuuid?: string;
  hash?: string;
  code?: string;
  rid: number;
  ruuid?: number;
  rid_init?: number;
  rid_neu?: number;
  Bezeichnung?: string;
  Typ?: string;
  Kategorie?: string;
  Farbe?: string;
  Groesse?: string;
  Zustand?: string;
  Seriennr?: string;
  jobid: number;
  invid?: string;
  iv_nr?: string;
  ErsteAufnahmeAm?: Date;
  LetzteAufnahmeAm?: Date;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_jobid?: number;
  modified_jobid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  log?: boolean;
}

export interface DBDIInventuren {
  jobid: number;
  mid?: number;
  gid?: number;
  Titel: string;
  Start: Date;
  aktiviert: number;
  AbgeschlossenAm?: Date;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
}

export interface DBDIInventurenGebaeude {
  jobid: number;
  gid: number;
  uid?: number;
}

export interface DBDIInventurenUser {
  jobid: number;
  uid: number;
}

export interface DBDILieferant {
  hid: number;
  Lieferant: string;
  created_at?: Date;
  updated_at?: Date;
  log?: boolean;
}

export interface DBDIMandanten {
  mid: number;
  Mandant: string;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
}

export interface DBDIObjektKatalogGlobal extends DBDITableWithBarcode {
  gcid?: number;
  uuid?: string;
  hash?: string;
  code?: string;
  hid?: number;
  huuid?: string;
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
  modified_uid?: number;
  created_jobid?: number;
  modified_jobid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  log?: boolean;
}

export interface DBDIObjektKatalogMandant extends DBDITableWithBarcode {
  mcid?: number;
  uuid?: string;
  gcid?: number;
  gcuuid?: string;
  for_jobid?: number;
  code?: string;
  mid: number;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_jobid?: number;
  modified_jobid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  log?: boolean;
}

export interface DBDIObjektKatalogImages {
  id?: number;
  uuid?: string;
  for_jobid?: number;
  RefTable: string;
  RefUuid: string;
  ImgUuid: string;
  RefText?: string;
  Pos: number;
  Kategorie: string;
  created_at: Date;
  created_uid?: number;
  created_jobid?: string;
  created_device_id?: number;
  modified_at?: Date;
  modified_uid?: number;
  modified_jobid?: string;
  modified_device_id?: number;
}


export interface DBDIRaeume extends DBDITableWithBarcode {
  rid?: number;
  gid: number;
  uuid?: string;
  for_jobid?: number;
  hash?: string;
  code?: string;
  raumid: string;
  Raum: string;
  Raumbezeichnung?: string;
  Etage?: string;
  current_jobid?: number;
  current_jobstatus?: DBDIRaumEditStatus;
  created_at: Date;
  modified_at?: Date;
  created_uid: number;
  modified_uid?: number;
  created_device_id?: number;
  modified_device_id?: number;
  created_jobid?: number;
  modified_jobid?: number;
  log?: boolean;
}

export interface DBDIImages {
  id?: number;
  uuid: string;
  for_jobid?: number;
  name: string;
  size: number;
  width: number;
  height: number;
  type: string;
  gcuuid: string;
  url?: string;
  data_binary?: string;
  data_url?: string;
  revnr: number;
  created_at: Date;
  created_uid: number;
  created_jobid: number;
  modified_at?: Date;
  modified_uid?: number;
  modified_jobid?: number;
  log?: boolean;
}

export interface DBDIUploads {
  id: number;
  uuid?: string;
  mid: number;
  standort?: string;
  importkey?: string;
  filename?: string;
  filesize?: number;
  checksum?: string;
  content?: string;
  stat?: string;
  errors?: string;
  created_at: Date;
  created_uid?: number;
  modified_at?: Date;
  modified_uid?: number;
}

export interface DBDIUsers {
  id: number;
  name: string;
  email: string;
  password: string;
  remember_token?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface DBDIObjektbuchBarcodesLookup {
  code: string;
  table: string;
  key: string;
  id: number;
  uuid: string;
  for_jobid: number;
  updateHelper: number;
}

/**
 * END SQL-GENERATED Interfaces
 */
export interface DBDIVariables {
  name: string;
  value?: any;
}

export interface DBDIBarcodeLookup {
  code: string;
  table: string;
  key: string;
  id?: number;
  uuid: string;
  for_jobid?: number;
  updateHelper?: number;
}

export enum LookupResultTable {
  None,
  Any,
  Inventar,
  Raeume,
  ObjektKatalogGlobal,
  ObjektKatalogMandant,
  Objektbuch
}

export interface BarcodeLookupSimpleResult {
  barcode: string;
  foundRef?: DBDIBarcodeLookup;
  success: boolean;
  lookupResultTable: LookupResultTable;
  data: null|DBDIInventar|DBDIObjektKatalogGlobal|DBDIObjektKatalogMandant|DBDIRaeume|DBDIObjektbuchBarcodesLookup;
  inventar?: DBDIInventar;
  gebaeude?: DBDIGebaeude;
  raum?: DBDIRaeume;
  artikelData?: DBDIObjektKatalogGlobal;
  artikelRef?: DBDIObjektKatalogMandant;
  image?: DBDIImages;
}

export interface DBDIArtikel extends DBDIObjektKatalogMandant, DBDIObjektKatalogGlobal {
  mcuuid?: string;
}
export interface DBDIArtikelMitHersteller extends DBDIArtikel {
  Hersteller?: string;
}

export interface DBDIRaumGebaeude extends DBDIRaeume, DBDIGebaeude {}

export enum LookupResultType {
  NoMatch,
  Inventar,
  Raum,
  ObjektBuchArtikel,
  ObjektBuchRaum
}

export interface LookupResult {
  type: LookupResultType;
  count?: number;
}

export interface LookupNoMatches extends LookupResult {
  type: LookupResultType.NoMatch;
  count?: 0;
}

export interface LookupAssignedObjektbuchArtikel extends LookupResult {
  type: LookupResultType.ObjektBuchArtikel;
  artikelRef: DBDIObjektKatalogMandant;
  artikelData: DBDIObjektKatalogGlobal;
}

export interface LookupAssignedObjektbuchRaum extends LookupResult {
  type: LookupResultType.ObjektBuchRaum;
  raum: DBDIRaeume;
  gebaeude: DBDIGebaeude;
}

export interface LookupAssignedInventar extends LookupResult {
  type: LookupResultType.Inventar;
  inventar: DBDIInventar;
  artikelRef: DBDIObjektKatalogMandant;
  artikelData: DBDIObjektKatalogGlobal;
}

export interface LookupAssignedRoom extends LookupResult {
  type: LookupResultType.Raum;
  raum: DBDIRaeume;
  gebaeude: DBDIGebaeude;
}

export type IUnionLookupAssignedObject = LookupAssignedInventar |
  LookupAssignedRoom |
  LookupAssignedObjektbuchArtikel |
  LookupAssignedObjektbuchRaum |
  LookupNoMatches;
