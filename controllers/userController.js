const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const { noDataFound } = require('../handlers/errorHandlers');
const { getAgeFromDateOfBirth } = require('../helpers');

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('firstName');
  req.checkBody('firstName', 'You must supply a first name!').notEmpty();
  req.checkBody('lastName', 'You must supply a last name!').notEmpty();
  req.checkBody('email', 'That email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false,
    all_lowercase: false,
    gmail_lowercase: false
  });
  req.checkBody('password', 'Password cannot be blank!').notEmpty();
  req.checkBody('passwordConfirmation', 'Confirmed password cannot be blank!').notEmpty();
  req.checkBody('passwordConfirmation', 'Oops! Your passwords do not match').equals(req.body.password);
  req.checkBody('dateOfBirth', 'Date of birth cannot be blank!').notEmpty();
  const errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors)
    return; // Stop the function from running
  }
  next(); // There were no errors
};

exports.register = async (req, res, next) => {
  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    lowercaseEmail: req.body.email.toLowerCase(),
    dateOfBirth: req.body.dateOfBirth,
    password: req.body.password
  });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next(); // Pass to authController.authenticate
};

exports.updateUserSettings = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.body.userId },
    { $set: { settings: req.body.settings } },
    { new: true, runValidators: true, context: 'query' }
  );
  if (!user) res.status(404).json({success: false, message: 'Could not update user settings at this time'});
  res.status(200).json(user);
}

exports.updateUserInformation = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $set: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        gender: req.body.gender,
        dateOfBirth: new Date(req.body.dateOfBirth),
        age: getAgeFromDateOfBirth(new Date(req.body.dateOfBirth))
      }
    },
    { new: true, runValidators: true, context: 'query' }
  );
  if (!user) {
    res.status(404).json({success: false, message: 'Could not update user information at this time'});
  } else {
    res.status(200).json(user);
  }
}

exports.updateUserEmail = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $set: {
        email: req.body.email,
        lowercaseEmail: req.body.email.toLowerCase()
      }
    },
    { new: true, runValidators: true, context: 'query' }
  );
  if (!user) {
    res.status(404).json({success: false, message: 'Could not update user email at this time'});
  } else {
    res.status(200).json(user);
  }
}

exports.validatePasswordUpdate = (req, res, next) => {
  req.sanitizeBody('firstName');
  req.checkBody('currentPassword', 'You must supply your current password').notEmpty();
  req.checkBody('newPassword', 'You must supply your desired password').notEmpty();
  req.checkBody('newPasswordConfirmation', 'You must supply your desired password confirmation').notEmpty();
  req.checkBody('newPasswordConfirmation', 'Your desired password does not match the confirmation').equals(req.body.newPassword);
  req.checkBody('userId', 'You must supply your user ID').notEmpty();
  const errors = req.validationErrors();
  if (errors) {
    res.status(400).json(errors)
    return; // Stop the function from running
  }
  next(); // There were no errors
};

exports.updateUserPassword = async (req, res) => {
  const user = await User.findOne({ _id: req.body.userId });
  if (!user) {
    res.status(404).json({success: false, message: 'Could not update user email at this time'});
  } else {
    user.comparePassword(req.body.currentPassword, function(err, isMatch) {
      if (err) {
        res.status(400).json({ success: false, message: 'Oops! Something went wrong while checking your password' });
      } else if (!isMatch) {
        res.status(400).json({ success: false, message: 'The current password you provided is incorrect' });
      } else {
        user.password = req.body.newPassword;
        user.save();
        res.status(200).json(user);
      }
    });
  }
}

exports.addCorrectedAddress = async (req, res) => {
  const user = await User.findOne({ _id: req.body.userId })
  if (!user) {
    res.status(404).json({success: false, message: 'Could not add the corrected address at this time'});
  } else {
    let correctionAlreadyExists = false
    let multipleCorrections = false
    user.correctedAddresses.forEach((correction) => {
      if (correction.original.address === req.body.addressChange.original.address) {
        correctionAlreadyExists = true
      }
      if (correction.corrected.address === req.body.addressChange.original.address) {
        multipleCorrections = true
      }
    })
    if (correctionAlreadyExists) {
      res.status(404).json({success: false, message: 'You have already made a correction for the original address'});
    }
    else if (multipleCorrections) {
      res.status(404).json({success: false, message: 'Your original address cannot be the corrected address for a different correction'});
    }
    else {
      if (user.correctedAddresses.length >= 10) {
        user.correctedAddresses.splice(-1)
      }
      user.correctedAddresses.push(req.body.addressChange);
      user.save();
      res.status(200).json(user);
    }
  }
}

exports.deleteCorrectedAddress = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $pull: {
        'correctedAddresses': {
          _id: req.body.correctedAddressId
        }
      }
    },
    {
      new: true
    }
  )
  if (!user) {
    res.status(404).json({success: false, message: 'Could not delete the corrected address at this time'});
  } else {
    res.status(200).json(user);
  }
}

exports.completeTutorialTour = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.body.userId },
    {
      $set: {
        hasCompletedTutorialTour: true
      }
    }
  )
  if (!user) {
    res.status(404).json({success: false, message: 'Could not complete tutorial tour at this time'});
  } else {
    res.status(200).json(user);
  }
}
