const { eventEmitter } = require('./helpers');

module.exports = function (io) {

  function createMessage (data) {
    return {
      approveConnectionRequest: {
        type: 'positive',
        message: `${data.fromName} has approved your connection request`,
        dispatch: 'refreshUser'
      },
      denyConnectionRequest: {
        type: 'negative',
        message: `${data.fromName} has denied your connection request`,
        dispatch: 'refreshUser'
      },
      createConnectionRequest: {
        dispatch: 'refreshUser'
      },
      cancelConnectionRequest: {
        dispatch: 'refreshUser'
      },
      removeConnection: {
        type: 'negative',
        message: `You have been removed from ${generatePossessive(data.fromName)} beacon`,
        dispatch: 'refreshUser'
      },
      disconnectFromBeacon: {
        dispatch: 'refreshUser'
      },
      extinguishBeacon: {
        type: 'negative',
        message: `${generatePossessive(data.fromName)} beacon has been extinguished`,
        dispatch: 'refreshUser'
      }
    }
  }

  function generatePossessive (str) {
    if (str.substr(str.length - 1) !== 's') {
      str += '\'';
      str += 's';
    } else {
      str += '\'';
    }
    return str;
  }

  function getSocketByUserId (userId) {
    let socket = false;
    Object.keys(io.sockets.connected).forEach((key) => {
      if (io.sockets.connected[key].userId === userId) {
        socket = io.sockets.connected[key];
      }
    });
    return socket;
  }

  function socketEmit (data, type) {
    // toId (either this or toIds, not both)
    // toIds (either this or toId, not both)
    // fromId
    if (data.toId) {
      if (getSocketByUserId(data.toId)) {
        if (createMessage(data)[type]) {
          getSocketByUserId(data.toId).emit('socketEvent', createMessage(data)[type])
        } else {
          getSocketByUserId(data.toId).emit('socketEvent')
        }
      }
    } else if (data.toIds) {
      data.toIds.forEach((value) => {
        if (getSocketByUserId(value)) {
          if (createMessage(data)[type]) {
            getSocketByUserId(value).emit('socketEvent', createMessage(data)[type])
          } else {
            getSocketByUserId(value).emit('socketEvent')
          }
        }
      })
    }
  }

  io.on('connection', function (socket) {
    socket.on('userNavigatedToPostlogin', function (data) {
      if (io.sockets.connected[socket.id] && data) {
        io.sockets.connected[socket.id].userId = data.userId;
      }
    });
    socket.on('userNavigatedToPrelogin', function (data) {
      if (data) {
        delete io.sockets.connected[getSocketByUserId(data.userId).id];
      }
    });
    socket.on('denyConnectionRequest', function (data) {
      socketEmit(data, 'denyConnectionRequest');
    });
    socket.on('approveConnectionRequest', function (data) {
      socketEmit(data, 'approveConnectionRequest');
    });
    socket.on('disconnectFromBeacon', function (data) {
      socketEmit(data, 'disconnectFromBeacon');
    });
    socket.on('removeConnection', function (data) {
      socketEmit(data, 'removeConnection');
    });
    socket.on('extinguishBeacon', function (data) {
      socketEmit(data, 'extinguishBeacon');
    });
    socket.on('cancelConnectionRequest', function (data) {
      socketEmit(data, 'cancelConnectionRequest');
    });
    socket.on('createConnectionRequest', function (data) {
      socketEmit(data, 'createConnectionRequest');
    });
  });
}
