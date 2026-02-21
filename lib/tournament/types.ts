export interface Pairing {
  whiteId: number;
  blackId: number;
}

export interface Round {
  roundNumber: number;
  pairings: Pairing[];
  isReverse: boolean;
}
