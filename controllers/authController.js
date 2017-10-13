// const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Beacon = mongoose.model('Beacon');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');
const jwt = require('jsonwebtoken');

exports.authenticate = (req, res) => {
  User.findOne({
    lowercaseEmail: req.body.email.toLowerCase()
  }, function(err, user) {
    if (err) throw err;
    if (!user) {
      res.status(400).json({ success: false, message: 'Authentication failed. User not found.' });
    } else if (user) {
      user.comparePassword(req.body.password, function(err, isMatch) {
        if (err) {
          res.status(400).json({ success: false, message: 'Oops! Something went wrong during the registration process' });
        } else if (!isMatch) {
          res.status(400).json({ success: false, message: 'Authentication failed. Wrong password.' });
        } else {
          let tokenData = {
            email: user.email,
            _id: user._id
          }
          var token = jwt.sign(tokenData, process.env.SECRET);
          // return the information including token as JSON
          res.status(200).json({
            success: true,
            token: token
          });
        }
      });
    }
  });
};

exports.deleteAccount = async (req, res) => {
  let user = await User.findOne({ _id: req.body.userId });
  let extinguishSocketObj = null;
  let denySocketObj = null;
  if (user.beacon) {
    if (user.beacon.connections.length) {
      extinguishSocketObj = {
        toIds: user.beacon.connections.map((connection) => {
          return connection.userId
        }),
        fromId: user._id,
        fromName: user.fullName
      }
    }
    if (user.beacon.incomingConnectionRequests.length) {
      denySocketObj = {
        toIds: user.beacon.incomingConnectionRequests.map((request) => {
          return request.userId
        }),
        fromId: user._id,
        fromName: user.fullName
      }
    }
  }
  const deleteUserPromise = User.remove({ _id: req.body.userId })
  const deleteBeaconPromise = Beacon.remove({ author: req.body.userId })
  // Find all users with outgoing requests to the severed beacon to remove them
  const removingOutgoingRequestsPromise = User.update(
    { 'outgoingConnectionRequest.beaconOwnerId': req.body.userId },
    {
      $unset: {
        'outgoingConnectionRequest': ''
      }
    }, {
      new: true
    }
  )
  const removingConnectionsPromise = User.update(
    { 'connectedTo.beaconOwnerId': req.body.userId },
    {
      $unset: {
        'connectedTo': ''
      }
    }, {
      new: true
    }
  )
  await Promise.all([deleteUserPromise, deleteBeaconPromise, removingOutgoingRequestsPromise, removingConnectionsPromise]);
  res.status(200).json({
    success: true,
    userId: req.body.userId,
    extinguishSocketObj,
    denySocketObj
  })
}

exports.hasToken = (req, res, next) => {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  // decode token
  if (token) {
    jwt.verify(token, process.env.SECRET, function(err, decoded) {
      if (err) {
        return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.status(403).send({
        success: false,
        message: 'No token provided.'
    });
  }
};

// Only used after hasToken as additional middleware
exports.checkUserAgainstToken = (req, res, next) => {
  let idFields = [req.body.userId, req.body._id, req.body];
  if (!req.decoded) {
    return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
  } else {
    if (!idFields.includes(req.decoded._id)) {
      return res.status(401).json({ success: false, message: 'You are not allowed to affect the data of other users' });
    } else {
      next();
    }
  }
};

exports.isAuth = (req, res) => {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, process.env.SECRET, function(err, decoded) {
      if (err) {
        return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        // if everything is good, save to request for use in other routes
        User.findOne({
          _id: decoded._id
        }).populate('beacon').select('-password').exec(function(err, user) {
          if (err) throw err;
          if (!user) {
            res.status(400).json({ success: false, message: 'Authentication failed. User not found.' });
          } else if (user) {
            res.status(200).send(user)
          }
        })
      }
    });
  } else {
    // Return this as status 200 simply so the console doesn't get spammed with errors
    // everytime the user navigates to a different page in the prelogin portion
    return res.status(200).send(false);
  }
};

exports.checkIfEmailIsUnique = async (req, res) => {
  if (!req.params.email) {
    res.status(400).json({ success: false, message: 'Please provide a valid email address' })
  }
  const user = await User.findOne({
    email : { $regex : new RegExp(req.params.email, 'i') }
  });
  res.status(200).send((user === null));
};

// Token verification middleware
exports.verifyBeaconOwnerId = (req, res, next) => {
  if (!req.decoded) {
    return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
  } else {
    if (req.decoded._id !== req.body.beaconOwnerId) {
      return res.status(401).json({ success: false, message: 'You are not allowed to affect the data of other users' });
    } else {
      next();
    }
  }
};

exports.verifyUserId = (req, res, next) => {
  if (!req.decoded) {
    return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
  } else {
    if (req.decoded._id === req.body.userId) {
      next();
    } else {
      return res.status(401).json({ success: false, message: 'You are not allowed to affect the data of other users' });
    }
  }
};

exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ lowercaseEmail: req.body.email.toLowerCase() });
  if (!user) {
    return req.status(404).send({ success: false, message: 'No account with that email exists' });
  }

  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000 // 1 hour from now
  await user.save();
  const resetURL = `${process.env.FRONTEND}/reset-password/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  });
  res.status(200).send(true)
};

exports.validateResetPasswordToken = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.body.resetPasswordToken,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    res.status(404).send({ success: false, message: 'Password reset is invalid or has expired' })
  }
  else {
    res.status(200).send(user.email)
  }
};

exports.validateResetPassword = (req, res, next) => {
  req.checkBody('password', 'Password cannot be blank').notEmpty();
  req.checkBody('password', 'Password must be between 8 and 50 characters').isLength({
    min: 8,
    max: 50
  });
  req.checkBody('passwordConfirmation', 'Confirmed password cannot be blank').notEmpty();
  req.checkBody('passwordConfirmation', 'Oops! Your passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    res.status(400).json({ success: false, message: errors })
    return; // Stop the function from running
  }
  next(); // There were no errors
};

exports.resetPassword = async (req, res) => {
    const user = await User.findOne({
      email: req.body.email,
      resetPasswordToken: req.body.resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      res.status(404).send({ success: false, message: 'Password reset is invalid or has expired' })
    }
    else {
      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      const updatedUser = await user.save();
      res.status(200).send(updatedUser);
    }
};
