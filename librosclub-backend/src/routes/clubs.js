const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuth');
const asyncHandler = require('../middlewares/asyncHandler');
const validateIdParam = require('../middlewares/validateIdParam');
const {
  getClubs, createClub, joinClub, leaveClub,
  getClubDetail, setCurrentBook, addMeeting, deleteMeeting, createPost, deletePost,
  getNearbyClubs, setClubLocation, upgradeClub,
} = require('../controllers/clubsController');

for (const param of ['id', 'meetingId', 'postId']) {
  router.param(param, validateIdParam);
}

router.get('/',                           optionalAuth, asyncHandler(getClubs));
router.get('/nearby',                     optionalAuth, asyncHandler(getNearbyClubs));
router.post('/',                          authMiddleware, asyncHandler(createClub));
router.post('/:id/join',                  authMiddleware, asyncHandler(joinClub));
router.delete('/:id/leave',              authMiddleware, asyncHandler(leaveClub));
router.get('/:id',                        authMiddleware, asyncHandler(getClubDetail));
router.put('/:id/current-book',           authMiddleware, asyncHandler(setCurrentBook));
router.put('/:id/location',               authMiddleware, asyncHandler(setClubLocation));
router.put('/:id/upgrade',                authMiddleware, asyncHandler(upgradeClub));
router.post('/:id/meetings',              authMiddleware, asyncHandler(addMeeting));
router.delete('/:id/meetings/:meetingId', authMiddleware, asyncHandler(deleteMeeting));
router.post('/:id/posts',                 authMiddleware, asyncHandler(createPost));
router.delete('/:id/posts/:postId',       authMiddleware, asyncHandler(deletePost));

module.exports = router;
