import { Injectable } from '@angular/core';
import {DexieService} from './dexie.service';
import {DBDIUsers} from '../interfaces/dexie.interfaces';

interface UserUpdateData {
  email?: DBDIUsers['email'];
  name?: DBDIUsers['name'];
  password?: DBDIUsers['password'];
  remember_token?: DBDIUsers['remember_token'];
  created_at?: DBDIUsers['created_at'];
  updated_at?: DBDIUsers['updated_at'];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private dexie: DexieService) {}

  async getByUid(id: number): Promise<DBDIUsers> {
    const user = await this.dexie.users.get(id);
    this.fitDateAttr(user);
    return user;
  }

  async put(user: DBDIUsers): Promise<number> {
    return this.dexie.users.put(user);
  }

  async update(id: number, data: UserUpdateData): Promise<number> {
    return this.dexie.users.update(id, data);
  }

  async getByEmail(email: string): Promise<DBDIUsers> {
    const user = await this.dexie.users.where('email').equalsIgnoreCase(email).first();
    this.fitDateAttr(user);
    return user;
  }

  async getByAuth(email: string, password: string): Promise<DBDIUsers> {
    const user = await this.dexie.users.where({email, password }).first();
    this.fitDateAttr(user);
    return user;
  }

  private fitDateAttr(user: DBDIUsers): DBDIUsers {
    if (user) {
      if (user.created_at && typeof user.created_at === 'string') {
        user.created_at = new Date(user.created_at);
      }
      if (user.updated_at && typeof user.updated_at === 'string') {
        user.updated_at = new Date(user.updated_at);
      }
    }
    return user;
  }
}
