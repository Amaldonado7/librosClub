const express = require('express');
const { getGoogleFeed, searchGoogleBooks } = require('../controllers/googleBooksControllers');

const router = express.Router();

// GET /api/google-books/feed?topic=fantasy&limit=10&lang=es
router.get('/feed', getGoogleFeed);

// GET /api/google-books/search?q=intitle:stormlight&page=0&pageSize=20&lang=es
router.get('/search', searchGoogleBooks);

module.exports = router;
