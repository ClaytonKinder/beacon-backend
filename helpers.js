var events = require('events');
const eventEmitter = new events.EventEmitter();
exports.eventEmitter = eventEmitter

exports.checkMinMax = (n, min, max) => {
  if (n >= min && n <= max) return n;
  if (n < min) return min;
  if (n > max) return max;
}

exports.doesObjectExist = (obj) => {
  if (!obj) return false
  for (var prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      return true
    }
  }
  return false
}

exports.getAgeFromDateOfBirth = (dateOfBirth) => {
  var today = new Date();
  var age = today.getFullYear() - dateOfBirth.getFullYear();
  var m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate()))
  {
      age--;
  }
  return age;
}
