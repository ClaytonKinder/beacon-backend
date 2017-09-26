const mongoose = require('mongoose');
const Beacon = mongoose.model('Beacon');
const User = mongoose.model('User');
const { checkMinMax } = require('../helpers');

exports.severConnectionsToBeacon = async (req, res) => {
  // Find all users with outgoing requests to the severed beacon to remove them
  const removeOutgoingPromise = User.update(
    { 'connectionRequests.outgoing.beaconId': req.body.beaconId },
    {
      $unset: {
        'connectionRequests.outgoing': ''
      }
    }, {
      new: true
    }
  )
  // Find owner of severed beacon and remove incoming requests
  const removeIncomingPromise = User.update(
    { _id: req.body.beaconOwnerId },
    {
      $set: {
        'connectionRequests.incoming': []
      }
    }, {
      new: true
    }
  )
  await Promise.all([removeOutgoingPromise, removeIncomingPromise]);
  res.status(200).json({ success: true, message: 'All connections to this beacon have been severed' });
}

exports.createConnectionRequest = async (req, res) => {
  const beaconOwnerPromise = User.findOneAndUpdate(
    { _id: req.body.beaconOwnerId },
    {
      $push: {
        'connectionRequests.incoming': {
          userId: req.body.userId,
          beaconId: req.body.beaconId,
          beaconOwnerId: req.body.beaconOwnerId,
          ownerName: req.body.ownerName,
          name: req.body.name,
          gravatar: req.body.gravatar,
          seen: false,
          created: Date.now()
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
        'connectionRequests.outgoing': {
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
  const beaconOwnerPromise = User.findOneAndUpdate(
    { _id: req.body.beaconOwnerId },
    {
      $pull: {
        'connectionRequests.incoming': {
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
        'connectionRequests.outgoing': {}
      }
    }, {
      new: true
    }
  ).select('-password')
  const [beaconOwner, requestingUser] = await Promise.all([beaconOwnerPromise, requestingUserPromise]);
  res.status(200).send(requestingUser);
}
