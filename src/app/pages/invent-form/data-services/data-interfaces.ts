
export interface DbTransactionResult {
  success: boolean;
  errorMsg?: string;
  data?: any;
  debug?: any;
}

export interface DbInsertResult extends DbTransactionResult {
  newId?: string;
  newItem?: object;
}

export interface DbUpdateResult extends DbTransactionResult {
  id?: string;
  item?: object;
}
