//require('dotenv').config();
import 'dotenv/config';
import express from 'express'
import cors from 'cors';

import dns from 'dns';
import url from 'node:url';
const app = express();
import bodyParser from 'body-parser';
//cliente Redis
import { createClient } from 'redis';
// Crea una instancia del cliente Redis
const client = await createClient({
  password: 'TEST_test1',
  username: 'url',
  socket: {
    host: 'redis-19831.c226.eu-west-1-3.ec2.redns.redis-cloud.com',
    port: 19831
  },

  legacyMode: true
})
  .on('error', err => console.log('Redis Client Error', err))
  .connect();
//client.connect().catch(console.error)
//client.connect();
// Basic Configuration
const port = process.env.PORT || 3000;

// Genera un ID único utilizando la biblioteca `shortid`
function generateUniqueId() {
  //falta comprobar que no existe en la base de datos
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
app.get('/api/shorturl:id', function (req, res) {
  res.json({ greeting: 'hello API' });
});
app.post('/api/shorturl', (req, res) => {
  console.log(req.body.url);
  let urlRegex = /https:\/\/www.|http:\/\/www./g;
  dns.lookup(req.body.url.replace(urlRegex, ""), (err, url_Ip) => {
    if (err) {
      //If url is not valid -> respond error
      console.log(url_Ip);
      return res.json({ error: 'invalid url' });
    }
    else {
      const url = req.body.url;

      // Genera un ID único para la URL
      const id = generateUniqueId();

      // Guarda la URL en Redis utilizando el ID como clave
      client.set(id, url, (err, reply) => {
        if (err) {
          console.error('Error al guardar la URL', err);
          return res.status(500).json({ error: 'Error al guardar la URL' });
        }
        res.json({
          original_url: req.body.url,
          short_url: id
        });
      });
    }

  });



});
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
