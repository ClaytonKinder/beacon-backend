const mongoose = require('mongoose');
const Beacon = mongoose.model('Beacon');
const User = mongoose.model('User');
const { checkMinMax } = require('../helpers');
let distance = require('google-distance');
distance.apiKey = process.env.DISTANCEMATRIX_API_KEY
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

function filterBeacons (beacons, user) {
  let filtered = beacons.filter((beacon) => {
    let keepBeacon = true;
    let filterArray = [
      (user.age < beacon.additionalSettings.ageRange.min),
      (user.age > beacon.additionalSettings.ageRange.max),
      (beacon.additionalSettings.genderRestriction === 'maleOnly' && user.gender !== 'male'),
      (beacon.additionalSettings.genderRestriction === 'femaleOnly' && user.gender !== 'female')
    ];
    filterArray.map((filter) => {
      if (filter) {
        keepBeacon = false
      }
    })
    return keepBeacon;
  })
  return filtered;
}

exports.mapBeacons = async (req, res) => {
  const coordinates = [req.body.lng, req.body.lat].map(parseFloat);
  const unit = req.body.unitOfMeasurement || 'miles';
  const radius = checkMinMax(req.body.searchRadius, 1, 30) || 15;
  const limit = checkMinMax(req.body.beaconLimit, 1, 100) || 50;
  let max = (unit === 'miles') ? radius * 1609.344 : radius * 1000;
  let q = {
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
  Beacon.find(q).populate('author').exec((err, beacons) => {
    beacons = filterBeacons(beacons, req.body.user).slice(0, limit - 1);
    if (req.body.user.beacon) {
      Beacon.findOne({ author: req.body.user._id }).populate('author').exec((err, userBeacon) => {
        beacons.unshift(userBeacon);
        res.status(200).json(beacons);
      });
    } else {
      res.status(200).json(beacons);
    }
  });
};

exports.checkBeaconDistance = (req, res, next) => {
  distance.get({
    origin: `${req.body.userLat},${req.body.userLng}`,
    destination: `${req.body.beaconLat},${req.body.beaconLng}`
  },
  (err, data) => {
    if (err) {
      return res.status(404).json({ success: false, message: 'Unable to check beacon distance at this time' });
    }
    // Must be within a certain radius to connect
    data.canConnect = !(data.distanceValue > Number(process.env.CONNECTION_DISTANCE));
    if (!data.canConnect) {
      return res.status(404).json({ success: false, message: 'You are not close enough to connect to this beacon' });
    } else {
      return next();
    }
  })
}

exports.getBeaconDistance = (req, res) => {
  distance.get({
    origin: `${req.body.userLat},${req.body.userLng}`,
    destination: `${req.body.beaconLat},${req.body.beaconLng}`
  },
  (err, data) => {
    if (err) {
      res.status(404).json({ success: false, message: 'Unable to check beacon distance at this time' });
      return;
    }
    // Must be within a certain radius to connect
    data.canConnect = !(data.distanceValue > Number(process.env.CONNECTION_DISTANCE));
    res.status(200).json(data);
  })
}

exports.verifyUserHasNoBeacon = async (req, res, next) => {
  const user = await User.findOne({ _id: req.body.userId })
  if (user.beacon) {
    res.status(404).send({success: false, message: 'You must extinguish your beacon before connecting to others'})
  } else {
    next();
  }
}
