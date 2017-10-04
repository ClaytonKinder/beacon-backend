const mongoose = require('mongoose');
const Beacon = mongoose.model('Beacon');
const User = mongoose.model('User');
const { checkMinMax } = require('../helpers');

exports.severAllConnectionRequestsToBeacon = async (req, res, next) => {
  // Find all users with outgoing requests to the severed beacon to remove them
  const removeOutgoingPromise = User.update(
    { 'outgoingConnectionRequest.beaconId': req.body.beaconId },
    {
      $unset: {
        'outgoingConnectionRequest': ''
      }
    }, {
      new: true
    }
  )
  await Promise.all([removeOutgoingPromise, removeIncomingPromise]);
  next()
}

exports.createConnectionRequest = async (req, res) => {
  // Find owner of severed beacon and add incoming request
  const beaconOwnerPromise = Beacon.findOneAndUpdate(
    { _id: req.body.beaconId },
    {
      $push: {
        'incomingConnectionRequests': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
          ownerName: req.body.ownerName,
          name: req.body.name,
          gravatar: req.body.gravatar,
          created: Date.now()
        }
      }
    }, {
      new: true
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
          created: Date.now()
        }
      }
    }, {
      new: true
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
  res.status(200).send(requestingUser);
}
