const subscription = function ({ eventName, callback, filter }) {
  function filter (searchString) {}
  return {
    filter
  }
}

export function publish (service) {
  return async function (eventName, eventData) {
    service.publish(eventName, eventData)
  }
}

export function subscribe (service) {
  return async function (subscription) {
    service.listen(function (msg) {
      subscription.filter(msg)
    })
  }
}
