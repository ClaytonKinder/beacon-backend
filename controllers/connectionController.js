const mongoose = require('mongoose');
const Beacon = mongoose.model('Beacon');
const User = mongoose.model('User');
const { checkMinMax } = require('../helpers');

exports.severAllConnectionsToBeacon = async (req, res, next) => {
  // Find all users with outgoing requests to the severed beacon to remove them
  const removingOutgoingRequestsPromise = User.update(
    { 'outgoingConnectionRequest.beaconId': req.body.beaconId },
    {
      $unset: {
        'outgoingConnectionRequest': ''
      }
    }, {
      new: true
    }
  )
  const removingConnectionsPromise = User.update(
    { 'connectedTo.beaconId': req.body.beaconId },
    {
      $unset: {
        'connectedTo': ''
      }
    }, {
      new: true
    }
  )
  await Promise.all([removingOutgoingRequestsPromise, removingConnectionsPromise]);
  next()
}

exports.checkIfConnectionRequestAlreadyExists = async (req, res, next) => {
  // This prevents duplicate connection requests for the same beacon
  const connectionRequest = await User.findOne({
    _id: req.body.userId,
    'outgoingConnectionRequest.beaconId': req.body.beaconId
  })
  if (connectionRequest) {
    res.status(404).send({ success: false, message: 'You have already sent a connection request to this beacon' });
  } else {
    next();
  }
}

exports.createConnectionRequest = async (req, res) => {
  // Find owner of severed beacon and add incoming request
  await Beacon.update(
    {},
    {
      $pull: {
        incomingConnectionRequests: {
          userId: req.body.userId
        }
      }
    }, {
      multi: true,
      new: true,
      runValidators: true
    }
  )
  const beaconOwnerPromise = Beacon.findOneAndUpdate(
    { _id: req.body.beaconId },
    {
      $addToSet: {
        'incomingConnectionRequests': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
          ownerName: req.body.ownerName,
          name: req.body.name,
          gravatar: req.body.gravatar,
          lat: req.body.lat,
          lng: req.body.lng,
          created: Date.now()
        }
      }
    }, {
      new: true,
      runValidators: true
    }
  )
  // Find the requesting user and add outgoing request
  const requestingUserPromise = User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $set: {
        'outgoingConnectionRequest': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
          ownerName: req.body.ownerName,
          name: req.body.name,
          gravatar: req.body.gravatar,
          lat: req.body.lat,
          lng: req.body.lng,
          created: Date.now()
        }
      }
    }, {
      new: true,
      runValidators: true
    }
  ).select('-password')
  const [beaconOwner, requestingUser] = await Promise.all([beaconOwnerPromise, requestingUserPromise]);
  res.status(200).json(requestingUser);
};

exports.cancelConnectionRequest = async (req, res) => {
  const beaconOwnerPromise = Beacon.findOneAndUpdate(
    { _id: req.body.beaconId },
    {
      $pull: {
        'incomingConnectionRequests': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
        }
      }
    }, {
      new: true
    }
  )
  const requestingUserPromise = User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $set: {
        'outgoingConnectionRequest': {}
      }
    }, {
      new: true
    }
  ).select('-password')
  const [beaconOwner, requestingUser] = await Promise.all([beaconOwnerPromise, requestingUserPromise]);
  res.status(200).send(requestingUser);
}

exports.denyConnectionRequest = async (req, res) => {
  const beaconPromise = Beacon.findOneAndUpdate(
    { _id: req.body.beaconId },
    {
      $pull: {
        'incomingConnectionRequests': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
        }
      }
    }, {
      new: true
    }
  )
  const requestingUserPromise = User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $set: {
        'outgoingConnectionRequest': {}
      }
    }, {
      new: true
    }
  ).select('-password')
  const [beacon, requestingUser] = await Promise.all([beaconPromise, requestingUserPromise]);
  res.status(200).send(beacon);
}

exports.approveConnectionRequest = async (req, res) => {
  let date = Date.now()
  const beaconPromise = Beacon.findOneAndUpdate(
    { _id: req.body.beaconId },
    {
      $pull: {
        'incomingConnectionRequests': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
        }
      },
      $push: {
        'connections': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
          ownerName: req.body.ownerName,
          name: req.body.name,
          gravatar: req.body.gravatar,
          created: date
        }
      }
    }, {
      new: true
    }
  )
  const requestingUserPromise = User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $set: {
        'outgoingConnectionRequest': {},
        'connectedTo': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
          ownerName: req.body.ownerName,
          name: req.body.name,
          gravatar: req.body.gravatar,
          lat: req.body.lat,
          lng: req.body.lng,
          created: date
        }
      }
    }, {
      new: true
    }
  ).select('-password')
  const [beacon, requestingUser] = await Promise.all([beaconPromise, requestingUserPromise]);
  res.status(200).send(beacon);
}

exports.removeConnection = async (req, res) => {
  const beaconPromise = Beacon.findOneAndUpdate(
    { _id: req.body.beaconId },
    {
      $pull: {
        'connections': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
        }
      }
    }, {
      new: true
    }
  )
  const requestingUserPromise = User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $set: {
        'connectedTo': {}
      }
    }, {
      new: true
    }
  ).select('-password')
  const [beacon, requestingUser] = await Promise.all([beaconPromise, requestingUserPromise]);
  res.status(200).send(beacon);
}

exports.disconnectFromBeacon = async (req, res) => {
  const beaconPromise = Beacon.findOneAndUpdate(
    { _id: req.body.beaconId },
    {
      $pull: {
        'connections': {
          userId: req.body.userId,
          beaconId: req.body.beaconId
        }
      }
    }, {
      new: true
    }
  )
  const requestingUserPromise = User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $set: {
        'connectedTo': {}
      }
    }, {
      new: true
    }
  ).select('-password')
  const [beacon, requestingUser] = await Promise.all([beaconPromise, requestingUserPromise]);
  res.status(200).send(requestingUser);
}
