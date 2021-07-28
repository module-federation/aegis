import domainEvents from "./domain-events";

async function reportStatus(status, eventFn, model) {
  const result = { compensateResult: status };
  await model.emit(eventFn(model), result);
  await model.update(result);
  return;
}

/**
 * Steps through the sequence of port calls
 * in LIFO order executing their undo functions.
 * @param {import('.').Model} model
 * @returns {function():Promise<void>}
 */
export default async function compensate(model) {
  try {
    const portFlow = model.getPortFlow();
    const ports = model.getPorts();

    await model.emit(domainEvents.undoStarted(model), "undo starting");

    const undoModel = await Promise.resolve(
      portFlow.reduceRight(async function (model, port, index, arr) {
        if (ports[port].undo) {
          console.info("calling undo on port: ", port);

          try {
            return model.then(async function (model) {
              await ports[port].undo(model);

              return model.update({
                [model.getKey("portFlow")]: arr.splice(0, index),
              });
            });
          } catch (error) {
            console.error(compensate.name, error.message);
          }
        }
        return model;
      }, model.update({ compensate: true }))
    );

    if (undoModel.getPortFlow().length > 0) {
      await reportStatus("INCOMPLETE", domainEvents.undoFailed, undoModel);
      return;
    }

    await reportStatus("COMPLETE", domainEvents.undoWorked, undoModel);
  } catch (error) {
    await model.emit(domainEvents.undoFailed(model), error.message);
    console.error(compensate.name, error.message);
  }
}
