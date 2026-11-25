const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');
const { getCover } = require('../controllers/giftController');

const router = express.Router();

router.get('/:id', asyncHandler(getCover));

module.exports = router;
