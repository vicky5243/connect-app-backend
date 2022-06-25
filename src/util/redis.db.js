const { createClient } = require('redis');

const client = createClient();

client.on('connect', () => {
  console.log('Client connected to redis.');
});

client.on('error', err => {
  console.log(err.message);
});

client.on('end', () => {
  console.log('Client disconnected from redis.');
});

process.on('SIGINT', () => {
  client.quit();
});

module.exports = client;