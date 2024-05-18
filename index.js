require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
//cliente Redis
const redis = require('redis');
// Crea una instancia del cliente Redis
const client = redis.createClient();

// Basic Configuration
const port = process.env.PORT || 3000;

// Genera un ID único utilizando la biblioteca `shortid`
function generateUniqueId() {
  const shortid = require('shortid');
  return shortid.generate();
}

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});
app.get('/api/shorturl', function(req, res) {
/*
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
       const generatedUrl = `https://your-backend-api-url/${id}`;
       res.json({ generatedUrl });
     });
*/
 
  res.json({ 
    original_url: 'hello API' ,
  short_url:''
  });
});
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
