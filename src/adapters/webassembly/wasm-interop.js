"use strict";
/**
 * Wrap wasm factory function, etc in `ModelSpecification`
 * @param {WebAssembly} module WebAssembly
 * @returns {import("../../domain").ModelSpecification}
 */
export async function wrapWasmModelSpec(module) {
  const {
    ModelSpec,
    getModelSpec,
    modelFactory,
    ArrayOfStrings_ID,
    __pin,
    __unpin,
    __getString,
    __newString,
    __newArray,
    __getArray,
  } = module.exports;

  const specPtr = __pin(getModelSpec());
  const modelSpec = ModelSpec.wrap(specPtr);

  // wrapped model spec
  return Object.freeze({
    modelName: __getString(modelSpec.modelName),
    endpoint: __getString(modelSpec.endpoint),
    /**
     * Generates factory function
     * @param {*} dependencies
     * @returns {({...arg}=>Model)} factory function to generate model
     */
    factory: dependencies => async input => {
      // Allocate new arrays pointers to strings.
      const keyPtrs = Object.keys(input).map(k => __pin(__newString(k)));
      const valPtrs = Object.values(input).map(v => __pin(__newString(v)));
      const keyPtr = __pin(__newArray(ArrayOfStrings_ID, keyPtrs));
      const valPtr = __pin(__newArray(ArrayOfStrings_ID, valPtrs));

      // Provide the input as two arrays of strings, one for keys, the other for values
      const modelPtr = __pin(modelFactory(keyPtr, valPtr));
      //const model = Model.wrap(modelPtr);

      // The arrays keeps values alive from now on
      keyPtrs.forEach(__unpin);
      valPtrs.forEach(__unpin);

      const model = __getArray(modelPtr)
        .map(multi => __getArray(multi))
        .map(tuple => ({ [__getString(tuple[0])]: __getString(tuple[1]) }))
        .reduce((prop1, prop2) => ({ ...prop1, ...prop2 }));

      const immutableClone = Object.freeze({ ...model });
      __unpin(modelPtr);

      return immutableClone;
    },
    // call to dispose of spec memory
    dispose: () => __unpin(specPtr)
  });
}

export function wrapWasmAdapter(module) { }

export function wrapWasmService(module) { }
