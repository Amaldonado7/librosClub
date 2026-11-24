const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { getRecommendations } = require('../controllers/giftController');

const router = express.Router();

router.post('/recommendations', asyncHandler(getRecommendations));

module.exports = router;
