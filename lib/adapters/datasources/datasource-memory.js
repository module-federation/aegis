'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DataSourceMemory = void 0;
var _datasource = _interopRequireDefault(require("../../domain/datasource"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Temporary in-memory storage.
 */
class DataSourceMemory extends _datasource.default {
  constructor(map, name, namespace, options) {
    super(map, name, namespace, options);
  }

  /**
   * @override
   *
   * Update cache and datasource. Sync cache of other
   * cluster members if running in cluster mode.
   *
   * @param {*} id
   * @param {*} data
   * @param {*} sync - sync cluster nodes, true by default
   * @returns
   */
  save(id, data, sync = true) {
    if (sync && process.send === 'function') {
      /** send data to cluster members */
      process.send({
        cmd: 'saveBroadcast',
        pid: process.pid,
        name: this.name,
        data,
        id
      });
    }
    this.saveSync(id, data);
  }
  find(id) {
    return this.findSync(id);
  }
  list(options) {
    return this.listSync(options);
  }

  /**
   * @override
   */
  delete(id, sync = true) {
    if (sync && process.send === 'function') {
      process.send({
        cmd: 'deleteBroadcast',
        pid: process.pid,
        name: this.name,
        id
      });
    }
    return this.deleteSync(id);
  }
}
exports.DataSourceMemory = DataSourceMemory;