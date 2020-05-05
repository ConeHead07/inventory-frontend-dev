export class User {
  constructor(
    public email: string,
    public id: number,
    private uToken: string,
    private uTokenExpirationDate: Date
  ) {}

  get token(): string | null {
    if (!this.uTokenExpirationDate || new Date() > this.uTokenExpirationDate) {
      return null;
    }
    return this.uToken;
  }

  get expirationDate(): Date | null {
    return this.uTokenExpirationDate;
  }

}
