var PromiseStatus;
(function (PromiseStatus) {
    PromiseStatus[PromiseStatus["pending"] = 0] = "pending";
    PromiseStatus[PromiseStatus["fulfilled"] = 1] = "fulfilled";
    PromiseStatus[PromiseStatus["rejected"] = 2] = "rejected";
})(PromiseStatus || (PromiseStatus = {}));
//判断值是对象或函数,可能含有then
function isObjectOrFN(v) {
    //null的类型也是唐渝鹏
    if (v === null) {
        return false;
    }
    return typeof v === "object" || typeof v === "function";
}
function resolvePromise(promise2, x, resolve, reject) {
    // 循环引用报错
    if (x === promise2) {
        // reject报错
        return reject(new TypeError("Chaining cycle detected for promise"));
    }
    //这个标志位逻辑是适用于外部自定义对象有then函数,
    //防止resolve与reject不能多次调用
    var called = false;
    // x不是null且x是对象或者函数
    // 类似于Promise有then函数的
    if (isObjectOrFN(x)) {
        var then = void 0;
        try {
            then = x.then;
        }
        catch (e) {
            //获取then失败
            //x={then:()=>{throw e}}
            if (called)
                return;
            return reject(e);
        }
        // 如果then是函数，就默认是promise了
        if (typeof then === "function") {
            try {
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
            catch (e) {
                if (called)
                    return;
                //then函数执行失败的捕获
                reject(e);
            }
        }
        else {
            //then是一个值,直接返回就可以了
            resolve(x);
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
        var _a;
        var _this = this;
        //then的处理函数,非function表示穿透
        //将其保存下来
        var self = this;
        var promiseHandle = (_a = {},
            _a[PromiseStatus.fulfilled] = this.changeToFunction(PromiseStatus.fulfilled, onFulfilled),
            _a[PromiseStatus.rejected] = this.changeToFunction(PromiseStatus.rejected, onRejected),
            _a[PromiseStatus.pending] = function () {
                throw new Error("不存在padding状态的handle");
            },
            _a);
        //then必定返回一个promise 状态为fulfilled，执行onFulfilled，传入成功的值
        //创建Promise抽取resolve和reject,用于改变状态
        var promise2 = new Promise(function (resolve, reject) {
            //创建状态改变后的then触发函数
            //错误走reject逻辑处理
            //正确走resolve逻辑处理
            function createHandle(type) {
                return function () {
                    if (self.state === type) {
                        //将函数执行推到下一个时间循环中
                        setTimeout(function () {
                            try {
                                //如果处理函数状态为错误,返回错误Promise
                                var data = type === PromiseStatus.fulfilled ? self.value : self.reason;
                                var x = promiseHandle[type].call(undefined, data);
                                resolvePromise(promise2, x, resolve, reject);
                            }
                            catch (e) {
                                reject(e);
                            }
                        });
                    }
                };
            }
            var onhandleResolve = createHandle(PromiseStatus.fulfilled);
            var onhandleRejected = createHandle(PromiseStatus.rejected);
            //非pending
            //直接执行处理数据走then
            if (_this.state !== PromiseStatus.pending) {
                onhandleResolve();
                onhandleRejected();
            }
            else {
                //pending 将处理函数推入栈,延迟执行
                _this.onResolvedCallbacks.push(onhandleResolve);
                _this.onRejectedCallbacks.push(onhandleRejected);
            }
        });
        return promise2;
    };
    /**
     * 如果是函数使用函数
     * 其他值就透传数据
     * @param type
     * @param cb
     */
    Promise.prototype.changeToFunction = function (type, cb) {
        if (typeof cb === "function") {
            return cb;
        }
        switch (type) {
            case PromiseStatus.fulfilled: {
                return function (value) {
                    return value;
                };
            }
            case PromiseStatus.rejected: {
                return function (reason) {
                    throw reason;
                };
            }
            case PromiseStatus.pending: {
                throw new Error("不存在pending状态的处理函数");
            }
        }
    };
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