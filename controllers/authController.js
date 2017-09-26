const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');
const jwt = require('jsonwebtoken');

exports.authenticate = (req, res) => {
  // find the user
  User.findOne({
    email : { $regex : new RegExp(req.body.email, 'i') }
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
}

exports.hasToken = (req, res, next) => {
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
        req.decoded = decoded;
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({
        success: false,
        message: 'No token provided.'
    });

  }
}

// Only used after hasToken as additional middleware
exports.checkUserAgainstToken = (req, res, next) => {
  let idFields = [req.body.userId, req.body._id];
  if (!req.decoded) {
    return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
  } else {
    if (!idFields.includes(req.decoded._id)) {
      return res.status(401).json({ success: false, message: 'You are not allowed to affect the data of other users' });
    } else {
      next();
    }
  }
}

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

    // if there is no token
    // return an error
    return res.status(403).send({
        success: false,
        message: 'No token provided.'
    });

  }
}

exports.checkIfEmailIsUnique = async (req, res) => {
  if (!req.params.email) {
    res.status(400).json({ success: false, message: 'Please provide a valid email address' })
  }
  const user = await User.findOne({
    email : { $regex : new RegExp(req.params.email, 'i') }
  });
  res.status(200).send((user === null));
}

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
}

exports.verifyUserId = (req, res, next) => {
  if (!req.decoded) {
    return res.status(401).json({ success: false, message: 'Failed to authenticate token.' });
  } else {
    if (req.decoded._id !== req.body.userId) {
      return res.status(401).json({ success: false, message: 'You are not allowed to affect the data of other users' });
    } else {
      next();
    }
  }
}
//
// exports.forgot = async (req, res) => {
//   // 1. See if a user with that email exists
//   const user = await User.findOne({ email: req.body.email });
//   if (!user) {
//     req.flash('error', 'No account with that email exists.');
//     return res.redirect('/login');
//   }
//   // 2. Set reset tokens and expiry on their account
//   user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
//   user.resetPasswordExpires = Date.now() + 3600000 // 1 hour from now
//   await user.save();
//   // 3. Send them an email with the token
//   const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
//   await mail.send({
//     user,
//     subject: 'Password Reset',
//     resetURL,
//     filename: 'password-reset'
//   });
//   req.flash('success', `You have been emailed a password reset link.`);
//   // 4. Redirect to login page
//   res.redirect('/login');
// }
//
// exports.reset = async (req, res) => {
//   const user = await User.findOne({
//     resetPasswordToken: req.params.token,
//     resetPasswordExpires: { $gt: Date.now() }
//   });
//   if (!user) {
//     req.flash('error', 'Password reset is invalid or has expired');
//     return res.redirect('/login');
//   }
//   // If there is a user, show the reset password form
//   res.render('reset', { title: 'Reset Your Password' });
// }
//
// exports.confirmedPasswords = (req, res, next) => {
//   if (req.body.password === req.body['password-confirm']) {
//     next(); // Keep it going
//     return;
//   }
//   req.flash('error', 'Passwords do not match!');
//   res.redirect('back');
// }
//
// exports.update = async (req, res) => {
//   const user = await User.findOne({
//     resetPasswordToken: req.params.token,
//     resetPasswordExpires: { $gt: Date.now() }
//   });
//
//   if (!user) {
//     req.flash('error', 'Password reset is invalid or has expired');
//     return res.redirect('/login');
//   }
//
//   const setPassword = promisify(user.setPassword, user);
//   await setPassword(req.body.password);
//   user.resetPasswordToken = undefined;
//   user.resetPasswordExpires = undefined;
//   const updatedUser = await user.save();
//   await req.login(updatedUser);
//   req.flash('success', 'Nice! Your password has been reset.');
//   res.redirect('/');
// }
