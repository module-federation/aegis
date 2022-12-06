"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = patchModelFactory;
/**
 *
 * @param {import("../../domain/use-cases/edit-model.js").editModel} editModel
 * @returns {import("../http-adapter").httpController}
 */
function patchModelFactory(editModel) {
  return async function patchModel(httpRequest) {
    try {
      httpRequest.log(patchModel.name);
      const model = await editModel({
        id: httpRequest.params.id,
        changes: httpRequest.body,
        command: httpRequest.params.command
      });
      console.log(model);
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
      if (e.message === 'Not Found') {
        return {
          headers: {
            'Content-Type': 'application/json'
          },
          statusCode: 404
        };
      }
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