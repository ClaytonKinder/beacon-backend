const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');
const bcrypt = require('bcrypt');
const { getAgeFromDateOfBirth, doesObjectExist } = require('../helpers');
const SALT_WORK_FACTOR = 10;

const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    trim: true,
    maxLength: 100,
    validate: [validator.isEmail, 'Invalid email address'],
    required: 'Please supply an email address'
  },
  lowercaseEmail: {
    type: String,
    unique: true,
    maxLength: 100,
    required: true,
    select: false
  },
  firstName: {
    type: String,
    required: 'Please supply a name',
    trim: true,
    maxLength: 50
  },
  lastName: {
    type: String,
    required: 'Please supply a name',
    trim: true,
    maxLength: 50
  },
  password: {
    type: String,
    required: true,
    minLength: 8,
    maxLength: 50
  },
  gender: {
    type: String,
    default: null,
    enum: ['male', 'female', null]
  },
  dateOfBirth: {
    type: Date,
    required: true,
    validate: function (dateOfBirth) {
      let now = new Date()
      now.setHours(0, 0, 0, 0)
      // Make sure user is at least 18
      let dob = new Date(dateOfBirth)
      var age = now.getFullYear() - dob.getFullYear()
      var m = now.getMonth() - dob.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
        age--
      }

      return (age >= 18)
    }
  },
  connectedTo: {
    userId: {
      type: Schema.Types.ObjectId
    },
    beaconId: {
      type: Schema.Types.ObjectId
    },
    beaconOwnerId: {
      type: Schema.Types.ObjectId
    },
    ownerName: {
      type: String
    },
    name: {
      type: String
    },
    gravatar: {
      type: String
    },
    created: {
      type: Date
    },
    lng: {
      type: Number
    },
    lat: {
      type: Number
    }
  },
  correctedAddresses: [{
    original: {
      address: {
        type: String,
        maxLength: 150
      },
      lat: {
        type: Number
      },
      lng: {
        type: Number
      }
    },
    corrected: {
      address: {
        type: String,
        maxLength: 150
      },
      lat: {
        type: Number
      },
      lng: {
        type: Number
      }
    }
  }],
  settings: {
    beaconLimit: {
      required: true,
      type: Number,
      default: 60,
      min: 1,
      max: 100
    },
    playBeaconSound: {
      required: true,
      type: Boolean,
      default: false
    },
    playNotificationSound: {
      required: true,
      type: Boolean,
      default: true
    },
    showBeaconAddress: {
      required: true,
      type: Boolean,
      default: false
    },
    unitOfMeasurement: {
      required: true,
      type: String,
      default: 'miles',
      enum: ['miles', 'kilometers']
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
      default: '#D50000'
    }
  },
  hasCompletedTutorialTour: {
    type: Boolean,
    default: false
  },
  outgoingConnectionRequest: {
    userId: {
      type: Schema.Types.ObjectId
    },
    beaconId: {
      type: Schema.Types.ObjectId
    },
    beaconOwnerId: {
      type: Schema.Types.ObjectId
    },
    ownerName: {
      type: String
    },
    name: {
      type: String
    },
    gravatar: {
      type: String
    },
    created: {
      type: Date
    },
    lng: {
      type: Number
    },
    lat: {
      type: Number
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

userSchema.virtual('age').get(function () {
  return getAgeFromDateOfBirth(new Date(this.dateOfBirth));
});

userSchema.virtual('fullName').get(function () {
  return this.firstName + ' ' + this.lastName;
});

function autopopulate(next) {
  this.populate('beacon');
  next();
}

userSchema.pre('find', autopopulate);
userSchema.pre('findOne', autopopulate);
userSchema.pre('save', function(next) {
    var user = this;
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
  return `https://gravatar.com/avatar/${hash}?s=200&d=mm`;
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);
