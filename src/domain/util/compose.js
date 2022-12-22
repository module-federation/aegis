'use strict'

/**
 * Execute functions in right-to-left order
 * ```
 * compose(func1, func2)(ObjectToCompose);
 * // equivalent to
 * func1(func2(ObjectToCompose));
 * ```
 * @param {...Function} funcs - functions to execute
 */
export default function compose(...funcs) {
  return function (initVal) {
    return funcs.reduceRight(function (val, func) {
      return func(val)
    }, initVal)
  }
}
