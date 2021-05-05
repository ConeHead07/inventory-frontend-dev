
export class User {
  public isLoggedIn: boolean;

  constructor(
    public email: string,
    public id: number,
    private uToken: string,
    private uTokenExpirationDate: Date|string,
    public pwHash?: string
  ) {
    const dateNow = new Date();
    const dateExp = (uTokenExpirationDate instanceof Date) ? uTokenExpirationDate : new Date(uTokenExpirationDate);
    this.isLoggedIn = (uTokenExpirationDate !== null && dateNow < dateExp);
    if (typeof uTokenExpirationDate === 'string') {
      this.uTokenExpirationDate = new Date(uTokenExpirationDate);
    }
  }

  get token(): string | null {
    if (!this.uTokenExpirationDate || new Date() > this.uTokenExpirationDate) {
      return null;
    }
    return this.uToken;
  }

  get hasValidUiSession(): boolean {
    const hasValidUiSession = {
      isLoggedIn: this.isLoggedIn,
      uTokenExpirationDate: this.uTokenExpirationDate,
      Date: new Date(),
      result: false
    };
    if (this.isLoggedIn && new Date() < this.uTokenExpirationDate) {
      hasValidUiSession.result = true;
      // console.log('app.pages.auth.user.model.ts #34 ', hasValidUiSession);
      return true;
    }
    console.error('app.pages.auth.user.model.ts #39 use has no valid session ', hasValidUiSession);
    return false;
  }

  get expirationDate(): Date | null {
    if (typeof this.uTokenExpirationDate === 'string') {
      this.uTokenExpirationDate = new Date(this.uTokenExpirationDate);
    }
    return this.uTokenExpirationDate;
  }

}
