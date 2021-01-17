export enum PromiseStatus {
  pending,
  fulfilled,
  rejected,
}
export interface Then<T, R = onFulfilled<T>> {
  (resolve: R, reject: onRejected): void;
}
export interface onFulfilled<T = unknown> {
  (v: T): unknown;
}
export interface onRejected {
  (err: unknown): void;
}
