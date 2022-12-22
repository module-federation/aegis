'use strict'

/**
 * @typedef {Object} Model Domain entity/service object - conforms to `ModelSpecification`
 * @property {string} Symbol_id - immutable/private model instance uuid
 * @property {string} Symbol_modelName - immutable/private model name
 * @property {number} Symbol_createTime - immutable/private time of creation
 * @property {number} Symbol_updateTime - immutable/private time of last udate
 * @property {function(Model,*,number):Model} Symbol_validate - run validations, see `eventMask`
 * @property {function(Model,*):Model} Symbol_onUpdate - immutable/private update function
 * @property {function(Model)} Symbol_onDelete - immutable/private delete function
 * @property {function(Object, boolean):Promise<Model>} update - {@link Model.update} use this function to update the model -
 * specify changes as properties of an object, specify false to skip valpidation.
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
 * @property {function():string[]} getPortFlow - get port invocation history
 * @property {function():import(".").ports} getPorts - get port config
 * @property {function():string} getName - model name
 * @property {function(string):{arg0:string,symbol:Symbol}} getKey
 * @property {function():throws} undo - back out transactions
 */

/**
 * @typedef {{
 * writable:import('stream').Writable,
 * transform:import('stream').Transform,
 * serialize:boolean=true,
 * options:*,
 * query:*
 * }} listOptions
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
  toSymbol,
} from './mixins'
import pipe from './util/pipe'
import makePorts from './make-ports'
import makeRelations from './make-relations'
import compensate from './undo'
import compose from './util/compose'
import * as asyncContext from './util/async-context'

/**
 *
 */
const Model = (() => {
  // Protect core properties from user mixins
  const ID = Symbol('id')
  const MODELNAME = Symbol('modelName')
  const CREATETIME = Symbol('createTime')
  const UPDATETIME = Symbol('updateTime')
  const ENDPOINT = Symbol('endpoint')
  const ONUPDATE = Symbol('onUpdate')
  const ONDELETE = Symbol('onDelete')
  const VALIDATE = Symbol('validate')
  const PORTFLOW = Symbol('portFlow')
  const DOMAIN = Symbol('domain')

  const keyMap = {
    id: ID,
    modelName: MODELNAME,
    createTime: CREATETIME,
    updateTime: UPDATETIME,
    endpoint: ENDPOINT,
    onUpdate: ONUPDATE,
    onDelete: ONDELETE,
    validate: VALIDATE,
    portFlow: PORTFLOW,
    domain: DOMAIN
  }

  /**
   * bitmask for identifying events
   * @enum {number}
   */
  const eventMask = {
    update: 1, //  0001 Update
    create: 1 << 1, //  0010 Create
    onload: 1 << 2, //  0100 Load
  }

  function approveChanges(changes, approvedChanges) {
    return Object.entries(changes)
      .filter(([k, v]) => approvedChanges.includes(k))
      .map(([k, v]) => ({ [k]: v }))
      .reduce((a, b) => ({ ...a, ...b }, {}))
  }

  function approveChanges (changes, approvedChanges) {
    return Object.entries(changes)
      .filter(([k, v]) => approvedChanges.includes(k))
      .map(([k, v]) => ({ [k]: v }))
      .reduce((a, b) => ({ ...a, ...b }, {}))
  }

  function approveChanges (changes, approvedChanges) {
    return Object.entries(changes)
      .filter(([k, v]) => approvedChanges.includes(k))
      .map(([k, v]) => ({ [k]: v }))
      .reduce((a, b) => ({ ...a, ...b }, {}))
  }

  const defaultOnUpdate = (model, changes) => ({ ...model, ...changes })
  const defaultOnDelete = model => withTimestamp('deleteTime')(model)
  const defaultValidate = (model, changes) => defaultOnUpdate(model, changes)

  function queueNotice (model) {
    console.debug(queueNotice.name, 'disabled')
  }

  /**
   * Because it is immutable, a model is cloned when it is updated.
   * It is also cloned when passed between worker threads, stored in
   * shared memory, loaded from external storage or arrives on a network
   * socket. Therefore, if the model depends on inheritance, we have to
   * restore its prototype.
   *
   * @param {} clonedModel
   * @returns
   */
  function rehydrate(clonedModel, model) {
    return model.prototype
      ? Object.setPrototypeOf(clonedModel, model.prototype)
      : clonedModel
  }

  /**
   * Add data and functions that support framework services.
   * @param {{
   *  model:Model,
   *  args:*,
   *  spec:import('./index').ModelSpecification
   * }} modelInfo
   * @returns {Model}
   */
  function make(modelInfo) {
    const {
      model = {},
      spec: {
        onUpdate = defaultOnUpdate,
        onDelete = defaultOnDelete,
        validate = defaultValidate,
        ports,
        domain,
        broker,
        endpoint,
        modelName,
        datasource,
        mixins = [],
        dependencies,
        relations = {},
        approvedChanges,
      },
    } = modelInfo

    return {
      // User mixins
      ...compose(...mixins)(model),

      // Generate functions to fetch related models
      ...makeRelations(relations, datasource, broker),

      // Generate port functions to handle domain I/O
      ...makePorts(ports, dependencies, broker, datasource),

      // Remember port calls
      [PORTFLOW]: [],

      // model class name
      [MODELNAME]: modelName,

      // URI: plural of modelName
      [ENDPOINT]: endpoint,

      // model belongs to
      [DOMAIN]: domain || modelName,

      // this fn injected into dependencies
      [ID]: dependencies.getUniqueId(),

      // Called before update is committed
      [ONUPDATE](changes) {
        return onUpdate(this, changes)
      },

      // Called before delete is committed
      [ONDELETE]() {
        return onDelete(this)
      },

      /**
       * Run validation logic - called on create, load, updated and delete
       * @param {*} changes - updated values
       * @param {eventMask} event - event type, see {@link eventMask}.
       * @returns {Model} - updated model
       */
      [VALIDATE](changes, event) {
        return validate(this, changes, event)
      },

      /**
       * Return the `eventMask` key name of the value of `event`.
       * See {@link eventMask}.
       * @param {number} event
       * @returns {string} key name/s: create, update, onload, delete
       */
      getEventMaskName(event) {
        if (typeof event !== 'number') return
        const key = Object.keys(eventMask).find(k => eventMask[k] & event)
        return key
      },

      /**
       * Compensate for downstream transaction failures.
       * Back out all previous port transactions
       */
      async undo() {
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
      addListener(eventName, callback, options) {
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
      emit(eventName, eventData, options) {
        broker.notify(
          eventName,
          {
            eventName,
            eventData,
            model: this,
          },
          options
        )
      },

      /** @typedef {import('./serializer.js').Serializer} Serializer */

      getDataSourceType() {
        return datasource.getClassName()
      },

      /**
       * Concurrency strategy is to merge changes with
       * zthe current instance; so {@link changes} should include
       * only the subset of properties that are changing.
       * Concomitant strategy is to use `Symbol`s to
       * avoid conflict, which may require a custom
       * {@link Serializer} for network and storage
       * handling. If conflict does occur, last
       * one in wins.
       *
       * @param {object} changes - object containing updated props
       * @param {boolean} validate - run validation by default
       * @returns {Promise<Model>}
       */
      async update (changes, runValidation = true) {
        const approved = approvedChanges
          ? approveChanges(approvedChanges)
          : changes

        // merge changes and optionally validate
        const mergedModel = runValidation
          ? this[VALIDATE](approved, eventMask.update)
          : { ...this, ...approved }

        const timestampedModel = { ...mergedModel, [UPDATETIME]: Date.now() }

        await datasource.save(this[ID], timestampedModel)

        return timestampedModel
      },

      setApprovedChanges (propKeys) {
        approvedChanges.concat(propKeys)
      },

      getApprovedChanges () {
        return approvedChanges
      },

      /**
       * Synchronous version of {@link Model.update}.
       * Only updates cache. External storage is
       * not updated. Use to efficiently communicate
       * state that does not require persistence, e.g.
       * properties that are only needed at runtime.
       *
       * @param {*} changes
       * @param {boolean} validate
       * @returns {Model}
       */
      updateSync (changes, runValidation = true) {
        const approved = approvedChanges
          ? approveChanges(approvedChanges)
          : changes

        // merge changes and optionally validate
        const mergedModel = runValidation
          ? this[VALIDATE](approved, eventMask.update)
          : { ...this, ...approved }

        // update timestamp
        const timestampedModel = { ...mergedModel, [UPDATETIME]: Date.now() }

        // only update the cache
        datasource.saveSync(this[ID], timestampedModel)

        return timestampedModel
      },

      /**
       * If `id` and `data` are null, saves the current
       * object, otherwise saves the specified object and data
       * @param {*} id
       * @param {*} data
       * @returns
       */
      async save(id = null, data = null) {
        if (id && data) return datasource.save(id, data)
        return datasource.save(this[ID], this)
      },

      async find(id) {
        if (!id) throw new Error('missing id')
        return datasource.find(id)
      },

      findSync(id) {
        if (!id) throw new Error('missing id')
        return datasource.findSync(id)
      },

      /**
       * Search existing model instances (synchronously).
       * Only searches the cache. Does not search persistent storage.
       * Useful for getting state that does not require persistence.
       *
       * @param {import('./datasource').dsOpts} filter - list of required matching key-values
       * @returns {Model[]}
       */
      listSync(filter) {
        return datasource.listSync(filter)
      },

      /** @typedef {import('./datasource').default} DataSource */

      /**
       * Retrieve existing model instances (asynchronously).
       * See {@link DataSource.list}.
       *
       * @param {listOptions} options
       * @returns {Promise<Model[]>}
       */
      async list(options) {
        return datasource.list(options)
      },

      /**
       * Availability depends on {@link DataSource} adapter.
       * E.g. the Aegis MongoDB adapter enables streaming upserts.
       * @returns {Writable}
       */
      createWriteStream () {
        return datasource.createWriteStream()
      },

      /**
       * Payload of the request that created this model instance.
       * @returns request payload
       */
      getArgs() {
        return modelInfo.args ? modelInfo.args : []
      },

      /** @typedef {import('.').ModelSpecification} ModelSpec */

      /**
       * The object returned contains the dependencies this
       * model requires. Dependencies are injected through
       * the {@link ModelSpec}
       *
       * @returns {{any}}
       */
      getDependencies () {
        return dependencies
      },

      /**
       * Use to identify event types.
       * @returns {eventMask}
       */
      getEventMask() {
        return eventMask
      },

      /**
       * Returns the `ModelSpecification` for this model.
       *
       * @returns {import(".").ModelSpecification}
       */
      getSpec() {
        return modelInfo.spec
      },

      /**
       * Was this object created from a remote source
       * in the distributed cache?
       *
       * @returns {boolean}
       */
      isCached () {
        return modelInfo.spec.isCached
      },

      /**
       * Returns the `ports` exposed by this domain model.
       *
       * @returns {import(".").ports}
       */
      getPorts() {
        return modelInfo.spec.ports
      },

      /**
       * Returns the `modelName` of this model instance.
       *
       * @returns
       */
      getName() {
        return this[MODELNAME]
      },

      /**
       * Returns ID of this model instance.
       *
       * @returns {string}
       */
      getId() {
        return this[ID]
      },

      /**
       * Return a list of ports invoked by this model instance, in LIFO order.
       *
       * @returns {string[]} history of ports called by this model instance
       */
      getPortFlow() {
        return this[PORTFLOW]
      },

      /**
       * Get the `Symbol` key value for protected properties.
       *
       * @param {string} key - string representation of Symbol
       * @returns {Symbol}
       */
      getKey(key) {
        return keyMap[key]
      },

      /**
       * Is this the same model instance as `model`?
       * @param {*} model
       * @returns {boolean}
       */
      equals (model) {
        return (
          model &&
          (model.id || model.getId) &&
          (model.id === this[ID] || model.getId() === this[ID])
        )
      },

      getContext(name) {
        return asyncContext[name]
      },

      /**
       * Returns related model service, where the two models are
       * related via ModelSpec.relation or belong to the same domain.
       *
       * Note: relation or domain membership must be defined
       * in ModelSpec; otherwise, we won't be able to access
       * the model's memory. Every domain model employs this
       * capability-based security measure.
       *
       * @returns {Model}
       */
      fetchRelatedService (modelName) {
        const upperName = modelName.toUpperCase()
        const ds = datasource.factory.getDataSource(upperName)
        if (!ds) throw new Error('no datasource found')
        return require('.').default.getService(upperName, ds, broker)
      },

      /**
       * Returns this model's {@link DataSource}.
       * @returns {DataSource}
       */
      getDataSource () {
        // prevents access to ds of other models
        return datasource.factory.getRestrictedDataSource(
          this[MODELNAME],
          this[DOMAIN]
        )
      },
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
  const Model = modelInfo =>
    make({
      // Call factory with data from request payload
      model: modelInfo.spec.factory(...modelInfo.args),
      args: modelInfo.args,
      spec: modelInfo.spec,
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

  /**
   * Return an object with all the methods/ports of
   * the specified model, but none of its properties;
   * namely those that come from its factory function.
   * This object functions as the model's service
   * implementation.
   *
   * Methods that rely on factory-generated
   * properties will not work; only static- and
   * framework-generated methods are available.
   *
   * Useful for invoking port methods that do not
   * rely on model state.
   *
   * @param {import('.').ModelSpecification} spec model spec
   * @returns {Model}
   */
  const makeService = spec => make({ spec })

  return {
    /**
     * Create a new model instance
     * @param {{
     *  spec: import('./index').ModelSpecification
     *  args: any[]
     * }} modelInfo
     * @returns {Promise<Readonly<Model>>}
     */
    create: modelInfo => makeModel(modelInfo),

    /**
     * Rehydrate a deserialized model instance.
     * @param {Model} savedModel deserialized model
     * @param {import('.').ModelSpecification}
     */
    load: modelInfo => loadModel(modelInfo),

    /**
     * Process update request.
     * (Invokes user-provided `onUpdate` and `validate` callback.)
     * @param {Model} model - model instance  update
     * @param {Object} changes - Object contatoining changes
     * @returns {Model} updated model
     *
     */
    update: (model, changes) => model.updateSync(changes),

    /**
     * Run the model's validation functions.
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
    getId: model => model[ID],

    makeService,
  }
})()

export default Model
