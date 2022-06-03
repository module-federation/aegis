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
          cls = "<span style='color: lightblue'>"
        } else {
          cls = '<span>'
        }
      } else if (/true|false/.test(match)) {
        cls =
          "<span style='color: lightgreen                                                                         '>"
      } else if (/null/.test(match)) {
        cls = "<span style='color: orange'>"
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
  const spec = ModelFactory.getModelSpec(modelName)
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
      const title =
        getResourceName(httpRequest, defaultTitle) ||
        'AEGIS FEDERATED MICROSERVICES'

      let html = `
          <!DOCTYPE html>
          <html>
          <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/png" href="/aegis-logo.png" />
          
          <link
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css"
            rel="stylesheet"
            integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3"
            crossorigin="anonymous"
          />
          
          <title>${title}</title>
          <style>
            a:link {
              color: orange;
              background-color: transparent;
              text-decoration: none;
            }

            a:visited {
              color: pink;
              background-color: transparent;
              text-decoration: none;
            }

            a:hover {
              color: fusia;
              background-color: transparent;
              text-decoration: underline;
            }

            a:active {
              color: yellow;
              background-color: transparent;
              text-decoration: underline;
            }
            </style>
          </head>
          <body class="bg-dark">
          <script
            src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"
            integrity="sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p"
            crossorigin="anonymous"
          ></script>

          <nav class="navbar navbar-dark bg-warning" aria-label="navbar">
          <div class="container-fluid">
            <a class="navbar-brand" href="/">
              <img src="/aegis-logo.png" alt="aegis" width="65" height="65" />
              <span class="navbar-brand mb-0 text-warning h1">
                <span class="text-black\"><b>${title}</b></span>
              </span>
            </a>
          </div>
          </nav>`

      contents.forEach(function (content) {
        html += `<table class="table table-dark table-striped table-hover">  <thead>`
        html += `<tr><th scope="col">key</th><th scope="col">value</th></tr></thead>`
        Object.keys(content).forEach(key => {
          let val = content[key]

          if (typeof val === 'object')
            val = `<pre><code>${prettifyJson(
              JSON.stringify(val, null, 2)
            )}</code></pre>`

          html += `<tr><td style="width:100px">${key}</td><td>${val}</td></tr>`
        })
        html += '</div></table>'
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

        html += '<div class="mb3">'
        ModelFactory.getModelSpecs().forEach(s => {
          html += `<a href="${httpRequest.path}?${queryText}modelName=${s.modelName}">View thread info for ${s.modelName}</a><br>`
          try {
            console.debug(httpRequest.query.details === 'data')
            if (httpRequest.query.details === 'data') {
              const related = findLocalRelatedModels(s.modelName)
              related.forEach(
                rel =>
                  (html += `<a href="${httpRequest.path}?${queryText}modelName=${s.modelName}&poolName=${rel}">View ${s.modelName} thread info for ${rel}</a><br>`)
              )
            }
          } catch (error) {
            console.error(error)
          }
        })
        html += '</div>'
      }
      html += '</div></body></html>'

      return { contentType: 'text/html', content: html }
    }
  } catch (error) {
    console.log(error)
  }
}
