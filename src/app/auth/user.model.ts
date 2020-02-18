export class User {
  constructor(
    public email: string,
    public id: string,
    private uToken: string,
    private uTokenExpirationDate: Date
  ) {}

  get token() {
    if (!this.uTokenExpirationDate || new Date() > this.uTokenExpirationDate) {
      return null;
    }
    return this.uToken;
  }
}
