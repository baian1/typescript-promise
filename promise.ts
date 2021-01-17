enum PromiseStatus {
  pending,
  fulfilled,
  rejected,
}
interface Then<T> {
  (resolve: onFulfilled<T>, reject: onRejected): void;
}

interface onFulfilled<T = unknown> {
  (v: T): any;
}
interface onRejected {
  (err: unknown): any;
}

function resolvePromise(
  promise2: Promise,
  x: any,
  resolve: onFulfilled,
  reject: onRejected
) {
  // 循环引用报错
  if (x === promise2) {
    // reject报错
    return reject(new TypeError("Chaining cycle detected for promise"));
  }
  // 防止多次调用
  let called: boolean = false;
  // x不是null 且x是对象或者函数
  if (x != null && (typeof x === "object" || typeof x === "function")) {
    try {
      // A+规定，声明then = x的then方法
      let then = x.then;
      // 如果then是函数，就默认是promise了
      if (typeof then === "function") {
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
      } else {
        resolve(x); // 直接成功即可
      }
    } catch (e) {
      // 也属于失败
      if (called) return;
      called = true;
      // 取then出错了那就不要在继续执行了
      reject(e);
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

  then(onFulfilled?: onFulfilled<T>, onRejected?: onRejected) {
    //then的处理函数,非function表示穿透
    //将其保存下来
    const self = this;
    const promiseHandle = {
      [PromiseStatus.fulfilled]: this.changeToFunction(
        PromiseStatus.fulfilled,
        onFulfilled
      ),
      [PromiseStatus.rejected]: this.changeToFunction(
        PromiseStatus.rejected,
        onRejected
      ),
      [PromiseStatus.pending]: () => {
        throw new Error("不存在padding状态的handle");
      },
    };
    //then必定返回一个promise 状态为fulfilled，执行onFulfilled，传入成功的值
    //创建Promise抽取resolve和reject,用于改变状态
    let promise2 = new Promise((resolve, reject) => {
      //创建状态改变后的then触发函数
      //错误走reject逻辑处理
      //正确走resolve逻辑处理
      function createHandle(type: PromiseStatus) {
        return function () {
          if (self.state === type) {
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

  private changeToFunction<T extends unknown>(type: PromiseStatus, cb: T) {
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

const adapter = {
  deferred: () => {
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
  },
  //@ts-ignore
  rejected: (reason) => Promise.reject(reason),
  //@ts-ignore
  resolved: (value) => Promise.resolve(value),
};

module.exports = adapter;
