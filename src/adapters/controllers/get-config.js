'use strict'

function getResourceName (httpRequest) {
  if (/threads/i.test(httpRequest.query.details)) return 'Thread Pools'
  if (/data/i.test(httpRequest.query.details)) return 'Data Sources'
  return 'Model Specifications'
}

function prettifyJson (json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2)
  }
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      let cls = '<span>'
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "<span style='color: blue'>"
        } else {
          cls = '<span>'
        }
      } else if (/true|false/.test(match)) {
        cls = "<span style='color: violet'>"
      } else if (/null/.test(match)) {
        cls = "<span style='color: green'>"
      }
      return cls + match + '</span>'
    }
  )
}

function getContent (httpRequest, configs) {
  if (!httpRequest.query.html)
    return { contentType: 'application/json', content: configs }

  if (httpRequest.query.html) {
    const title = getResourceName(httpRequest)

    let text = `
          <!DOCTYPE html>
          <html>
          <h2 style='color: black'>${title}</h2> 
          <style>
          #configs {
            font-family: Arial, Helvetica, sans-serif;
            border-collapse: collapse;
            width: 50%;
          }
          #configs td, #configs th {
            border: 1px solid #ddd;
            padding: 8px;
          }
          #configs tr:nth-child(even){background-color: #f2f2f2;}
          #configs tr:hover {background-color: #ddd;}
          #configs th {
            padding-top: 12px;
            padding-bottom: 12px;
            text-align: left;
            background-color: #04AA6D;
            color: white;
          }
          </style>       
          <body>`

    configs.forEach(config => {
      text += `<div style="margin-bottom: 12px;">
                    <table id="configs">`

      Object.keys(config).forEach(key => {
        let val = config[key]
        if (typeof val === 'object')
          val = `<pre><code>${prettifyJson(
            JSON.stringify(val, null, 2)
          )}</code></pre>`
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
