'use strict'

export async function wrapWasmDomainModule(module) {
    const {
        __pin,
        __unpin,
        __getString,
        __newString,
        ArrayOfStrings_ID,
        ModelSpec,
        getModelSpec,
        modelFactory
    } = module.exports

    const specPtr = __pin(getModelSpec())
    const modelSpec = ModelSpec.wrap(specPtr)
    const wrapped = {
        modelMame: __getString(modelSpec.modelName),
        endpoint: __getString(modelSpec.endpoint),
        factory: input => {
            // Allocate a new array, but this time its elements are pointers to strings.
            const keyPtrs = Object.keys(input).map(k => __pin(__newString(k)));
            const valPtrs = Object.values(input).map(v => __pin(__newString(v)));
            const keyPtr = __pin(__newArray(ArrayOfStrings_ID, keyPtrs));
            const valPtr = __pin(__newArray(ArrayOfStrings_ID, valPtrs));

            // The array keeps its values alive from now on
            keyPtrs.forEach(__unpin);
            valPtrs.forEach(__unpin);

            // Provide our array of lowercase strings to WebAssembly, and obtain the new
            // array of uppercase strings before printing it.
            const modelPtr = __pin(modelFactory(keyPtr, valPtr));
            model.cleanup = () => __unpin(modelPtr); // it is ok if the arrays becomes garbage collected now
        }
    }
    __unpin(specPtr)

    return Object.freeze(wrapped)

}

export function wrapWasmAdapterModule(modules) { }

export function wrapWasmServiceModule(modules) { }
