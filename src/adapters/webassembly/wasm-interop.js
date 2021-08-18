'use strict'

export async function wrapWasmDomainModule(module) {
    const {
        __pin,
        __unpin,
        __getString,
        __newString,
        __newArray,
        ArrayOfStrings_ID,
        ModelSpec,
        getModelSpec,
        modelFactory
    } = module.exports

    const specPtr = __pin(getModelSpec())
    const modelSpec = ModelSpec.wrap(specPtr)
    console.info("modelSpec.modelName", __getString(modelSpec.modelName))

    const wrappedSpec = {
        modelName: __getString(modelSpec.modelName),
        endpoint: __getString(modelSpec.endpoint),

        factory: dependencies => async input => {

            // Allocate a new array, but this time its elements are pointers to strings.
            const keyPtrs = Object.keys(input).map(k => __pin(__newString(k)));
            const valPtrs = Object.values(input).map(v => __pin(__newString(v)));
            const keyPtr = __pin(__newArray(ArrayOfStrings_ID, keyPtrs));
            const valPtr = __pin(__newArray(ArrayOfStrings_ID, valPtrs));

            // Provide our array of lowercase strings to WebAssembly, and obtain the new
            // array of uppercase strings before printing it.
            const modelPtr = __pin(modelFactory(keyPtr, valPtr));
            const model = Model.wrap(modelPtr);
            model.dispose = () => __unpin(modelPtr); // it is ok if the arrays becomes garbage collected now

            // The array keeps its values alive from now on
            keyPtrs.forEach(__unpin);
            valPtrs.forEach(__unpin);

            return {
                wasmId: dependencies.uuid(),
                ...model
            }
        }
    }
    console.info(wrappedSpec);
    modelSpec.dispose = () => __unpin(specPtr);
    return Object.freeze(wrappedSpec)
}

export function wrapWasmAdapterModule(modules) { }

export function wrapWasmServiceModule(modules) { }
