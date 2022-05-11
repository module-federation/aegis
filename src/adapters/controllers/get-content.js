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
  //console.debug({ localModels })
  const spec = ModelFactory.getModelSpec(modelName)
  //console.debug({ spec })
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
          <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
          <title>${title}</title>
          <div class="w3-container w3-amber">
            <a href="/index.html"> <img src="/aegis-logo.png" alt="aegis" width="65" height="65" style="font: x-large" /><b>ÆGIS</b> Federated Microservices</a>
          </div> 
          <style>
            a:link {
              text-decoration: none;
            }
            body {
              background-color: w3-dark-gray;
            }
            div.spacer {
              margin: 10px; 
            }
            table {
              width: 50%;
            }
            th {
              color: white;
              background: black;
              font-size: 12px;
            }
            td {
              text-align: left;
              font-size: 12px;
            }
          </style>
          </head>                     
          <body>
          <div class="w3-container w3-dark-gray">`

      contents.forEach(function (content) {
        text += `<div class="w3-padding-large"><table class="w3-table w3-bordered w3-border w3-hover-grey w3-hoverable w3-hover-border-amber">`
        text += `<tr><th>key</th><th>value</th></tr>`
        Object.keys(content).forEach(key => {
          let val = content[key]

          if (typeof val === 'object')
            val = `<pre><code>${prettifyJson(
              JSON.stringify(val, null, 2)
            )}</code></pre>`

          text += `<tr><td style="width:100px">${key}</td><td>${val}</td></tr>`
        })
        text += '</table></div>'
      })

      /**
       * If the content applies to both the main thread
       * and worker threads, display links to the thread
       * equivalent of the main content.
       *
       * E.g. Both the main and worker threads have events
       * but subcribe to different ones depending on the
       * application code running in the thread.
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

        text += '<div class="spacer">'
        ModelFactory.getModelSpecs().forEach(s => {
          text += `<a href="${httpRequest.path}?${queryText}modelName=${s.modelName}">View thread info for ${s.modelName}</a><br>`
          try {
            console.debug(httpRequest.query.details === 'data')
            if (httpRequest.query.details === 'data') {
              const related = findLocalRelatedModels(s.modelName)
              related.forEach(
                rel =>
                  (text += `<a href="${httpRequest.path}?${queryText}modelName=${s.modelName}&poolName=${rel}">View ${s.modelName} thread info for ${rel}</a><br>`)
              )
            }
          } catch (error) {
            console.error(error)
          }
        })
        text += '</div>'
      }
      text += '</div></body></html>'

      return { contentType: 'text/html', content: text }
    }
  } catch (error) {
    console.log(error)
  }
}
