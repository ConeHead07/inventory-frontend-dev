import {EventEmitter, Injectable} from '@angular/core';
import {DBDIVariables, DexieService} from '../../dexie.service';
import {BasedataService} from '../../basedata.service';
import Dexie from 'dexie';

export enum SettingsChangeAction {
  Insert,
  Update,
  Delete,
  SetProperty,
  AddListItem,
  AppendString
}

export interface SettingsChanged {
  name: string;
  action: SettingsChangeAction;
  varType: any;
  oldValue?: any;
  newValue?: any;
  oldSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VariablesService {
  variables?: Dexie.Table<DBDIVariables, any>;
  watchVariables: string[] = [];
  varChanged = new EventEmitter<SettingsChanged>();

  constructor(private db: DexieService, private baseData: BasedataService) {
    this.variables = this.db.variables;
    this.get('Settings.watchVariables', []).then( watchVars => {
      this.watchVariables = watchVars;
    });
  }

  public watch(...watchNames: string[]) {
    watchNames.forEach( (name) => {
      if (!this.watchVariables.find( (alreadyWatched) => alreadyWatched === name)) {
        this.watchVariables.push(name);
      }
    });
    this.set('Settings.watchVariables', this.watchVariables);
  }

  public unwatch(...unwatchNames: string[]) {
    this.watchVariables = this.watchVariables.filter(
      (alreadyWatched) => unwatchNames.indexOf(alreadyWatched) === -1
    );
    this.set('Settings.watchVariables', this.watchVariables);
  }

  private async checkWatchVar(name: string, action: SettingsChangeAction, newValue?: any, oldValue?: any) {
    if (!this.watchVariables.find( (watchVar) => watchVar === name)) {
      return;
    }

    const checkVal = (action !== SettingsChangeAction.Delete) ? newValue : oldValue;
    let varType = 'any';

    if (checkVal === undefined) {
      varType = 'undefined';
    } else if (typeof checkVal === null) {
      varType = 'null';
    } else {
      varType = checkVal.constructor.name;
    }

    this.varChanged.emit({
      name,
      action,
      varType,
      newValue,
      oldValue:
        (action !== SettingsChangeAction.AddListItem
          && action !== SettingsChangeAction.AppendString) ? oldValue : null,
      oldSize:
        (action === SettingsChangeAction.AddListItem
          || action === SettingsChangeAction.AppendString) ? oldValue : null
    });
  }

  public async getAll(): Promise<DBDIVariables[]> {
    return this.variables.toArray();
  }

  public async set(name: string, value: any, logComment: string = ''): Promise<boolean> {
    let oldVal;
    let action = SettingsChangeAction.Insert;
    if (await this.has(name)) {
      oldVal = await this.get(name);
      action = SettingsChangeAction.Update;
    }
    if (name === 'jobid-2-revision-id' && value === 0 || oldVal > value) {
      const err = 'Fehlerhafter Zugriff: Wert von ' + name + ' wurde versucht herunterzusetzen von ' + oldVal + ' auf ' + value;
      console.error( err );
      alert( err );
      return;
    }
    const success = await this.variables.put({name, value})
      .then(() => {
        if (name === 'jobid-2-revision-id') {
          console.log('changed variable: ', { name, value, action, oldVal }, logComment);
        }
        this.checkWatchVar(name, action, value, oldVal);
        return true;
      })
      .catch((err) => false);

    return success;
  }

  public async get(name: string, defaultValue: any = null): Promise<any> {
    return this.variables.get( name ).then( item => item.value).catch( (err) => defaultValue );
  }

  public async has(name: string): Promise<boolean> {
    return 0 < ( await this.variables.where({name}).count() );
  }

  public async delete(name: string): Promise<boolean> {
    if (!(await this.has(name))) {
      return true;
    }
    const oldVal = await this.get(name);
    if (0 < await this.variables.where( { name } ).delete()) {
      this.checkWatchVar(name, SettingsChangeAction.Delete, null, oldVal);
      return true;
    }
    return false;
  }

  private toKeyValueObject(key: string, value: any): object {
    const obj = {};
    obj[key] = value;
    return obj;
  }

  public async setObjectPropery(name: string, propertyName: string, propertyValue): Promise<boolean> {
    const obj = await this.get(name, {});
    const oldVal = this.toKeyValueObject(propertyName, (propertyName in obj) ? obj[propertyName] : undefined);
    const newVal = this.toKeyValueObject(propertyName, propertyValue);
    obj[propertyName] = propertyValue;
    await this.set(name, obj);
    this.checkWatchVar(name, SettingsChangeAction.SetProperty, newVal, oldVal);
    return true;
  }

  public async appendListItem<T>(name: string, item: T): Promise<number> {
    const list: T[] = await this.get(name, []);
    list.push(item);
    await this.set(name, list);
    this.checkWatchVar(name, SettingsChangeAction.AddListItem, item, list.length - 1);
    return list.length;
  }

  public async appendString(name: string, append: string, sep: string = ''): Promise<boolean> {
    const oldStr = await this.get(name, '');
    if (oldStr) {
      await this.set(name, oldStr + sep + append);
    } else {
      await this.set(name, append);
    }
    this.checkWatchVar(name, SettingsChangeAction.AppendString, append, oldStr.length);

    return true;
  }

  public async isEqual(name, compare: any): Promise<boolean> {
    return compare === await this.get(name);
  }
}
