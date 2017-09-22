const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');
const bcrypt = require('bcrypt');
const SALT_WORK_FACTOR = 10;

const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid email address'],
    required: 'Please supply an email address'
  },
  firstName: {
    type: String,
    required: 'Please supply a name',
    trim: true
  },
  lastName: {
    type: String,
    required: 'Please supply a name',
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  age: {
    type: Number,
    default: 0
  },
  settings: {
    beaconLimit: {
      required: true,
      type: Number,
      default: 60,
      min: 1,
      max: 100
    },
    playSound: {
      required: true,
      type: Boolean,
      default: false
    },
    unitOfMeasurement: {
      required: true,
      type: String,
      default: 'miles'
    },
    searchRadius: {
      required: true,
      type: Number,
      default: 15,
      min: 1,
      max: 30
    },
    defaultColor: {
      required: true,
      type: String,
      default: '#FF0000'
    }
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  minimize: false
});

userSchema.virtual('beacon', {
  ref: 'Beacon', // What model to link?
  localField: '_id', // Which field on the user?
  foreignField: 'author', // Which field on the beacon?
  justOne: true
});

function autopopulate(next) {
  this.populate('beacon');
  next();
}

userSchema.pre('find', autopopulate);
userSchema.pre('findOne', autopopulate);
userSchema.pre('save', function(next) {
    var user = this;
    console.log('Pre save!');
    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

//Use proper function instead of arrow function here so that this can be used to refer to the schema
userSchema.virtual('gravatar').get(function() {
  const hash = md5(this.email.toLowerCase());
  return `https://gravatar.com/avatar/${hash}?s=200`;
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);
