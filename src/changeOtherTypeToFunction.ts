import { PromiseStatus } from "./type";

export function changeOtherTypeToFunction<T extends unknown>(
  type: PromiseStatus,
  cb: T
) {
  if (typeof cb === "function") {
    return cb;
  }
  switch (type) {
    case PromiseStatus.fulfilled: {
      return function (value: any) {
        return value;
      };
    }
    case PromiseStatus.rejected: {
      return function (reason: unknown) {
        throw reason;
      };
    }
    case PromiseStatus.pending: {
      throw new Error("不存在pending状态的处理函数");
    }
  }
}
