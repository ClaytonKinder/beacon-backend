const mongoose = require('mongoose');
const Beacon = mongoose.model('Beacon');
const User = mongoose.model('User');
var request = require('request');
let distance = require('google-distance');
distance.apiKey = process.env.DISTANCEMATRIX_API_KEY

exports.getAddressFromCoordinates = async (req, res) => {
  request(
    {
      uri: `https://maps.googleapis.com/maps/api/geocode/json?latlng=${req.body.lat},${req.body.lng}&key=${process.env.GEOCODING_API_KEY}`
    },
    function (error, response) {
      if (!error && response.statusCode === 200) {
        let obj = JSON.parse(response.body)
        if (obj.results[0] && obj.results[0].formatted_address) {
          res.status(200).json(obj.results[0].formatted_address);
        } else {
          res.status(404).json({ success: false, message: 'Could not get address data at this time' });
        }
      } else {
        res.status(404).json(error);
      }
    }
  )
}

exports.getCoordinatesFromAddress = async (req, res) => {
  request(
    {
      uri: `https://maps.googleapis.com/maps/api/geocode/json?address=${req.body.address}&key=${process.env.GEOCODING_API_KEY}`
    },
    function (error, response) {
      if (!error && response.statusCode === 200) {
        let obj = JSON.parse(response.body)
        if (obj.results[0] && obj.results[0].geometry && obj.results[0].geometry.location) {
          res.status(200).json(obj.results[0].geometry.location);
        } else {
          res.status(404).json({ success: false, message: 'Could not get address data at this time' });
        }
      } else {
        res.status(404).json(error);
      }
    }
  )
}

exports.getDistanceBetweenCoordinates = (req, res) => {
  distance.get({
    origin: `${req.body.lat1},${req.body.lng1}`,
    destination: `${req.body.lat2},${req.body.lng2}`
  },
  (err, data) => {
    if (err) {
      res.status(404).json({ success: false, message: 'Unable to check beacon distance at this time' });
      return;
    }
    // Must be within a certain radius to connect
    data.canConnect = !(data.distanceValue >= Number(process.env.CONNECTION_DISTANCE));
    data.canUpdateAddress = !(data.distanceValue >= 250);
    res.status(200).json(data);
  })
}

exports.autocompleteAddress = async (req, res) => {
  request(
    {
      uri: `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${req.body.address}&key=${process.env.PLACES_API_KEY}`
    },
    function (error, response) {
      if (!error && response.statusCode === 200) {
        let obj = JSON.parse(response.body)
        let cleansed = obj.predictions.map((location) => {
          return {
            label: location.description,
            value: location.description
          }
        })
        res.status(200).json(cleansed);
      } else {
        res.status(404).json(error);
      }
    }
  )
}
