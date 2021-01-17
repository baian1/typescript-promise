//判断值是对象或函数,可能含有then
export function isObjectOrFN(
  v: unknown
): v is { then?: (...p: any) => unknown } {
  //null的类型也是唐渝鹏
  if (v === null) {
    return false;
  }

  return typeof v === "object" || typeof v === "function";
}
