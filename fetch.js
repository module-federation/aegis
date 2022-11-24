fetch('https://google.com').then(r => r.arrayBuffer().then(a => console.log(Buffer.from(a).toString())))
