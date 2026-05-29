export interface CardEditState {
  front?: string;
  back?: string;
  deleted?: boolean;
  suspended?: boolean;
}

export interface EditPayload {
  cardIndex: number;
  front?: string;
  back?: string;
  deleted?: boolean;
  suspended?: boolean;
}
