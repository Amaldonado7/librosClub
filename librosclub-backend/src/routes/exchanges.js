const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const allowRoles = require('../middlewares/allowRoles');
const {
  getListings,
  createListing,
  deleteListing,
  getMyListings,
  requestExchange,
  respondToRequest,
  getAdminListings,
} = require('../controllers/exchangeControllers');

router.use(authMiddleware); // todas requieren auth

router.get('/admin',                  allowRoles('admin'), getAdminListings); // antes de /:id
router.get('/my',                     getMyListings);       // antes de /:id
router.put('/requests/:requestId',    respondToRequest);    // antes de /:id
router.get('/',                       getListings);
router.post('/',                      createListing);
router.delete('/:id',                 deleteListing);
router.post('/:id/request',           requestExchange);

module.exports = router;
