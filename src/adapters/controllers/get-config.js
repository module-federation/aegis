'use strict'

function getResourceName (httpRequest) {
  if (/threads/i.test(httpRequest.query.details)) return 'Thread Pools'
  if (/data/i.test(httpRequest.query.details)) return 'Data Sources'
  return 'Model Specifications'
}

function getContent (httpRequest, configs) {
  if (!httpRequest.query.html)
    return { contentType: 'application/json', content: configs }

  if (httpRequest.query.html) {
    const title = getResourceName(httpRequest)

    let text = `
          <!DOCTYPE html>
          <html>
          <h2 style='color: white'>${title}</h2>         
          <body style="background-color: black  ;">`

    configs.forEach(config => {
      text += `<div style="margin-bottom: 12px;">
                    <table style="border: 0px; color:white">`

      Object.keys(config).forEach(key => {
        let val = config[key]
        if (typeof val === 'object')
          val = `<pre>${JSON.stringify(val, null, 2)}</pre>`
        text += `<tr><td>${key}</td><td>${val}</td></tr>`
      })

      text += '</table></div>'
    })
    text += '</body></html>'

    return { contentType: 'text/html', content: text }
  }
}

export default function getConfigFactory (listConfigs) {
  return async function getConfig (httpRequest) {
    try {
      httpRequest.log(getConfig.name)

      const configs = await listConfigs(httpRequest.query)
      const { contentType, content } = getContent(httpRequest, configs)

      return {
        headers: {
          'Content-Type': contentType
        },
        statusCode: 200,
        body: content
      }
    } catch (e) {
      return {
        headers: {
          'Content-Type': 'application/json'
        },
        statusCode: 400,
        body: {
          error: e.message
        }
      }
    }
  }
}
