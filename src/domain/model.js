'use strict'

/**
 * @typedef {Object} Model Domain entity/service object - conforms to `ModelSpecification`
 * @property {string} Symbol_id - immutable/private model instance uuid
 * @property {string} Symbol_modelName - immutable/private model name
 * @property {number} Symbol_createTime - immutable/private time of creation
 * @property {number} Symbol_updateTime - immutable/private time of last update
 * @property {function(Model,*,number):Model} Symbol_validate - run validations, see `eventMask`
 * @property {function(Model,*):Model} Symbol_onUpdate - immutable/private update function
 * @property {function(Model)} Symbol_onDelete - immutable/private delete function
 * @property {function(Object, boolean):Promise<Model>} update - {@link Model.update} use this function to update the model -
 * specify changes as properties of an object, specify false to skip validation.
 * @property {function()} toJSON - de/serialization logic
 * @property {function(eventName,function(eventName,Model):void)} addListener listen
 * for domain events
 * @property {function(eventName,Model):void} emit emit a domain event
 * @property {function()} [mixinMethod] - when the user
 * specifies a mixin, it is applied to the model on creation - adding methods is
 * a common result.
 * @property {*} [mixinData] - when the user specifies a mixin, it is applied to
 * the model on creation - adding fields is a common result.
 * @property {function(function():Promise<Model>):Promise<Model>} [port] - when a
 * port is configured, the framework generates a method on the model object to invoke it.
 * When data arrives on the port, the port's adapter invokes the callback specified
 * in the port configuration, which is passed as an argument to the port function.
 * The callback returns an updated `Model`, and control is returned to the caller.
 * Optionally, an event is fired to trigger the next port function to run
 * @property {function():Promise<any>} [relation] - when you configure a relation,
 * the framework generates a function that your code calls to run the query
 * @property {function(*):*} [command] - the framework will call any authorized
 * model method or function you specify when passed as a parameter or query in
 * an API call.
 * @property {function():string} getName - model name
 * @property {function():string} getId - model instance id
 * @property {function():import(".").ModelSpecification} getSpec - get ModelSpec
 * @property {function():string[]} getPortFlow - get port history
 * @property {function():import(".").ports} getPorts - get port config
 * @property {function():string} getName - model name
 * @property {function(string):{arg0:string,symbol:Symbol}} getKey
 * @property {function():throws} undo - back out transactions
 */

/**
 * @typedef {import(".").Event} Event
 */

import {
  withTimestamp,
  withSerializers,
  withDeserializers,
  fromTimestamp,
  fromSymbol,
  toSymbol
} from './mixins'
import makePorts from './make-ports'
import makeRelations from './make-relations'
import compensate from './undo'
import asyncPipe from './util/async-pipe'
import compose from './util/compose'
import pipe from './util/pipe'
import uuid from './util/uuid'

/**
 *
 */
const Model = (() => {
  // Protect core properties from user mixins
  const ID = Symbol('id')
  const MODELNAME = Symbol('modelName')
  const CREATETIME = Symbol('createTime')
  const UPDATETIME = Symbol('updateTime')
  const ONUPDATE = Symbol('onUpdate')
  const ONDELETE = Symbol('onDelete')
  const VALIDATE = Symbol('validate')
  const PORTFLOW = Symbol('portFlow')

  const keyMap = {
    id: ID,
    modelName: MODELNAME,
    createTime: CREATETIME,
    updateTime: UPDATETIME,
    onUpdate: ONUPDATE,
    onDelete: ONDELETE,
    validate: VALIDATE,
    portFlow: PORTFLOW
  }

  /**
   * bitmask for identifying events
   * @enum {number}
   */
  const eventMask = {
    update: 1, //  0001 Update
    create: 1 << 1, //  0010 Create
    onload: 1 << 2 //  0100 Load
  }

  const defaultOnUpdate = (model, changes) => ({ ...model, ...changes })
  const defaultOnDelete = model => withTimestamp('deleteTime')(model)
  const defaultValidate = (model, changes) => defaultOnUpdate(model, changes)

  // caller can skip vadlidation, which is on by default
  const validateUpdates = (model, changes, option = true) => {
    if (option) return model[VALIDATE](changes, eventMask.update)
    return {
      ...model,
      ...changes
    }
  }

  function queueNotice (model) {
    console.debug(queueNotice.name, 'disabled')
  }

  /**
   * Because it is immutable, a model
   * becomes a shallow clone the first
   * time it is updated. Therefore, if
   * the model is a class, uses
   * inheritance, or is instantiate
   * with the new keyword, we have to
   * restore its prototype.
   *
   * @param {} clonedModel
   * @returns
   */
  function rehydrate (clonedModel, model) {
    return model.prototype
      ? Object.setPrototypeOf(clonedModel, model.prototype)
      : clonedModel
  }

  /**
   * Add data and functions that support framework services.
   * @paramn {{
   *  model:Model,
   *  args:*,
   *  spec:import('./index').ModelSpecification
   * }} modelInfo
   * @returns {Model}
   */
  function make (modelInfo) {
    const {
      model,
      spec: {
        onUpdate = defaultOnUpdate,
        onDelete = defaultOnDelete,
        validate = defaultValidate,
        ports,
        broker,
        modelName,
        datasource,
        mixins = [],
        dependencies,
        relations = {}
      }
    } = modelInfo

    return {
      // User mixins
      ...compose(...mixins)(model),

      // Generate functions to fetch related models
      ...makeRelations(relations, datasource, broker),

      // Generate port functions to handle domain I/O
      ...makePorts(ports, dependencies, broker),

      // Remember port calls
      [PORTFLOW]: [],

      // model class name
      [MODELNAME]: modelName,

      // if provided, use ID from caller for idempotence
      [ID]:
        modelInfo.args && modelInfo.args[0]
          ? modelInfo.args[0].requestId || uuid()
          : uuid(),

      // Called before update is committed
      [ONUPDATE] (changes) {
        return onUpdate(this, changes)
      },

      // Called before delete is committed
      [ONDELETE] () {
        return onDelete(this)
      },

      /**
       * Run validation logic - called on create, load, updated and delete
       * @param {*} changes - updated values
       * @param {eventMask} event - event type, see {@link eventMask}.
       * @returns {Model} - updated model
       */
      [VALIDATE] (changes, event) {
        return validate(this, changes, event)
      },

      /**
       * Return the `eventMask` key name of the value of `event`.
       * See {@link eventMask}.
       * @param {number} event
       * @returns {string} key name/s: create, update, onload, delete
       */
      getEventMaskName (event) {
        if (typeof event !== 'number') return
        const key = Object.keys(eventMask).find(k => eventMask[k] & event)
        return key
      },

      /**
       * Compensate for downstream transaction failures.
       * Back out all previous port transactions
       */
      async undo () {
        return compensate(this)
      },

      /**
       * Listen for domain events.
       *
       * @param {string} eventName - name of event
       * @param {function(Model)} callback - called when event is heard
       * @param {boolean} [multi] - allow multiple listeners for event,
       * defaults to `true`
       */
      addListener (eventName, callback, options) {
        broker.on(eventName, callback, options)
      },

      /**
       * Fire domain events.
       *
       * @param {string} eventName - event identifier, unique string
       * @param {Model|Event} eventData - any, but typically `Model`
       * @param {boolean} [forward] - forward event to service mesh,
       * defaults to `false`
       */
      emit (eventName, eventData, options) {
        broker.notify(
          eventName,
          {
            eventName,
            eventData,
            model: this
          },
          options
        )
      },

      /** @typedef {import('./serializer.js').Serializer} Serializer */

      getDataSourceType () {
        return datasource.getClassName()
      },

      /**
       * Concurrency strategy is to merge changes with
       * last saved copy; so {@link changes} should include
       * only the subset of properties that are changing.
       * Concomitant strategy is to use `Symbol`s to
       * avoid conflict, which requires a custom
       * {@link Serializer} for network and storage
       * transmission. If conflict does occur , last
       * one in wins.
       *
       * @param {object} changes - object containing updated props
       * @param {boolean} validate - run validation by default
       * @returns {Promise<Model>}
       */
      async update (changes, validate = true) {
        // get the last saved version
        const saved = await datasource.find(this[ID])
        // merge changes with last saved and optionally validate
        const valid = validateUpdates(saved || this, changes, validate)

        // update timestamp
        const merge = await datasource.save(this[ID], {
          ...valid,
          [UPDATETIME]: Date.now()
        })

        const final = rehydrate(merge, model)
        queueNotice(final)
        return final
      },

      /**
       * Synchronous version of {@link Model.update}.
       * Only updates cache. External storage is
       * not updated and no event is sent.
       *
       * Useful for:
       * - immediate cache update
       * - controlling when/if event is sent
       * - calling external storage with custom adapter
       *
       * Consider situations in which the point is not
       * to persist data, but to share it with other
       * application components, as is done in workflow
       * or between local related model threads, which
       * use shared memory.
       *
       * @param {*} changes
       * @param {boolean} validate
       * @returns {Model}
       */
      updateSync (changes, validate = true) {
        // get the last saved version
        const saved = datasource.findSync(this[ID])
        // merge changes with lastest copy and optionally validate
        const valid = validateUpdates(saved || this, changes, validate)

        // update timestamp
        const merge = datasource.saveSync(this[ID], {
          ...valid,
          [UPDATETIME]: Date.now()
        })

        // restore prototype if used
        return rehydrate(merge, model)
      },

      /**
       * If `id` and `data` are null, saves the current
       * object, otherwise saves the specified object and data
       * @param {*} id
       * @param {*} data
       * @returns
       */
      async save (id = null, data = null) {
        if (id && data) return datasource.save(id, data)
        return datasource.save(this[ID], this)
      },

      async find (id) {
        if (!id) throw new Error('missing id')
        return datasource.find(id)
      },

      /**
       * Returns writable stream for upserting the datasource.
       * Use in combination with {@link Model}.list(), which will pipe
       * its output to it.
       *
       * @returns {WritableStream}
       */
      createWriteStream () {
        return datasource.createWriteStream()
      },

      /**
       * Search existing model instances (synchronously).
       * Only searches the cache. Does not search persistent storage.
       *
       * @param {{key1, keyN}} filter - list of required matching key-values
       * @returns {Model[]}
       */
      listSync (filter) {
        return datasource.listSync(filter)
      },

      /**
       * Searches cache first, then persistent storage if not found.
       *
       * @param {{
       *  writable:WritableStream,
       *  transform:import('stream').Transform,
       *  filter:{k:'v'},
       *  sort:'asc'|'dsc'|*,
       *  limit:number
       * }} options
       * @returns {Model[]}
       */
      async list (options) {
        return datasource.list(options)
      },

      /**
       * Original request passed in by caller
       * @returns arguments passed by caller
       */
      getArgs () {
        return modelInfo.args ? modelInfo.args : []
      },

      getDependencies () {
        return dependencies
      },

      /**
       * Identify events types.
       * @returns {eventMask}
       */
      getEventMask () {
        return eventMask
      },

      /**
       * Returns the `ModelSpecification` for this model.
       *
       * @returns {import(".").ModelSpecification}
       */
      getSpec () {
        return modelInfo.spec
      },

      isCached () {
        return modelInfo.spec.isCached
      },

      /**
       * Returns the `ports` for this model.
       *
       * @returns {import(".").ports}
       */
      getPorts () {
        return modelInfo.spec.ports
      },

      /**
       * Returns the `modelName` of this model instance.
       *
       * @returns
       */
      getName () {
        return this[MODELNAME]
      },

      /**
       * Returns ID of this model instance.
       *
       * @returns {string}
       */
      getId () {
        return this[ID]
      },

      /**
       * Return a list of ports invoked by this model instance, in LIFO order.
       *
       * @returns {string[]} history of ports called by this model instance
       */
      getPortFlow () {
        return this[PORTFLOW]
      },

      /**
       * Get the `Symbol` key value for protected properties.
       *
       * @param {string} key - string representation of Symbol
       * @returns {Symbol}
       */
      getKey (key) {
        return keyMap[key]
      },

      equals (model) {
        model && model.getId && model.getId() === this[ID]
      }
    }
  }

  /**
   * Call {@link modelInfo/spec/factory} to generate a model instance.
   * Pass the caller's input as arguments to the function. Then call
   * {@link make} to enrich the model with ports, relations, commands,
   * mixins, etc.
   *
   * @type {Model}
   * @class
   * @param {{
   *  args: any[],
   *  spec: import('./index').ModelSpecification
   * }} modelInfo Contains model specification and user input to build a model instance
   */
  // const Model = async modelInfo =>
  //   Promise.resolve(
  //     // Call factory with data from request payload
  //     modelInfo.spec.factory(...modelInfo.args)
  //   ).then(model =>
  //     make({
  //       model,
  //       args: modelInfo.args,
  //       spec: modelInfo.spec
  //     })
  //   )

  const Model = modelInfo =>
    make({
      model: modelInfo.spec.factory(...modelInfo.args),
      args: modelInfo.args,
      spec: modelInfo.spec
    })

  const validate = event => model => model[VALIDATE]({}, event)

  /**
   * Create model instance
   */
  const makeModel = pipe(
    Model,
    withTimestamp(CREATETIME),
    withSerializers(
      fromSymbol(keyMap),
      fromTimestamp(['createTime', 'updateTime'])
    ),
    withDeserializers(toSymbol(keyMap)),
    validate(eventMask.create),
    Object.freeze
  )

  /**
   * Recreate model from deserialized object
   */
  const loadModel = pipe(
    make,
    withSerializers(
      fromSymbol(keyMap),
      fromTimestamp(['createTime', 'updateTime'])
    ),
    withDeserializers(toSymbol(keyMap)),
    validate(eventMask.onload),
    Object.freeze
  )

  return {
    /**
     * Create a new model instance
     * @param {{
     *  spec: import('./index').ModelSpecification
     *  args: any[]
     * }} modelInfo
     * @returns {Promise<Readonly<Model>>}
     */
    // create: async modelInfo => makeModel(modelInfo),
    create: modelInfo => makeModel(modelInfo),

    /**
     * Load a saved model
     * @param {Model} savedModel deserialized model
     * @param {import('.').ModelSpecification} spec
     */
    load: modelInfo => loadModel(modelInfo),

    /**
     * Process update request.
     * (Invokes user-provided `onUpdate` and `validate` callback.)
     * @param {Model} model - model instance to update
     * @param {Object} changes - Object containing changes
     * @returns {Model} updated model
     *
     */
    update: function (model, changes) {
      return model.update(changes)
    },

    /**
     *
     * @param {Model} model
     * @param {*} changes
     */
    validate: (model, changes) => model[VALIDATE](changes, eventMask.update),

    /**
     * Process delete request.
     * (Invokes provided `onDelete` callback.)
     * @param {Model} model
     * @returns {Model}
     */
    delete: model => model[ONDELETE](),

    /**
     * Get model name
     * @param {Model} model
     * @returns {string} model's name
     */
    getName: model => model[MODELNAME],

    /**
     * Get private symbol for `key`
     * @param {string} key
     * @returns {Symbol} unique symbol
     */
    getKey: key => keyMap[key],

    /**
     * Get model ID
     * @param {Model} model
     * @returns {string} model's ID
     */
    getId: model => model[ID]
  }
})()

export default Model
