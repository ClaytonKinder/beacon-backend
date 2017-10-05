const express = require('express');
const router = express.Router();
const beaconController = require('../controllers/beaconController');
const userController = require('../controllers/userController');
const connectionController = require('../controllers/connectionController');
const authController = require('../controllers/authController');
const { catchErrors } = require('../handlers/errorHandlers');

// User
router.post('/user/updateusersettings',
  authController.hasToken,
  catchErrors(userController.updateUserSettings)
);
router.post('/user/updateuserinformation',
  authController.hasToken,
  catchErrors(userController.updateUserInformation)
);
router.post('/user/updateuseremail',
  authController.hasToken,
  catchErrors(userController.updateUserEmail)
);
router.post('/user/updateuserpassword',
  authController.hasToken,
  userController.validatePasswordUpdate,
  catchErrors(userController.updateUserPassword)
);

// Auth
router.post('/auth/authenticate',
  authController.authenticate
);
router.post('/auth/isauth',
  authController.isAuth
);
router.post('/auth/checkifemailisunique/:email',
  catchErrors(authController.checkIfEmailIsUnique)
);
router.post('/auth/register',
  userController.validateRegister,
  catchErrors(userController.register),
  authController.authenticate
);

// location
router.post('/location/getbeacondistance',
  authController.hasToken,
  beaconController.getBeaconDistance
);

// Beacon
router.post('/beacon/lightbeacon',
  authController.hasToken,
  authController.verifyUserId,
  catchErrors(beaconController.lightBeacon)
);
router.post('/beacon/extinguishbeacon',
  authController.hasToken,
  authController.verifyUserId,
  catchErrors(connectionController.severAllConnectionsToBeacon),
  catchErrors(beaconController.extinguishBeacon)
);
router.post('/beacon/getnearbybeacons',
  authController.hasToken,
  catchErrors(beaconController.mapBeacons)
);

// Connections
router.post('/connection/createconnectionrequest',
  authController.hasToken,
  authController.verifyUserId,
  beaconController.verifyUserHasNoBeacon,
  connectionController.checkIfConnectionRequestAlreadyExists,
  beaconController.checkBeaconDistance,
  catchErrors(connectionController.createConnectionRequest)
);
router.post('/connection/cancelconnectionrequest',
  authController.hasToken,
  authController.verifyUserId,
  catchErrors(connectionController.cancelConnectionRequest)
);
router.post('/connection/denyconnectionrequest',
  authController.hasToken,
  authController.verifyBeaconOwnerId,
  catchErrors(connectionController.denyConnectionRequest)
);
router.post('/connection/approveconnectionrequest',
  authController.hasToken,
  authController.verifyBeaconOwnerId,
  catchErrors(connectionController.approveConnectionRequest)
);
router.post('/connection/removeconnection',
  authController.hasToken,
  authController.verifyBeaconOwnerId,
  catchErrors(connectionController.removeConnection)
);
router.post('/connection/disconnectfrombeacon',
  authController.hasToken,
  authController.verifyUserId,
  catchErrors(connectionController.disconnectFromBeacon)
);

module.exports = router;
