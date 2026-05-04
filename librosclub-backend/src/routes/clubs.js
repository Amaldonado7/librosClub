const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuth');
const {
  getClubs, createClub, joinClub, leaveClub,
  getClubDetail, setCurrentBook, addMeeting, deleteMeeting, createPost, deletePost,
  getNearbyClubs, setClubLocation,
} = require('../controllers/clubsController');

router.get('/',                           optionalAuth, getClubs);
router.get('/nearby',                     optionalAuth, getNearbyClubs);
router.post('/',                          authMiddleware, createClub);
router.post('/:id/join',                  authMiddleware, joinClub);
router.delete('/:id/leave',              authMiddleware, leaveClub);
router.get('/:id',                        authMiddleware, getClubDetail);
router.put('/:id/current-book',           authMiddleware, setCurrentBook);
router.put('/:id/location',               authMiddleware, setClubLocation);
router.post('/:id/meetings',              authMiddleware, addMeeting);
router.delete('/:id/meetings/:meetingId', authMiddleware, deleteMeeting);
router.post('/:id/posts',                 authMiddleware, createPost);
router.delete('/:id/posts/:postId',       authMiddleware, deletePost);

module.exports = router;
