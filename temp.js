const express = require('express')
const app = express()
const port = 3000

app.use(express.static("C:\\Users\\J.R. Williams\\Documents\\Projects\\not-alone"))

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})