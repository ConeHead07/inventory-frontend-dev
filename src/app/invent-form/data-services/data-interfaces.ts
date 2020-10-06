
export interface DbTransactionResult {
  success: boolean;
  errorMsg?: string;
  data?: any;
  debug?: any;
}

export interface DbInsertResult extends DbTransactionResult {
  newId?: number;
  newItem?: object;
}

export interface DbUpdateResult extends DbTransactionResult {
  id?: number;
  item?: object;
}
