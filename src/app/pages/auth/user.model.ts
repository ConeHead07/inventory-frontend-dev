
export class User {
  public isLoggedIn: boolean;

  constructor(
    public email: string,
    public id: number,
    private uToken: string,
    private uTokenExpirationDate: Date,
    public pwHash?: string
  ) {
    this.isLoggedIn = false;
  }

  get token(): string | null {
    if (!this.uTokenExpirationDate || new Date() > this.uTokenExpirationDate) {
      return null;
    }
    return this.uToken;
  }

  get hasValidUiSession(): boolean {
    if (this.isLoggedIn && new Date() < this.uTokenExpirationDate) {
      return true;
    }
    return false;
  }

  get expirationDate(): Date | null {
    return this.uTokenExpirationDate;
  }

}
