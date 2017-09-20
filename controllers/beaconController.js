const mongoose = require('mongoose');
const Beacon = mongoose.model('Beacon');
const User = mongoose.model('User');
const { checkMinMax } = require('../helpers');
// const multer = require('multer');
// const jimp = require('jimp');
// const uuid = require('uuid');

// exports.validateBeaconRegister = (req, res, next) => {
//   req.sanitizeBody('firstName');
//   req.checkBody('firstName', 'You must supply a first name!').notEmpty();
//   req.checkBody('lastName', 'You must supply a last name!').notEmpty();
//   req.checkBody('email', 'That email is not valid!').isEmail();
//   req.sanitizeBody('email').normalizeEmail({
//     remove_dots: false,
//     remove_extension: false,
//     gmail_remove_subaddress: false
//   });
//   req.checkBody('password', 'Password cannot be blank!').notEmpty();
//   req.checkBody('passwordConfirmation', 'Confirmed password cannot be blank!').notEmpty();
//   req.checkBody('passwordConfirmation', 'Oops! Your passwords do not match').equals(req.body.password);
//
//   const errors = req.validationErrors();
//   if (errors) {
//     res.status(400).json(errors)
//     return; // Stop the function from running
//   }
//   next(); // There were no errors
// };

exports.lightBeacon = async (req, res) => {
  const beacon = await(new Beacon(req.body)).save();
  res.status(200).json(beacon)
};

exports.extinguishBeacon = async (req, res) => {
  if (!req.params.userId) {
    res.status(400).json({ success: false, message: 'A user ID must be provided' });
  }
  Beacon.remove({ author: req.params.userId }, function(err) {
    if (err) {
      res.status(404).json({ success: false, message: 'Unable to extinguish beacon at this time' });
    }
    else {
      res.status(200).json({ success: true, message: 'Beacon successfully extinguished' });
    }
  });
};

exports.mapBeacons = async (req, res) => {
  const coordinates = [req.body.lng, req.body.lat].map(parseFloat);
  const unit = req.body.unitOfMeasurement || 'miles';
  const radius = checkMinMax(req.body.searchRadius, 1, 30) || 15;
  const limit = checkMinMax(req.body.beaconLimit, 1, 100) || 50;
  let max;
  // Convert miles to meters
  if (unit === 'miles') {
    max = radius * 1609.344;
  } else {
  // Convert meters to kilometers
    max = radius * 1000;
  }
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: max
      }
    }
  }

  const beacons = await Beacon.find(q).populate('author').limit(limit);
  res.status(200).json(beacons);
};
