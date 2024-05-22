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
app.get('/api/shorturldb', async (req, res) => {
  getAllKeysAndValues((err, values) => {
    if (err) {
      console.error('Error retrieving keys and values', err);
    } else {
      console.log('Keys and Values:', values);
    }
  });
  res.json({});
});
app.get('/api/shorturl/:id', async (req, res) => {
  console.log("req: " + req.params.id);
  const value = await client.get(req.params.id.toString());
  console.log("url: " + value);
  res.json({ url: req.params.id, value: " " + value });
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
function getAllKeysAndValues(callback) {
  let cursor = '0';
  let keys = [];

  function scanNextBatch() {
    client.scan(cursor, 'MATCH', '*', 'COUNT', '100', (err, reply) => {
      if (err) {
        console.error('Error scanning keys', err);
        callback(err, null);
        return;
      } 
      cursor = reply[0];
      const batchKeys = reply[1]; 
      if (batchKeys.length > 0) {
        keys.push(...batchKeys);
      } 
      if (cursor === '0') {
        // All keys have been scanned, retrieve values
        getValues(keys, callback);
      } else {
        // Continue scanning
        scanNextBatch();
      }
    });
  } 
  scanNextBatch();
}
// Retrieve values for the keys
function getValues(keys, callback) {
  const values = {}; 
  keys.forEach((key, index) => {
    client.type(key, (err, reply) => {
      if (err) {
        console.error('Error retrieving data type for key', key, err);
        callback(err, null);
        return;
      } 
      const dataType = reply; 
      if (dataType === 'hash') {
        client.hgetall(key, (err, reply) => {
          if (err) {
            console.error('Error retrieving Hash data', key, err);
            callback(err, null);
            return;
          } 
          values[key] = reply; 
          if (index === keys.length - 1) {
            // All values have been retrieved
            callback(null, values);
          }
        });
      } else if (dataType === 'string') {
        client.get(key, (err, reply) => {
          if (err) {
            console.error('Error retrieving String data', key, err);
            callback(err, null);
            return;
          } 
          values[key] = reply; 
          if (index === keys.length - 1) {
            // All values have been retrieved
            callback(null, values);
          }
        });
      } else {
        // Data type not supported
        console.error('Unsupported data type for key', key);
        callback({ message: 'Unsupported data type' }, null);
        return;
      }
    });
  });
}

// Usage
getAllKeysAndValues((err, values) => {
  if (err) {
    console.error('Error retrieving keys and values', err);
  } else {
    console.log('Keys and Values:', values);
  }
});