//require('dotenv').config();
import 'dotenv/config';
import express from 'express'
import cors from 'cors';
const app = express();
import  bodyParser  from 'body-parser';
//cliente Redis
import { createClient } from 'redis';
// Crea una instancia del cliente Redis
const client = await createClient({
  password: 'TEST_test1',
  socket: {
    host: 'redis-19831.c226.eu-west-1-3.ec2.redns.redis-cloud.com',
    port: 19831
  },
  
  legacyMode: true
});
//client.connect().catch(console.error)
//client.connect();
// Basic Configuration
const port = process.env.PORT || 3000;

// Genera un ID único utilizando la biblioteca `shortid`
function generateUniqueId() {
  //const nanoid = require('nanoid');
  const id = Math.floor(Math.random() * 1000);
  console.log(id);
  return id;

}

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});
app.post('/api/shorturl', (req, res) => {
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
