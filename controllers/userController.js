const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const { noDataFound } = require('../handlers/errorHandlers');

exports.getUserByEmail = async (req, res) => {
  const user = await User.findOne({ email: req.params.email });
  if (!user) {
    noDataFound(res, 'users');
    return;
  }
  res.status(200).json(user);
}

exports.getUsers = async (req, res) => {
  const users = await User.find({});
  // if (!users) {
  //   noDataFound(res, 'users');
  //   return;
  // }
  res.status(200).json(users);
}

exports.updateUserSettings = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.body.userId },
    { $set: { settings: req.body.settings } },
    { new: true, runValidators: true, context: 'query' }
  );
  res.status(200).json(user);
}

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('firstName');
  req.checkBody('firstName', 'You must supply a first name!').notEmpty();
  req.checkBody('lastName', 'You must supply a last name!').notEmpty();
  req.checkBody('email', 'That email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password cannot be blank!').notEmpty();
  req.checkBody('passwordConfirmation', 'Confirmed password cannot be blank!').notEmpty();
  req.checkBody('passwordConfirmation', 'Oops! Your passwords do not match').equals(req.body.password);

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
    password: req.body.password
  });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next(); // Pass to authController.login
};
//
// exports.account = (req, res) => {
//   res.render('account', { title: 'Edit Your Account' });
// }
//
// exports.updateAccount = async (req, res) => {
//   const updates = {
//     name: req.body.name,
//     email: req.body.email
//   };
//
//   const user = await User.findOneAndUpdate(
//     { _id: req.user._id },
//     { $set: updates },
//     { new: true, runValidators: true, context: 'query' }
//   );
//   req.flash('success', 'Updated the profile!');
//   res.redirect('back');
// }
