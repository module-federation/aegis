'use strict';

/**
 *
 * @param {import("../use-cases/add-model").createModel} createModel
 * @param {function():string} hash
 * @returns {import("./http-adapter").httpController}
 */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = postModelFactory;
function postModelFactory(createModel) {
  return async function postModel(httpRequest) {
    try {
      httpRequest.log(postModel.name);
      const model = await createModel(httpRequest.body);
      console.debug({
        function: createModel.name,
        output: model
      });
      return {
        headers: {
          'Content-Type': 'application/json',
          'Last-Modified': new Date().toISOString()
        },
        statusCode: 201,
        body: {
          status: "ok",
          modelId: model.id
        }
      };
    } catch (e) {
      console.error(e);
      return {
        headers: {
          'Content-Type': 'application/json'
        },
        statusCode: e.code || 400,
        body: {
          error: e.message
        }
      };
    }
  };
}