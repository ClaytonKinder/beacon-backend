const mongoose = require('mongoose');
const Beacon = mongoose.model('Beacon');
const User = mongoose.model('User');
const { checkMinMax } = require('../helpers');
let distance = require('google-distance');
distance.apiKey = process.env.DISTANCEMATRIX_API_KEY

exports.lightBeacon = async (req, res) => {
  await Beacon.remove({ author: req.body.author })
  const beacon = await(new Beacon(req.body)).save();
  const user = await User.findOne({_id: req.body.author});
  res.status(200).json(user)
};

exports.extinguishBeacon = async (req, res) => {
  await Beacon.remove({ author: req.body.userId });
  const user = await User.findOne({ _id: req.body.userId });
  res.status(200).json(user);
};

function filterBeacons (beacons, user) {
  let obj = JSON.parse(JSON.stringify(beacons));
  let filtered = obj.filter((beacon) => {
    let keepBeacon = true;
    if (!beacon.author || !beacon.author.settings || !beacon.author.settings.showBeaconAddress) {
      beacon.address = null;
    }
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

exports.verifyBeaconRequirements = async (req, res, next) => {
  const beacon = await Beacon.findOne({ _id: req.body.beaconId });
  if (!beacon) {
    res.status(404).send({ success: false, message: 'Beacon does not exist' });
  } else {
    let keepBeacon = true;
    let filterArray = [
      (req.body.user.age < beacon.additionalSettings.ageRange.min),
      (req.body.user.age > beacon.additionalSettings.ageRange.max),
      (beacon.additionalSettings.genderRestriction === 'maleOnly' && req.body.user.gender !== 'male'),
      (beacon.additionalSettings.genderRestriction === 'femaleOnly' && req.body.user.gender !== 'female')
    ];
    filterArray.map((filter) => {
      if (filter) {
        keepBeacon = false
      }
    })
    if (keepBeacon) {
      next()
    } else {
      res.status(404).send({ success: false, message: 'You do not meet the requirements to connect with this beacon' });
    }
  }
}

exports.mapBeacons = async (req, res) => {
  const coordinates = [req.body.lng, req.body.lat].map(parseFloat);
  const unit = req.body.unitOfMeasurement || 'miles';
  const radius = checkMinMax(req.body.searchRadius, 1, 30) || 15;
  const limit = checkMinMax(req.body.beaconLimit, 1, 100) || 50;
  let max = (unit === 'miles') ? radius * 1609.344 : radius * 1000;
  let q = {
    author: {
      $ne: req.body.user._id
    },
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
    if (err) {
      return res.status(404).send({ success: false, message: 'Could not get beacons at this time' })
    }
    if (!beacons) {
      return res.status(404).send({ success: false, message: 'There are no beacons around you at this time' })
    }
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
    destination: `${req.body.lat},${req.body.lng}`
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

exports.verifyUserHasNoBeacon = async (req, res, next) => {
  const user = await User.findOne({ _id: req.body.userId })
  if (user.beacon) {
    res.status(404).send({success: false, message: 'You must extinguish your beacon before connecting to others'})
  } else {
    next();
  }
}

exports.verifyBeaconPassword = (req, res) => {
  // find the user
  Beacon.findOne({
    _id: req.body.beaconId
  }, function(err, beacon) {
    if (err) throw err;
    if (!beacon) {
      res.status(400).json({ success: false, message: 'This beacon does not exist' });
    } else if (beacon) {
      beacon.comparePassword(req.body.password, function(err, isMatch) {
        if (err) {
          res.status(400).json({ success: false, message: 'Oops! Something went wrong during the validation process' });
        } else if (!isMatch) {
          res.status(400).json({ success: false, message: 'Incorrect password' });
        } else {
          res.status(200).send(true)
        }
      });
    }
  });
}
