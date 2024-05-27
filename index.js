//require('dotenv').config();
import 'dotenv/config';
import express from 'express'
import cors from 'cors';
import { promisify } from 'util';
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

// Convertimos los métodos Redis en promesas para poder utilizar async/await
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const incrAsync = promisify(client.incr).bind(client);
const dnsLookupAsync = promisify(dns.lookup).bind(dns);
const keysAsync = promisify(client.keys).bind(client);


app.get('/', async (req, res) => {

  try {
    const puntero = await getAsync('puntero')
    !puntero ?
      await setAsync(`puntero`, 0)
      :
      console.log(" El indice esta en : " + puntero);

  } catch (error) {
    console.error(error);
  }
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async (req, res) => {
  //let urlRegex = /https:\/\/www.|https:\/\/|http:\/\/www.|http:\/\/|\/ /g;
  //const url = req.body.url;
  const url = new URL(req.body.url);
  const hostname = url.hostname;
  try {
    const address = await dnsLookupAsync(hostname);
    const puntero = await getAsync('puntero');
    await setAsync(req.body.url, puntero);
    res.json({original_url : req.body.url, short_url : puntero});
    await incrAsync(`puntero`);
  } catch (error) {
    console.error(error);
    res.json({ error: 'invalid url' });
  }

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
app.get('/api/shorturl/:id', async (req, res) => {

  const result = await searchValue(req.params.id);
  console.log(result.key);
  res.redirect(result.key);
  /*getValueByKey(req.params.id, (err, value) => {
    if (err) {
      console.error('Error al obtener el valor', err);
    } else {
      res.redirect(value);
    }
  });
*/

});


app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

async function searchValue(value) {
  const keys = await keysAsync('*');
  const results = [];

  for (const key of keys) {
    const val = await getAsync(key);
    if (val === value) {
      results.push({ key, value });
    }
  }
  
  return results;
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
/*
// Uso de ejemplo
getKeysCount((err, count) => {
  if (err) {
    console.error('Error al obtener el número de claves', err);
  } else {
    console.log('Número de claves:', count);
  }
});*/

// Función para guardar un par clave:valor
function saveKeyValue(key, callback) {
  // Comprobar si la clave ya existe
  client.exists(key, (err, reply) => {
    if (err) {
      console.error('Error al comprobar la clave', err);
      callback(err, null);
    } else {
      if (reply === 1) { // clave existente
        client.get(key, (err, reply) => {
          if (err) {
            console.error('Error al obtener el valor', err);
            callback(err, null);
          } else {
            callback(null, { key, value: parseInt(reply) });
          }
        });
      } else { // la clave no existe
        client.dbsize((err, reply) => {
          if (err) {
            console.error('Error al obtener el tamaño de la base de datos', err);
            callback(err, null);
          } else {
            //const dbSize = parseInt(reply);

            client.set(key, reply, (err, reply) => {
              if (err) {
                console.error('Error al incrementar el tamaño de la base de datos', err);
                callback(err, null);
              } else {
                callback(null, { key, value: reply });
              }
            });
          }
        });
      }
    }
  });
}
/*
// Uso de ejemplo
const key = 'mi-clave';

saveKeyValue(key, (err, result) => {
  if (err) {
    console.error('Error al guardar el par clave:valor', err);
  } else {
    console.log('Par clave:valor guardado:', result);
  }
});
*/

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
/*
const key = 'mi-clave'; // La clave que quieres verificar
 
checkKeyExists(key, (err, exists) => {
  if (err) {
    console.error('Error al verificar la clave', err);
  } else {
    console.log('La clave existe:', exists);
  }
});*/