require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
import { nanoid } from 'https://cdn.jsdelivr.net/npm/nanoid/nanoid.js'
const bodyParser = require('body-parser');
//cliente Redis
const redis = require('redis');
// Crea una instancia del cliente Redis
const client = redis.createClient({
  host: 'redis-19831.c226.eu-west-1-3.ec2.redns.redis-cloud.com',
  port: 19831,
  password: 'TEST_test1'
});
// Basic Configuration
const port = process.env.PORT || 3000;

// Genera un ID único utilizando la biblioteca `shortid`
function generateUniqueId() {
  //const nanoid = require('nanoid');
  return nanoid();
}

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});
app.post('/api/shorturl',  (req, res) => {
console.log(req.body);
  const url = req.body.url;

  // Genera un ID único para la URL
  const id = generateUniqueId();

  // Guarda la URL en Redis utilizando el ID como clave
  client.set(id, url, (err, reply) => {
    if (err) {
      console.error('Error al guardar la URL', err);
      return res.status(500).json({ error: 'Error al guardar la URL' });
    }

    // Devuelve la URL generada que incluye el ID
    var generatedUrl = `https://your-backend-api-url/${id}`;
    res.json({
      original_url: req.body.url,
      short_url: generatedUrl
    });
  });



});
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
