const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
mongoose.Promise = global.Promise;

const beaconSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxLength: 100,
    required: 'Please supply a name for your beacon'
  },
  description: {
    type: String,
    trim: true,
    maxLength: 140,
    required: 'Please supply a description for your beacon'
  },
  color: {
    type: String,
    trim: true,
    default: '#FF0000',
    maxLength: 7,
    required: 'Please supply a color for your beacon'
  },
  created: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'Please supply an author for your beacon',
    unique: true
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'Please supply coordinates for your beacon'
    }]
    // Longitude first, then latitude
  },
  connections: [{
    userId: {
      type: Schema.Types.ObjectId,
      unique: true,
      sparse: true
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
    lat: {
      type: Number
    },
    lng: {
      type: Number
    }
  }],
  incomingConnectionRequests: [{
    userId: {
      type: Schema.Types.ObjectId,
      unique: true,
      sparse: true
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
    lat: {
      type: Number
    },
    lng: {
      type: Number
    }
  }],
  additionalSettings: {
    genderRestriction: {
      type: String,
      default: null
    },
    ageRange: {
      min: {
        type: Number,
        min: 18,
        max: 100,
        default: 18
      },
      max: {
        type: Number,
        min: 18,
        max: 100,
        default: 100
      }
    },
    password: {
      type: String,
      minLength: 8,
      maxLength: 50
    },
    tags: {
      type: [String],
      maxLength: 5
    }
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Define our indexes
beaconSchema.index({
  name: 'text',
  description: 'text'
});

beaconSchema.index({ location: '2dsphere' });

beaconSchema.pre('save', function(next) {
    var beacon = this;
    // only hash the password if it has been modified (or is new)
    if (!beacon.isModified('additionalSettings.password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(beacon.additionalSettings.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            beacon.additionalSettings.password = hash;
            next();
        });
    });
});

beaconSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.additionalSettings.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

module.exports = mongoose.model('Beacon', beaconSchema);
