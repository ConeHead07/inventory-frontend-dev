import { Injectable } from '@angular/core';
import { ClientModel } from '../models/client.model';
import { BuildingModel } from '../models/building.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor() { }

  public function;
  getSelectedRoom() {

  }

  getClient(clientID: number): ClientModel | null {
    const clients = this.getClientList();
    const fclients = clients.filter( client => client.mid === clientID);
    console.log( { clientID, clients, fclients });
    return fclients.length ? fclients[0] : null;
  }

  getBuilding(bldgID: number, clientID: number): BuildingModel | null {
    const bldgs = this.getBuildingList(clientID);
    const fbldgs = bldgs.filter( bldg => bldg.gid === bldgID);
    console.log( { bldgID, clientID, bldgs, fbldgs });
    return fbldgs.length ? fbldgs[0] : null;
  }

  public getClientList(): ClientModel[] {

    return [
            {
              mid: 1,
              uid: 1400,
              Mandant: 'Vodafone',
              created_at: new Date(new Date('2020-02-01 21:38:44')),
              modified_at: null,
              created_uid: 0,
              modified_uid: 0
            },
            {
              mid: 3,
              uid: 1100,
              Mandant: 'Rheienergie',
              created_at: new Date(new Date('2020-02-01 21:38:44')),
              modified_at: null,
              created_uid: 0,
              modified_uid: 0
            },
            {
              mid: 4,
              uid: 1300,
              Mandant: 'Manpower',
              created_at: new Date(new Date('2020-02-01 21:38:44')),
              modified_at: null,
              created_uid: 0,
              modified_uid: 0
            },
            {
              mid: 5,
              uid: 1200,
              Mandant: 'APO Bank',
              created_at: new Date(new Date('2020-02-01 21:38:44')),
              modified_at: null,
              created_uid: 0,
              modified_uid: 0
            },
            {
              mid: 6,
              uid: 1500,
              Mandant: 'Rheinmetall',
              created_at: new Date(new Date('2020-02-01 21:38:44')),
              modified_at: null,
              created_uid: 0,
              modified_uid: 0
            },
            {
              mid: 10,
              uid: 1600,
              Mandant: 'APO-Data',
              created_at: new Date(new Date('2020-02-05 08:27:00')),
              modified_at: new Date(new Date('2020-02-01 21:43:36')),
              created_uid: 0,
              modified_uid: 0
            },
            {
              mid: 11,
              uid: 1000,
              Mandant: 'RTL-Köln',
              created_at: new Date(new Date('2020-02-05 08:27:00')),
              modified_at: new Date(new Date('2020-02-01 21:43:36')),
              created_uid: 0,
              modified_uid: 0
            },
            {
              mid: 12,
              uid: 1700,
              Mandant: 'Mertens',
              created_at: new Date(new Date('2020-02-05 08:27:00')),
              modified_at: new Date(new Date('2020-02-01 21:43:36')),
              created_uid: 0,
              modified_uid: 0
            }
    ];
  }

  getBuildingList(clientID: number): BuildingModel[] {
    return [
            {
              gid: 1,
              mid: 1,
              Gebaeude: '11.1',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 2,
              mid: 1,
              Gebaeude: '11.3',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 3,
              mid: 1,
              Gebaeude: '11_1',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 4,
              mid: 1,
              Gebaeude: '11_2',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 5,
              mid: 1,
              Gebaeude: '12',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 6,
              mid: 1,
              Gebaeude: 'A',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 7,
              mid: 1,
              Gebaeude: 'B',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 8,
              mid: 1,
              Gebaeude: 'C',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 9,
              mid: 1,
              Gebaeude: 'Campus',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 10,
              mid: 1,
              Gebaeude: 'Hochhaus',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 11,
              mid: 1,
              Gebaeude: 'RHEINENERGIE',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 12,
              mid: 2,
              Gebaeude: 'Standard',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 13,
              mid: 3,
              Gebaeude: '10',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 14,
              mid: 3,
              Gebaeude: '11',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 15,
              mid: 3,
              Gebaeude: '11.1',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 16,
              mid: 3,
              Gebaeude: '11.2',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 17,
              mid: 3,
              Gebaeude: '11.3',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 18,
              mid: 3,
              Gebaeude: '11.3/E071.1S',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 19,
              mid: 3,
              Gebaeude: '11.4',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 20,
              mid: 3,
              Gebaeude: '11.5',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 21,
              mid: 3,
              Gebaeude: '11.6',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 22,
              mid: 3,
              Gebaeude: '11_1',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 23,
              mid: 3,
              Gebaeude: '11_2',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 24,
              mid: 3,
              Gebaeude: '11_3',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 25,
              mid: 3,
              Gebaeude: '11_4',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 26,
              mid: 3,
              Gebaeude: '11_5',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 27,
              mid: 3,
              Gebaeude: '11_6',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 28,
              mid: 3,
              Gebaeude: '12',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 29,
              mid: 3,
              Gebaeude: '13',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 30,
              mid: 3,
              Gebaeude: '14',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 31,
              mid: 3,
              Gebaeude: '20',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 32,
              mid: 3,
              Gebaeude: '21',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 33,
              mid: 3,
              Gebaeude: '22',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 34,
              mid: 3,
              Gebaeude: '23',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 35,
              mid: 3,
              Gebaeude: '24',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 36,
              mid: 3,
              Gebaeude: '30',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 37,
              mid: 3,
              Gebaeude: '31',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 38,
              mid: 3,
              Gebaeude: '32',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 39,
              mid: 3,
              Gebaeude: '33',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 40,
              mid: 3,
              Gebaeude: '33/A 110',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 41,
              mid: 3,
              Gebaeude: '34',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 42,
              mid: 3,
              Gebaeude: '35',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 43,
              mid: 3,
              Gebaeude: '36',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 44,
              mid: 3,
              Gebaeude: '38',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 45,
              mid: 3,
              Gebaeude: '38/E01',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 46,
              mid: 3,
              Gebaeude: '39',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 47,
              mid: 3,
              Gebaeude: '40',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 48,
              mid: 3,
              Gebaeude: '40/122',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 49,
              mid: 3,
              Gebaeude: '41',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 50,
              mid: 3,
              Gebaeude: '41/E 16',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 51,
              mid: 3,
              Gebaeude: '42',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 52,
              mid: 3,
              Gebaeude: '50',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 53,
              mid: 3,
              Gebaeude: '51',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 54,
              mid: 3,
              Gebaeude: '52',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 55,
              mid: 3,
              Gebaeude: '53',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 56,
              mid: 3,
              Gebaeude: '54',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 57,
              mid: 3,
              Gebaeude: '60',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 58,
              mid: 3,
              Gebaeude: '61',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 59,
              mid: 3,
              Gebaeude: '64',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 60,
              mid: 3,
              Gebaeude: '66',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 61,
              mid: 3,
              Gebaeude: '68',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 62,
              mid: 3,
              Gebaeude: '70',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 63,
              mid: 3,
              Gebaeude: '70/E02',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 64,
              mid: 3,
              Gebaeude: '81',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 65,
              mid: 3,
              Gebaeude: '83',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 66,
              mid: 3,
              Gebaeude: '99',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 67,
              mid: 3,
              Gebaeude: 'Außenflächen',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 68,
              mid: 3,
              Gebaeude: 'HLS131 42',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 69,
              mid: 3,
              Gebaeude: 'KUZ',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 70,
              mid: 3,
              Gebaeude: 'SSH',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 71,
              mid: 3,
              Gebaeude: 'Standard',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 72,
              mid: 4,
              Gebaeude: 'Aachen',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 73,
              mid: 4,
              Gebaeude: 'Aschaffenburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 74,
              mid: 4,
              Gebaeude: 'Augsburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 75,
              mid: 4,
              Gebaeude: 'Bautzen',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 76,
              mid: 4,
              Gebaeude: 'Berlin',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 77,
              mid: 4,
              Gebaeude: 'Biberach',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 78,
              mid: 4,
              Gebaeude: 'Bielefeld',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 79,
              mid: 4,
              Gebaeude: 'Brandenburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 80,
              mid: 4,
              Gebaeude: 'Braunschweig',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 81,
              mid: 4,
              Gebaeude: 'Bremen',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 82,
              mid: 4,
              Gebaeude: 'Chemnitz',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 83,
              mid: 4,
              Gebaeude: 'Coburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 84,
              mid: 4,
              Gebaeude: 'Cottbus',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 85,
              mid: 4,
              Gebaeude: 'Deggendorf',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 86,
              mid: 4,
              Gebaeude: 'Dessau',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 87,
              mid: 4,
              Gebaeude: 'Dortmund',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 88,
              mid: 4,
              Gebaeude: 'Dresden',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 89,
              mid: 4,
              Gebaeude: 'Düsseldorf',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 90,
              mid: 4,
              Gebaeude: 'Einbeck',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 91,
              mid: 4,
              Gebaeude: 'Eisenach',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 92,
              mid: 4,
              Gebaeude: 'Erfurt',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 93,
              mid: 4,
              Gebaeude: 'Eschborn',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 94,
              mid: 4,
              Gebaeude: 'Frankfurt a.M.',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 95,
              mid: 4,
              Gebaeude: 'Freiburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 96,
              mid: 4,
              Gebaeude: 'Friedberg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 97,
              mid: 4,
              Gebaeude: 'Fulda',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 98,
              mid: 4,
              Gebaeude: 'Gießen',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 99,
              mid: 4,
              Gebaeude: 'Goslar',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 100,
              mid: 4,
              Gebaeude: 'Göttingen',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 101,
              mid: 4,
              Gebaeude: 'Halberstadt',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 102,
              mid: 4,
              Gebaeude: 'Haldensleben',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 103,
              mid: 4,
              Gebaeude: 'Halle',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 104,
              mid: 4,
              Gebaeude: 'Hamburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 105,
              mid: 4,
              Gebaeude: 'Hanau',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 106,
              mid: 4,
              Gebaeude: 'Hann. Múnden',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 107,
              mid: 4,
              Gebaeude: 'Hannover',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 108,
              mid: 4,
              Gebaeude: 'Heidelberg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 109,
              mid: 4,
              Gebaeude: 'Heidenheim',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 110,
              mid: 4,
              Gebaeude: 'Heilbad Heiligenstad',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 111,
              mid: 4,
              Gebaeude: 'Henningsdorf',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 112,
              mid: 4,
              Gebaeude: 'Jena',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 113,
              mid: 4,
              Gebaeude: 'Karlsruhe',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 114,
              mid: 4,
              Gebaeude: 'Kassel',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 115,
              mid: 4,
              Gebaeude: 'Kaufbeuren',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 116,
              mid: 4,
              Gebaeude: 'Kempten',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 117,
              mid: 4,
              Gebaeude: 'Köln',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 118,
              mid: 4,
              Gebaeude: 'Lahr',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 119,
              mid: 4,
              Gebaeude: 'Landsberg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 120,
              mid: 4,
              Gebaeude: 'Landshut',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 121,
              mid: 4,
              Gebaeude: 'Leipzig',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 122,
              mid: 4,
              Gebaeude: 'Lindenberg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 123,
              mid: 4,
              Gebaeude: 'Ludwigsburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 124,
              mid: 4,
              Gebaeude: 'Lörrach',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 125,
              mid: 4,
              Gebaeude: 'Magdeburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 126,
              mid: 4,
              Gebaeude: 'Mainz',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 127,
              mid: 4,
              Gebaeude: 'Mannheim',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 128,
              mid: 4,
              Gebaeude: 'Memmingen',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 129,
              mid: 4,
              Gebaeude: 'München',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 130,
              mid: 4,
              Gebaeude: 'Nienburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 131,
              mid: 4,
              Gebaeude: 'Nordhausen',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 132,
              mid: 4,
              Gebaeude: 'Nürnberg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 133,
              mid: 4,
              Gebaeude: 'Potsdam',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 134,
              mid: 4,
              Gebaeude: 'Rastatt',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 135,
              mid: 4,
              Gebaeude: 'Ravensburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 136,
              mid: 4,
              Gebaeude: 'Regensburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 137,
              mid: 4,
              Gebaeude: 'Rudolstadt',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 138,
              mid: 4,
              Gebaeude: 'Saarbrücken',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 139,
              mid: 4,
              Gebaeude: 'Schongau',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 140,
              mid: 4,
              Gebaeude: 'Schweinfurt',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 141,
              mid: 4,
              Gebaeude: 'Schwerin',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 142,
              mid: 4,
              Gebaeude: 'Standard',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 143,
              mid: 4,
              Gebaeude: 'Stuttgart',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 144,
              mid: 4,
              Gebaeude: 'Suhl',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 145,
              mid: 4,
              Gebaeude: 'Trier',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 146,
              mid: 4,
              Gebaeude: 'Ulm',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 147,
              mid: 4,
              Gebaeude: 'Wangen',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 148,
              mid: 4,
              Gebaeude: 'Wiesbaden',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 149,
              mid: 4,
              Gebaeude: 'Wolfsburg',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 150,
              mid: 4,
              Gebaeude: 'Worms',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 151,
              mid: 4,
              Gebaeude: 'Zwickau',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 152,
              mid: 5,
              Gebaeude: 'AWE00D0A1-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 153,
              mid: 5,
              Gebaeude: 'AWE00D0A1-A114',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 154,
              mid: 5,
              Gebaeude: 'AWE00D0A1-A126',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 155,
              mid: 5,
              Gebaeude: 'AWE00D0A1-A130',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 156,
              mid: 5,
              Gebaeude: 'AWE00D0A1-A138',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 157,
              mid: 5,
              Gebaeude: 'AWE00D0A2-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 158,
              mid: 5,
              Gebaeude: 'AWE00D0A3-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 159,
              mid: 5,
              Gebaeude: 'AWE00D0A4-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 160,
              mid: 5,
              Gebaeude: 'AWE00D0A4-A450',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 161,
              mid: 5,
              Gebaeude: 'AWE00D0A4-A453',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 162,
              mid: 5,
              Gebaeude: 'AWE00D0A4-A456',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 163,
              mid: 5,
              Gebaeude: 'AWE00D0AE-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 164,
              mid: 5,
              Gebaeude: 'AWE00D0B1-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 165,
              mid: 5,
              Gebaeude: 'AWE00D0B2-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 166,
              mid: 5,
              Gebaeude: 'AWE00D0B2-B204',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 167,
              mid: 5,
              Gebaeude: 'AWE00D0B2-B208',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 168,
              mid: 5,
              Gebaeude: 'AWE00D0B2-B213',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 169,
              mid: 5,
              Gebaeude: 'AWE00D0B2-B251',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 170,
              mid: 5,
              Gebaeude: 'AWE00D0B2-B255',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 171,
              mid: 5,
              Gebaeude: 'AWE00D0B4-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 172,
              mid: 5,
              Gebaeude: 'AWE00D0B4-B403',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 173,
              mid: 5,
              Gebaeude: 'AWE00D0B4-B406',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 174,
              mid: 5,
              Gebaeude: 'AWE00D0B4-B409',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 175,
              mid: 5,
              Gebaeude: 'AWE00D0B5-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 176,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B511',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 177,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B513',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 178,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B515',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 179,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B524',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 180,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B526',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 181,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B529',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 182,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B531',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 183,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B540',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 184,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B542',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 185,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B545',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 186,
              mid: 5,
              Gebaeude: 'AWE00D0B5-B548',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 187,
              mid: 5,
              Gebaeude: 'AWE00D0BE-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 188,
              mid: 5,
              Gebaeude: 'AWE00D0C1-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 189,
              mid: 5,
              Gebaeude: 'AWE00D0C2-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 190,
              mid: 5,
              Gebaeude: 'AWE00D0C3-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 191,
              mid: 5,
              Gebaeude: 'AWE00D0C3-C308',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 192,
              mid: 5,
              Gebaeude: 'AWE00D0C3-C310',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 193,
              mid: 5,
              Gebaeude: 'AWE00D0C3-C316',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 194,
              mid: 5,
              Gebaeude: 'AWE00D0C4-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 195,
              mid: 5,
              Gebaeude: 'AWE00D0C6-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 196,
              mid: 5,
              Gebaeude: 'AWE00D0CE-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 197,
              mid: 5,
              Gebaeude: 'AWE00D0D1-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 198,
              mid: 5,
              Gebaeude: 'AWE00D0D2-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 199,
              mid: 5,
              Gebaeude: 'AWE00D0D2-D210',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 200,
              mid: 5,
              Gebaeude: 'AWE00D0D3-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 201,
              mid: 5,
              Gebaeude: 'AWE00D0D3-D352',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 202,
              mid: 5,
              Gebaeude: 'AWE00D0D3-D359',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 203,
              mid: 5,
              Gebaeude: 'AWE00D0D3-D366',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 204,
              mid: 5,
              Gebaeude: 'AWE00D0D4-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 205,
              mid: 5,
              Gebaeude: 'AWE00D0D4-D425',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 206,
              mid: 5,
              Gebaeude: 'AWE00D0DE-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 207,
              mid: 5,
              Gebaeude: 'AWE00D0E1-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 208,
              mid: 5,
              Gebaeude: 'AWE00D0E2-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 209,
              mid: 5,
              Gebaeude: 'AWE00D0E3-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 210,
              mid: 5,
              Gebaeude: 'AWE00D0E4-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 211,
              mid: 5,
              Gebaeude: 'AWE00D0E4-E458',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 212,
              mid: 5,
              Gebaeude: 'AWE00D0E4-E462',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 213,
              mid: 5,
              Gebaeude: 'AWE00D0E5-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 214,
              mid: 5,
              Gebaeude: 'AWE00D0E6-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 215,
              mid: 5,
              Gebaeude: 'AWE00D0EE-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 216,
              mid: 5,
              Gebaeude: 'AWE00D0U1-',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 217,
              mid: 5,
              Gebaeude: 'AWE00K1EG-Riehler Str. 34',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 218,
              mid: 5,
              Gebaeude: 'AWE00K1O1-Riehler Str. 34',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 219,
              mid: 5,
              Gebaeude: 'AWE00K1O2-Riehler Str. 34',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 220,
              mid: 5,
              Gebaeude: 'AWE00K1O3-Riehler Str. 34',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 221,
              mid: 5,
              Gebaeude: 'AWE00K1O4-Riehler Str. 34',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 222,
              mid: 5,
              Gebaeude: 'AWE00K1O5-Riehler Str. 34',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 223,
              mid: 5,
              Gebaeude: 'AWE00K1U2-Riehler Str. 34',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 224,
              mid: 5,
              Gebaeude: 'AWE00K2EG-Riehler Str. 36',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 225,
              mid: 5,
              Gebaeude: 'AWE00K2U1-Riehler Str. 36',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 226,
              mid: 10,
              Gebaeude: 'Beispielgebäude',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 227,
              mid: 10,
              Gebaeude: 'Düsseldorf',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 228,
              mid: 10,
              Gebaeude: 'Hannover',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            },
            {
              gid: 229,
              mid: 12,
              Gebaeude: 'Willich',
              Adresse: '',
              created_at: new Date('2020-02-02 01:48:32'),
              modified_at: null,
              created_uid: 0,
              modified_uid: null
            }
    ].filter( b => b.mid === clientID);
  }
}
