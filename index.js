//require('dotenv').config();
import 'dotenv/config';
import express from 'express'
import cors from 'cors';

import bodyParser from 'body-parser';
//cliente Redis
import { createClient } from 'redis';
import dns from 'dns';
const app = express();
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
app.get('/api/hello/:hola', async (req, res) => {
  res.json({ greeting: 'hello API' + req.params.hola });
});
app.get('/api/shorturldb', async (req,res )=> {
  res.json({});
});
app.get('/api/shorturl/:id', async (req, res) => {
  console.log("req: " + req.params);
  const value = await client.get(req.params.id);
  console.log("rediresct: " + value);
  res.redirect(value);
});
app.post('/api/shorturl', (req, res) => {

  let urlRegex = /https:\/\/www.|https:\/\/|http:\/\/www.|http:\/\/|\//g;
  console.log(req.body.url.replace(urlRegex, ""));
  dns.lookup(req.body.url.replace(urlRegex, ""), async (err, url_Ip) => {
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
      await client.set(id, url, (err, reply) => {
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
