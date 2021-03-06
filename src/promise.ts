import { changeOtherTypeToFunction } from "./changeOtherTypeToFunction";
import { isObjectOrFN } from "./isObjectOrFN";
import { onFulfilled, onRejected, PromiseStatus, Then } from "./type";

function resolvePromise<T>(
  promise2: Promise<T>,
  x: any,
  resolve: onFulfilled<T>,
  reject: onRejected
) {
  // 循环引用报错
  if (x === promise2) {
    // reject报错
    return reject(new TypeError("Chaining cycle detected for promise"));
  }
  //这个标志位逻辑是适用于外部自定义对象有then函数,
  //防止resolve与reject不能多次调用
  let called: boolean = false;
  // x不是null且x是对象或者函数
  // 类似于Promise有then函数的
  if (isObjectOrFN(x)) {
    let then;
    try {
      then = x.then;
    } catch (e) {
      //获取then失败
      //x={then:()=>{throw e}}
      if (called) return;
      return reject(e);
    }

    // 如果then是函数，就默认是promise了
    if (typeof then === "function") {
      try {
        // 就让then执行 第一个参数是this   后面是成功的回调 和 失败的回调
        then.call(
          x,
          (y: any) => {
            // 成功和失败只能调用一个
            if (called) return;
            called = true;
            // resolve的结果依旧是promise 那就继续解析
            resolvePromise(promise2, y, resolve, reject);
          },
          (err: unknown) => {
            // 成功和失败只能调用一个
            if (called) return;
            called = true;
            reject(err); // 失败了就失败了
          }
        );
      } catch (e) {
        if (called) return;
        //then函数执行失败的捕获
        reject(e);
      }
    } else {
      //then是一个值,直接返回就可以了
      resolve(x);
    }
  } else {
    resolve(x);
  }
}

class Promise<T = unknown> {
  state: PromiseStatus;
  value: T | null = null;
  reason: unknown;

  onResolvedCallbacks: onFulfilled<T>[] = [];
  onRejectedCallbacks: onRejected[] = [];
  constructor(executor: Then<T>) {
    this.state = PromiseStatus.pending;
    const resolve = (value: T) => {
      if (this.state === PromiseStatus.pending) {
        this.state = PromiseStatus.fulfilled;
        this.value = value;
        this.onResolvedCallbacks.forEach((cb) => cb(value));
      }
    };
    const reject = (reason: unknown) => {
      if (this.state === PromiseStatus.pending) {
        this.state = PromiseStatus.rejected;
        this.reason = reason;
        this.onRejectedCallbacks.forEach((cb) => cb(reason));
      }
    };
    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  then<TResult1 = T>(
    onFulfilled?: ((value: T) => TResult1) | undefined,
    onRejected?: onRejected
  ) {
    //then的处理函数,非function表示穿透
    //将其保存下来
    const self = this;
    const promiseHandle = {
      [PromiseStatus.fulfilled]: changeOtherTypeToFunction(
        PromiseStatus.fulfilled,
        onFulfilled
      ),
      [PromiseStatus.rejected]: changeOtherTypeToFunction(
        PromiseStatus.rejected,
        onRejected
      ),
      [PromiseStatus.pending]: () => {
        throw new Error("不存在padding状态的handle");
      },
    };

    //then必定返回一个promise 状态为fulfilled，执行onFulfilled，传入成功的值
    //创建Promise抽取resolve和reject,用于改变状态
    let promise2 = new Promise<TResult1>((resolve, reject) => {
      //创建状态改变后的then触发函数
      //错误走reject逻辑处理
      //正确走resolve逻辑处理
      function createHandle(type: PromiseStatus) {
        return function () {
          if (self.state === type) {
            //将函数执行推到下一个时间循环中
            setTimeout(() => {
              try {
                //如果处理函数状态为错误,返回错误Promise
                const data: any =
                  type === PromiseStatus.fulfilled ? self.value : self.reason;
                let x = promiseHandle[type].call(undefined, data);
                resolvePromise(promise2, x, resolve, reject);
              } catch (e) {
                reject(e);
              }
            });
          }
        };
      }
      const onhandleResolve = createHandle(PromiseStatus.fulfilled);
      const onhandleRejected = createHandle(PromiseStatus.rejected);
      //非pending
      //直接执行处理数据走then
      if (this.state !== PromiseStatus.pending) {
        onhandleResolve();
        onhandleRejected();
      } else {
        //pending 将处理函数推入栈,延迟执行
        this.onResolvedCallbacks.push(onhandleResolve);
        this.onRejectedCallbacks.push(onhandleRejected);
      }
    });

    return promise2;
  }

  /**
   * 如果是函数使用函数
   * 其他值就透传数据
   * @param type
   * @param cb
   */

  static reject(err: unknown) {
    return new Promise((resolve, reject) => {
      reject(err);
    });
  }
  static resolve<T>(v: T) {
    return new Promise<T>((resolve, reject) => {
      resolve(v);
    });
  }
}

export const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    reject,
    resolve,
  };
};
export const rejected = Promise.reject;
export const resolved = Promise.resolve;
