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
  // Usage
  getAllKeysAndValues((err, values) => {
    if (err) {
      console.error('Error retrieving keys and values', err);
    } else {
      console.log('Keys and Values:', values);
      res.json(values);
    }
  });
});
/*
  getAllKeysAndValues()
    .then((values) => {
      console.log('Keys and Values:', values);
    })
    .catch((err) => {
      console.error('Error retrieving keys and values', err);
    });
  res.json({});
});*/
app.get('/api/shorturl/:id', async (req, res) => {

  getValueByKey(req.params.id, (err, value) => {
    if (err) {
      console.error('Error al obtener el valor', err);
    } else {
      res.redirect(value);
    }
  });


});
app.post('/api/shorturl', (req, res) => {
  let urlRegex = /https:\/\/www.|https:\/\/|http:\/\/www.|http:\/\/|\/ /g;
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
      //var id;
      // Uso de ejemplo
      generateUniqueId((err, id) => {
        if (err) {
          console.error('Error al generar la clave única', err);
        } else {
          console.log('Clave única generada:', id);
          // Guarda la URL en Redis utilizando el ID como clave
          client.set(id, url, (err, reply) => {
            if (err) {
              console.error('Error al guardar la URL', err);
              return res.status(500).json({ error: 'Error al guardar la URL' });
            }
            return res.json({
              original_url: req.body.url,
              short_url: id
            });
          });
        }
      });
    }

  });



});
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});


// Genera un ID único utilizando la biblioteca `shortid`
function generateUniqueId(callback) {
  const id = Math.floor(Math.random() * 10000);

  // Verificar si la clave ya existe en la base de datos
  client.exists(id, (err, reply) => {
    if (err) {
      console.error('Error al verificar la clave', err);
      callback(err, null);
    } else {
      if (reply === 1) {
        // La clave ya existe, generar una nueva clave
        generateUniqueId(callback);
      } else {
        // La clave no existe, devolverla
        callback(null, id);
      }
    }
  });
}


// Obtener el valor de una clave
function getValueByKey(key, callback) {
  client.get(key, (err, reply) => {
    if (err) {
      console.error('Error al obtener el valor', err);
      callback(err, null);
    } else {
      callback(null, reply);
    }
  });
}
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
// Verificar si una clave existe
function checkKeyExists(key, callback) {
  client.exists(key, (err, reply) => {
    if (err) {
      console.error('Error al verificar la clave', err);
      callback(err, null);
    } else {
      callback(null, reply === 1);
    }
  });
}

// Uso de ejemplo
const key = 'mi-clave'; // La clave que quieres verificar

checkKeyExists(key, (err, exists) => {
  if (err) {
    console.error('Error al verificar la clave', err);
  } else {
    console.log('La clave existe:', exists);
  }
});
// Obtener el número de claves en la base de datos
function getKeysCount(callback) {
  client.dbsize((err, reply) => {
    if (err) {
      console.error('Error al obtener el número de claves', err);
      callback(err, null);
    } else {
      callback(null, reply);
    }
  });
}

// Uso de ejemplo
getKeysCount((err, count) => {
  if (err) {
    console.error('Error al obtener el número de claves', err);
  } else {
    console.log('Número de claves:', count);
  }
});




// Retrieve all the keys and values

/*
async function getAllKeysAndValues() {
  let cursor = '0';
  let keys = [];

  async function scanNextBatch() {
    const [newCursor, batchKeys] = await client.scanAsync(cursor, 'MATCH', '*', 'COUNT', '100');

    cursor = newCursor;

    if (batchKeys.length > 0) {
      keys.push(...batchKeys);
    }

    if (cursor === '0') {
      // All keys have been scanned, retrieve values
      const values = await getValues(keys);
      return values;
    } else {
      // Continue scanning
      return scanNextBatch();
    }
  }

  return scanNextBatch();
}

// Retrieve values for the keys
async function getValues(keys) {
  const values = {};

  for (const key of keys) {
    const dataType = await client.typeAsync(key);

    if (dataType === 'hash') {
      const value = await client.hgetallAsync(key);
      values[key] = value;
    } else if (dataType === 'string') {
      const value = await client.getAsync(key);
      values[key] = value;
    } else {
      // Data type not supported
      console.error('Unsupported data type for key', key);
      throw new Error('Unsupported data type');
    }
  }

  return values;
}
*/

