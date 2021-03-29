
export class User {
  public isLoggedIn: boolean;

  constructor(
    public email: string,
    public id: number,
    private uToken: string,
    private uTokenExpirationDate: Date,
    public pwHash?: string
  ) {
    const dateNow = new Date();
    const dateExp = (uTokenExpirationDate instanceof Date) ? uTokenExpirationDate : new Date(uTokenExpirationDate);
    this.isLoggedIn = (uTokenExpirationDate !== null && dateNow < dateExp);
    console.log('app.pages.auth.user.model.ts #12 ', {
      email, id, uToken, uTokenExpirationDate,
      uTokenExpirationDateTypeOf: (typeof uTokenExpirationDate),
      pwHash,
      dateNow,
      dateExp,
      isLoggedIn: this.isLoggedIn
    });
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
      console.log('app.pages.auth.user.model.ts #34 ', hasValidUiSession);
      return true;
    }
    console.log('app.pages.auth.user.model.ts #37 ', hasValidUiSession);
    return false;
  }

  get expirationDate(): Date | null {
    return this.uTokenExpirationDate;
  }

}
