const mongoose = require('mongoose');

// import environmental variables from our variables.env file
require('dotenv').config({ path: 'variables.env' });

// Connect to our database and deal with bad connections
mongoose.connect(process.env.DATABASE, {
  keepAlive: 1,
  connectTimeoutMS: 30000,
  reconnectTries: 30,
  reconnectInterval: 5000
});
mongoose.Promise = global.Promise; // Use ES6 promises
mongoose.connection.on('error', (err) => {
  console.error(`Mongoose error → ${err.message}`);
});

// Import beacon and user models
require('./models/Beacon');
require('./models/User');

// Start 'er up!
const app = require('./app');
app.set('port', process.env.PORT || 7777);
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
const io = require('socket.io').listen(server);
require('./sockets')(io);
