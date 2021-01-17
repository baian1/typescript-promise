var PromiseStatus;
(function (PromiseStatus) {
    PromiseStatus[PromiseStatus["pending"] = 0] = "pending";
    PromiseStatus[PromiseStatus["fulfilled"] = 1] = "fulfilled";
    PromiseStatus[PromiseStatus["rejected"] = 2] = "rejected";
})(PromiseStatus || (PromiseStatus = {}));
function resolvePromise(promise2, x, resolve, reject) {
    // 循环引用报错
    if (x === promise2) {
        // reject报错
        return reject(new TypeError("Chaining cycle detected for promise"));
    }
    // 防止多次调用
    var called = false;
    // x不是null 且x是对象或者函数
    if (x != null && (typeof x === "object" || typeof x === "function")) {
        try {
            // A+规定，声明then = x的then方法
            var then = x.then;
            // 如果then是函数，就默认是promise了
            if (typeof then === "function") {
                // 就让then执行 第一个参数是this   后面是成功的回调 和 失败的回调
                then.call(x, function (y) {
                    // 成功和失败只能调用一个
                    if (called)
                        return;
                    called = true;
                    // resolve的结果依旧是promise 那就继续解析
                    resolvePromise(promise2, y, resolve, reject);
                }, function (err) {
                    // 成功和失败只能调用一个
                    if (called)
                        return;
                    called = true;
                    reject(err); // 失败了就失败了
                });
            }
            else {
                resolve(x); // 直接成功即可
            }
        }
        catch (e) {
            // 也属于失败
            if (called)
                return;
            called = true;
            // 取then出错了那就不要在继续执行了
            reject(e);
        }
    }
    else {
        resolve(x);
    }
}
var Promise = /** @class */ (function () {
    function Promise(executor) {
        var _this = this;
        this.value = null;
        this.onResolvedCallbacks = [];
        this.onRejectedCallbacks = [];
        this.state = PromiseStatus.pending;
        var resolve = function (value) {
            if (_this.state === PromiseStatus.pending) {
                _this.state = PromiseStatus.fulfilled;
                _this.value = value;
                _this.onResolvedCallbacks.forEach(function (cb) { return cb(value); });
            }
        };
        var reject = function (reason) {
            if (_this.state === PromiseStatus.pending) {
                _this.state = PromiseStatus.rejected;
                _this.reason = reason;
                _this.onRejectedCallbacks.forEach(function (cb) { return cb(reason); });
            }
        };
        try {
            executor(resolve, reject);
        }
        catch (err) {
            reject(err);
        }
    }
    Promise.prototype.then = function (onFulfilled, onRejected) {
        var _this = this;
        var _a = this.changeToFunction(onFulfilled, onRejected), newOnFulfilled = _a.onFulfilled, newOnRejected = _a.onRejected;
        // 状态为fulfilled，执行onFulfilled，传入成功的值
        var promise2 = new Promise(function (resolve, reject) {
            var self = _this;
            function onhandleResolve() {
                if (self.state === PromiseStatus.fulfilled) {
                    setTimeout(function () {
                        try {
                            var x = newOnFulfilled(self.value);
                            resolvePromise(promise2, x, resolve, reject);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                }
            }
            function onhandleRejected() {
                // 状态为rejected，执行onRejected，传入失败的原因
                if (self.state === PromiseStatus.rejected) {
                    setTimeout(function () {
                        try {
                            var x = newOnRejected(self.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                }
            }
            onhandleResolve();
            onhandleRejected();
            if (_this.state === PromiseStatus.pending) {
                _this.onResolvedCallbacks.push(onhandleResolve);
                _this.onRejectedCallbacks.push(onhandleRejected);
            }
        });
        return promise2;
    };
    Promise.prototype.changeToFunction = function (onFulfilled, onRejected) {
        onFulfilled =
            typeof onFulfilled === "function"
                ? onFulfilled
                : function (value) {
                    return value;
                };
        onRejected =
            typeof onRejected === "function"
                ? onRejected
                : function (reason) {
                    throw reason;
                };
        return { onFulfilled: onFulfilled, onRejected: onRejected };
    };
    Promise.prototype.createPromiseHandle = function (self) { };
    Promise.reject = function (err) {
        return new Promise(function (resolve, reject) {
            reject(err);
        });
    };
    Promise.resolve = function (v) {
        return new Promise(function (resolve, reject) {
            resolve(v);
        });
    };
    return Promise;
}());
var adapter = {
    deferred: function () {
        var resolve;
        var reject;
        var promise = new Promise(function (res, rej) {
            resolve = res;
            reject = rej;
        });
        return {
            promise: promise,
            reject: reject,
            resolve: resolve
        };
    },
    //@ts-ignore
    rejected: function (reason) { return Promise.reject(reason); },
    //@ts-ignore
    resolved: function (value) { return Promise.resolve(value); }
};
module.exports = adapter;
//# sourceMappingURL=promise.js.map