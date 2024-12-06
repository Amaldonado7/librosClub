const express = require('express');
const { getBooks, getFeed } = require('../controllers/booksController');
const router = express.Router();

router.get('/search', getBooks);
router.get('/feed', getFeed);

module.exports = router;
