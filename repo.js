'use strict'

const express = require('express')
const app = express()
const port = 8880

app.use(express.json())
app.use(express.static('dist'))

app.listen(port, () => console.log('listening on', port))
