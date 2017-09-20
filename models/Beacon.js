const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
// const slug = require('slugs');

// const beaconSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     trim: true,
//     required: 'Please enter a name for your beacon'
//   },
//   description: {
//     type: String,
//     trim: true
//   },
//   tags: [String],
//   created: {
//     type: Date,
//     default: Date.now
//   },
//   location: {
//     type: {
//       type: String,
//       default: 'Point'
//     },
//     coordinates: [{
//       type: Number,
//       required: 'Please supply coordinates for your beacon'
//     }],
//     address: {
//       type: String,
//       required: 'You must supply an address!'
//     }
//   },
//   photo: String,
//   author: {
//     type: mongoose.Schema.ObjectId,
//     ref: 'User',
//     required: 'You must supply an author'
//   }
// }, {
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true },
// });

const beaconSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please supply a name for your beacon'
  },
  description: {
    type: String,
    trim: true,
    required: 'Please supply a description for your beacon'
  },
  color: {
    type: String,
    trim: true,
    default: '#FF0000',
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

// beaconSchema.index({ location: '2dsphere' });


// function autopopulate(next) {
//   this.populate('author');
//   next();
// }
//
// beaconSchema.pre('find', autopopulate);
// beaconSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Beacon', beaconSchema);
