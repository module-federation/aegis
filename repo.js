'use strict'

const express = require('express')
// serve .wasm files (content-type; application/was)
express.static.mime.define({ 'application/wasm': ['wasm'] })
const app = express()
const port = process.argv[2] || 8000
const dir = process.argv[3] || 'dist'

app.use(express.json())
app.use(express.static(dir))

app.listen(port, () => console.log(`repo serving ${dir} on ${port}`))
