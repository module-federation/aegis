'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _stream = require("stream");
var _worker_threads = require("worker_threads");
var _ = _interopRequireDefault(require("."));
var _eventBroker = _interopRequireDefault(require("./event-broker"));
var adapters = _interopRequireWildcard(require("../adapters/datasources"));
var _config = _interopRequireDefault(require("../config"));
var _datasource = _interopRequireDefault(require("./datasource"));
var _compose = _interopRequireDefault(require("./util/compose"));
var _sharedMemory = require("./shared-memory");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/** @typedef {import('.').Model} Model */

/**
 * @typedef {object} dsOpts
 * @property {boolean} memoryOnly - if true returns memory adapter and caches it
 * @property {boolean} ephemeral - if true returns memory adapter but doesn't cache it
 * @property {string} adapterName - name of adapter to use
 */

const debug = /\*|datasource/i.test(process.env.DEBUG);
const broker = _eventBroker.default.getInstance();
const FACTORY = Symbol('factory');
const defaultAdapter = _config.default.hostConfig.adapters.defaultDatasource;
const DefaultDataSource = adapters[defaultAdapter] || adapters.dsClasses['DataSourceMemory'];

/**
 * Core extensions include object caching, marshalling and serialization.
 * Using this compositional mixin, these extensions are applied transparently
 * to any {@link DataSource} class in the hierarchy.
 *
 * @param {*} superclass
 * @returns
 */
const DsCoreExtensions = superclass => class extends superclass {
  constructor(map, name, namespace, options) {
    super(map, name, namespace, options);
  }
  set factory(value) {
    this[FACTORY] = value;
  }
  get factory() {
    return this[FACTORY];
  }

  // serialize (data, options) {
  //   if (options?.serializers) return options.serializers['serialize'](data)
  //   return JSON.stringify(data)
  // }

  /**
   * Override the super class, adding cache and serialization functions.
   * @override
   * @param {string} id
   * @param {Model} data
   */
  async save(id, data) {
    try {
      await super.save(id, JSON.parse(JSON.stringify(data)));
      this.saveSync(id, data);
    } catch (error) {
      console.error({
        fn: this.save.name,
        error
      });
      throw error;
    }
  }

  /**
   * Retrieve the {@link Model} with the specified `id`.
   * Searches cache first. Hydrates result if in a worker thread.
   * @override
   * @param {string} id
   * @returns {Promise<Model>|undefined}
   */
  async find(id) {
    try {
      const cached = this.findSync(id);
      if (cached) return cached;
      const model = await super.find(id);
      if (model) {
        // save to cache
        this.saveSync(id, model);
        return _worker_threads.isMainThread ? model : _.default.loadModel(broker, this, model, this.name);
      }
    } catch (error) {
      console.error({
        fn: this.find.name,
        error
      });
      throw error;
    }
  }
  transform() {
    const ctx = this;
    return new _stream.Transform({
      objectMode: true,
      transform(chunk, _encoding, next) {
        this.push(_.default.loadModel(broker, ctx, chunk, ctx.name));
        next();
      }
    });
  }

  /**
   * @override
   * @param {*} options
   * @returns
   */
  async list(options) {
    try {
      if (options?.writable) return _worker_threads.isMainThread ? super.list(options) : super.list({
        ...options,
        transform: this.transform()
      });
      const arr = await super.list(options);
      if (Array.isArray(arr)) return _worker_threads.isMainThread ? arr : arr.map(model => _.default.loadModel(broker, this, model, this.name));
    } catch (error) {
      console.error({
        fn: this.list.name
      });
      throw error;
    }
  }

  /**
   * @override
   * @param {*} id
   * @returns
   */
  async delete(id) {
    try {
      await super.delete(id);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      // only if super succeeds
      this.deleteSync(id);
    }
  }
};
const extendClass = DsClass => class extends DsCoreExtensions(DsClass) {};

/**
 * Manages each domain model's dedicated datasource.
 * @todo handle all state same way
 * @typedef {{
 *  getDataSource:function(string): import("./datasource").default,
 *  getSharedDataSource(string): import("./datasource").default,
 *  getRestrictedDataSource(string): import("./datasource").default,
 *  listDataSources:Map[]
 * }} DataSourceFactory
 * @type {DataSourceFactory}
 */
const DataSourceFactory = (() => {
  /**
   * Contains the datasource of every model
   * @type {Map<string, DataSource>}
   */
  let dataSources;

  /**
   * @param {*} name
   * @returns
   */
  function hasDataSource(name) {
    return dataSources.has(name);
  }
  function listDataSources() {
    return [...dataSources.keys()];
  }

  /**
   * @typedef dsOpts
   * @property {boolean} memoryOnly don't persist to storage
   * @property {boolean} cachedWrite allow cached ds to write to storage
   * @property {boolean} ephemeral temporary datastore - used just once
   * @property {string} adapterName specify the adapter to use
   * @property {Map<string,any>|import('sharedmap').SharedMap} dsMap
   * data source location and structure for private or shared memory
   * @property {function(typeof DataSource):typeof DataSource[]} mixins
   */

  /**
   * Create the class based on the options passed in,
   * customizations defined in the ModelSpec, or, if no
   * configuration is provided, use the default adapter
   * for the host instance.
   *
   * @param {import('.').ModelSpecification} spec
   * @param {dsOpts} options
   * @returns {typeof DataSource}
   */
  function createDataSourceClass(spec, options) {
    const {
      memoryOnly,
      ephemeral,
      adapterName
    } = options;
    if (memoryOnly || ephemeral) return adapters.dsClasses['DataSourceMemory'];
    if (adapterName) return adapters[adapterName] || DefaultDataSource;
    if (spec?.datasource?.factory) {
      const url = spec.datasource.url;
      const cacheSize = spec.datasource.cacheSize;
      const adapterFactory = spec.datasource.factory;
      const BaseClass = adapters.dsClasses[spec.datasource.baseClass] || _datasource.default;
      return adapterFactory(url, cacheSize, BaseClass);
    }
    return DefaultDataSource;
  }

  /**
   * Apply core compositional mixins and any extensions specifed in
   * {@link options}. Compostion allows us to observe the open/closed
   * principle and add new feature/functions arbitrarily to any
   * datasource class in the hierarchy without having to modify it.
   *
   * @param {typeof DataSource} DsClass
   * @param {dsOpts} options
   * @returns {typeof DataSource}
   */
  function extendDataSourceClass(DsClass, options = {}) {
    const mixins = [extendClass].concat(options.mixins || []);
    return (0, _compose.default)(...mixins)(DsClass);
  }

  /**
   *
   * @param {string} name
   * @param {dsOpts} [options]
   * @returns {DataSource}
   */
  function createDataSource(name, namespace, options) {
    const spec = _.default.getModelSpec(name);
    const dsMap = options.dsMap || new Map();
    const DsClass = createDataSourceClass(spec, options);
    const DsExtendedClass = extendDataSourceClass(DsClass, options);
    if (spec.datasource) {
      options = {
        ...options,
        connOpts: {
          ...spec.datasource
        }
      };
    }
    const newDs = new DsExtendedClass(dsMap, name, namespace, options);
    newDs.factory = this; // setter to avoid exposing in ctor
    if (!options.ephemeral) dataSources.set(name, newDs);
    debug && console.debug({
      newDs
    });
    return newDs;
  }

  /**
   * Get the datasource for each model.
   *
   * @param {string} name - model name
   * @param {dsOpts} options
   * @returns {import('./datasource').default}
   */
  function getDataSource(name, namespace = null, options = {}) {
    if (!dataSources) dataSources = new Map();
    if (!namespace) return dataSources.get(name);
    if (dataSources.has(name)) return dataSources.get(name);
    return createDataSource(name, namespace, options);
  }

  /**
   * Create a datasource based on {@link SharedArrayBuffer} that will live in
   * shared memory to be accessed in parallel by multiple coordinating threads.
   *
   * @param {string} name
   * @param {dsOpts} [options]
   * @returns
   */
  function getSharedDataSource(name, namespace = null, options = {}) {
    if (!dataSources) dataSources = new Map();
    if (!namespace) return dataSources.get(name);
    if (dataSources.has(name)) return dataSources.get(name);
    return (0, _sharedMemory.withSharedMemory)(createDataSource, this, name, namespace, options);
  }

  /**
   * Return a {@link Proxy} of the ds that traps calls to any functions
   * that could have security or privacy implications if accessed by
   * hosted code.
   *
   * @param {string} name
   * @returns {ProxyHandler<DataSource>}
   */
  function getRestrictedDataSource(name, namespace, options) {
    return new Proxy(getDataSource(name, namespace, options), {
      get(target, key) {
        if (key === 'factory') {
          throw new Error('unauthorized');
        }
      },
      ownKeys(target) {
        return [];
      }
    });
  }
  function close() {
    dataSources.forEach(ds => ds.close());
  }
  return Object.freeze({
    /**
     * Get `DataSource` singleton
     * @method
     * @returns {import('./datasource').default} DataSource singleton
     */
    getDataSource,
    getSharedDataSource,
    getRestrictedDataSource,
    hasDataSource,
    listDataSources,
    close
  });
})();

/** @type {DataSourceFactory}*/
var _default = DataSourceFactory;
exports.default = _default;