'use strict'

import ModelFactory from '../../domain'

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

function getResourceName (httpRequest, defaultTitle = '') {
  if (/events/i.test(httpRequest.query.details)) return 'Domain Events'
  if (/threads/i.test(httpRequest.query.details)) return 'Thread Pools'
  if (/data/i.test(httpRequest.query.details)) return 'Data Sources'
  if (/ports/i.test(httpRequest.query.details)) return 'Ports'
  if (/commands/i.test(httpRequest.query.details)) return 'Commands'
  if (/relation/i.test(httpRequest.query.details)) return 'Relations'
  return defaultTitle
}

function findLocalRelatedModels (modelName) {
  const localModels = ModelFactory.getModelSpecs().map(s =>
    s.modelName.toUpperCase()
  )
  console.debug({ localModels })
  const spec = ModelFactory.getModelSpec(modelName)
  console.debug({ spec })
  const result = !spec?.relations
    ? []
    : Object.keys(spec.relations)
        .map(k => spec.relations[k].modelName.toUpperCase())
        .filter(modelName => localModels.includes(modelName))

  console.log({ result })
  return result
}

/**
 * Return JSON or HTML
 * @param {*} httpRequest
 * @param {*} content
 * @param {*} defaultTitle
 * @returns
 */

export default function getContent (httpRequest, content, defaultTitle) {
  const contents = content instanceof Array ? content : [content]
  try {
    if (!httpRequest.query.html)
      return { contentType: 'application/json', content }

    if (httpRequest.query.html) {
      const title = getResourceName(httpRequest, defaultTitle)

      let text = `
          <!DOCTYPE html>
          <html>
          <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/png" href="/aegis-logo.png" />
          <h3>
            <a href="/index.html"> <img src="/aegis-logo.png" alt="aegis" width="65" height="65" style="font: x-large" /><b>ÆGIS</b> Domain Model API</a>
          </h3> 
          </head>
          <style>
          #configs {
            font-family: Arial, Helvetica, sans-serif;
            border-collapse: collapse;
            width: 50%;
          } 
          #configs td, #configs th {
            border: 1px solid #ddd;
            padding: 8px;
            width:30%
          }
          #configs tr:nth-child(even){background-color: #f2f2f2;}
          #configs tr:hover {background-color: #ddd;}
          #configs th {
            padding-top: 12px;
            padding-bottom: 12px;
            text-align: left;
            width: 100%;
            background-color: #04AA6D;
            color: white;
          }
          </style>       
          <body>`

      contents.forEach(function (content) {
        text += `<div style="margin-bottom: 40px;">
                    <table id="configs" border="3px solid #ddd; border-collapse: collapse">`

        Object.keys(content).forEach(key => {
          let val = content[key]

          if (typeof val === 'object')
            val = `<pre><code>${prettifyJson(
              JSON.stringify(val, null, 2)
            )}</code></pre>`

          text += `<tr><td>${key}</td><td>${val}</td></tr>`
        })
        text += '</table></div>'
      })

      /**
       * If the content applies to both the main thread
       * and worker threads, display links to the thread
       * equivalent of the main content.
       *
       * E.g. Both the main and worker threads have events and
       * data but only the main thread knows about threadpools
       */
      if (
        /config/i.test(httpRequest.path) &&
        !Object.keys(httpRequest.query).includes('modelName') &&
        !Object.values(httpRequest.query).includes('threads')
      ) {
        const queryParams = Object.keys(httpRequest.query).map(
          k => `${k}=${httpRequest.query[k]}`
        )
        let queryText = ''
        queryParams.forEach(p => (queryText += p + '&'))

        text += '<div style="margin-bottom: 20px">'
        ModelFactory.getModelSpecs().forEach(s => {
          text += `<a href="${httpRequest.path}?${queryText}modelName=${s.modelName}">View thread info for ${s.modelName}</a><br>`
          try {
            const lrmArr = findLocalRelatedModels(s.modelName)
            if (lrmArr) {
              lrmArr.forEach(
                lrm =>
                  (text += `<a href="${httpRequest.path}?${queryText}modelName=${s.modelName}&poolName=${lrm}">View ${s.modelName} thread info for ${lrm}</a><br>`)
              )
            }
          } catch (error) {
            console.error(error)
          }
        })
        text += '</div>'
      }
      text += '</body></html>'

      return { contentType: 'text/html', content: text }
    }
  } catch (error) {
    console.log(error)
  }
}
