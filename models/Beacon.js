const mongoose = require('mongoose');
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


// function autopopulate(next) {
//   this.populate('author');
//   next();
// }
//
// beaconSchema.pre('find', autopopulate);
// beaconSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Beacon', beaconSchema);
