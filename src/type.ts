export enum PromiseStatus {
  pending,
  fulfilled,
  rejected,
}
export interface Then<T> {
  (resolve: onFulfilled<T>, reject: onRejected): void;
}
export interface onFulfilled<T = unknown> {
  (v: T): any;
}
export interface onRejected {
  (err: unknown): any;
}
