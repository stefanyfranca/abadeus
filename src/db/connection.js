const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/abadeus');

mongoose.connection.on('connected', () => console.log('MongoDB conectado'));
mongoose.connection.on('error', (err) => console.error('Erro na conexão com o MongoDB:', err));

module.exports = mongoose;