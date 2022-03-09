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

function getResourceName (httpRequest, defaultTitle) {
  if (/threads/i.test(httpRequest.query.details)) return 'Thread Pools'
  if (/data/i.test(httpRequest.query.details)) return 'Data Sources'
  return defaultTitle
}

export default function getContent (httpRequest, content, defaultTitle) {
  const contentArr = content instanceof Array ? content : [content]

  if (!httpRequest.query.html)
    return { contentType: 'application/json', content }

  if (httpRequest.query.html) {
    const title = getResourceName(httpRequest, defaultTitle)

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

    contentArr.forEach(contents => {
      text += `<div style="margin-bottom: 12px;">
                    <table id="configs">`

      Object.keys(contents).forEach(key => {
        let val = contents[key]
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
