"use strict";

export async function wrapWasmDomainModule(module) {
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

    const wrappedSpec = {
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
    };

    const dispose = () => __unpin(specPtr);
    // Call dispose to all this to be GC'ed
    modelSpec.dispose = dispose.bind(this);
    return Object.freeze(wrappedSpec);
}

export function wrapWasmAdapterModule(modules) { }

export function wrapWasmServiceModule(modules) { }
