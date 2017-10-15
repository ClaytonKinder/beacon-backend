const mongoose = require('mongoose');
const Beacon = mongoose.model('Beacon');
const User = mongoose.model('User');

exports.validateGetAddressFromCoordinates = (req, res, next) => {
  req.sanitizeBody('lat');
  req.sanitizeBody('lng');
  req.checkBody('lat', 'You must supply a latitude value').notEmpty();
  req.checkBody('lng', 'You must supply a longitude value').notEmpty();
  const errors = req.validationErrors();
  if (errors) {
    return res.status(400).json(errors);
  }
  next();
}

exports.validateGetCoordinatesFromAddress = (req, res, next) => {
  req.sanitizeBody('address');
  req.checkBody('address', 'You must supply an address').notEmpty();
  const errors = req.validationErrors();
  if (errors) {
    return res.status(400).json(errors);
  }
  next();
}

exports.validateAutocompleteAddress = (req, res, next) => {
  req.sanitizeBody('address');
  req.checkBody('address', 'You must supply an address').notEmpty();
  const errors = req.validationErrors();
  if (errors) {
    return res.status(400).json(errors);
  }
  next();
}
