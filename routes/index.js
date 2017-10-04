const express = require('express');
const router = express.Router();
const beaconController = require('../controllers/beaconController');
const userController = require('../controllers/userController');
const connectionController = require('../controllers/connectionController');
// const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const { catchErrors } = require('../handlers/errorHandlers');
//

// User
// router.post('/user/getuser/:email', authController.hasToken, catchErrors(userController.getUserByEmail));
// router.post('/user/getusers', authController.hasToken, catchErrors(userController.getUsers));
router.post('/user/updateusersettings', authController.hasToken, catchErrors(userController.updateUserSettings));
router.post('/user/updateuserinformation', authController.hasToken, catchErrors(userController.updateUserInformation));
router.post('/user/updateuseremail', authController.hasToken, catchErrors(userController.updateUserEmail));
router.post('/user/updateuserpassword', authController.hasToken, userController.validatePasswordUpdate, catchErrors(userController.updateUserPassword));

// Auth
router.post('/auth/authenticate', authController.authenticate);
router.post('/auth/isauth', authController.isAuth);
router.post('/auth/checkifemailisunique/:email', catchErrors(authController.checkIfEmailIsUnique));
router.post('/auth/register',
  userController.validateRegister,
  catchErrors(userController.register),
  authController.authenticate
);

// location
router.post('/location/getbeacondistance', authController.hasToken, beaconController.getBeaconDistance)

// Beacon
router.post('/beacon/lightbeacon', authController.hasToken, catchErrors(beaconController.lightBeacon));
router.post('/beacon/extinguishbeacon',
  authController.hasToken,
  authController.verifyUserId,
  catchErrors(connectionController.severAllConnectionRequestsToBeacon),
  catchErrors(beaconController.extinguishBeacon)
);
router.post('/beacon/getnearbybeacons', authController.hasToken, catchErrors(beaconController.mapBeacons));

// Connections
router.post('/connection/createconnectionrequest',
  authController.hasToken,
  authController.verifyUserId,
  beaconController.verifyUserHasNoBeacon,
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
// router.get('/', catchErrors(storeController.getStores));
// router.get('/stores', catchErrors(storeController.getStores));
// router.get('/stores/page/:page', catchErrors(storeController.getStores));
// router.get('/add', authController.isLoggedIn, storeController.addStore);
//
// router.post('/add',
//   storeController.upload,
//   catchErrors(storeController.resize),
//   catchErrors(storeController.createStore)
// );
//
// router.post('/add/:id',
//   storeController.upload,
//   catchErrors(storeController.resize),
//   catchErrors(storeController.updateStore)
// );
//
// router.get('/stores/:id/edit', catchErrors(storeController.editStore));
// router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));
//
// router.get('/tags', catchErrors(storeController.getStoresByTag));
// router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));
//
// router.get('/login', userController.loginForm);
// router.post('/login', authController.login);
// router.post('/auth/testauth', authController.isAuthenticated, authController.isAuthenticated);
// router.post('/auth/isauth', authController.isAuthenticated);
// router.post('/login', authController.login);
// router.get('/register', userController.registerForm);
//
// // 1. Validate the registration data
// // 2. Register the user
// // 3. We need to log them in
//
// router.get('/logout', authController.logout);
//
// router.get('/account', authController.isLoggedIn, userController.account);
// router.post('/account', catchErrors(userController.updateAccount));
// router.post('/account/forgot', catchErrors(authController.forgot));
// router.get('/account/reset/:token', catchErrors(authController.reset));
// router.post('/account/reset/:token',
//   authController.confirmedPasswords,
//   catchErrors(authController.update)
// );
// router.get('/map', storeController.mapPage);
// router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));
// router.post('/reviews/:id', authController.isLoggedIn, catchErrors(reviewController.addReview));
// router.get('/top', catchErrors(storeController.getTopStores));
//
// /*
//   API
// */
//
// router.get('/api/search', catchErrors(storeController.searchStores));
// router.get('/api/stores/near', catchErrors(storeController.mapStores));
// router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));

module.exports = router;
