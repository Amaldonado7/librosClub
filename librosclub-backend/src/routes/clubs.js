const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const allowRoles = require('../middlewares/allowRoles');
const {
  getClubs, createClub, joinClub, leaveClub,
  getClubDetail, setCurrentBook, addMeeting, deleteMeeting, createPost, deletePost,
} = require('../controllers/clubsController');

router.get('/',                           authMiddleware, getClubs);
router.post('/',                          authMiddleware, allowRoles('admin'), createClub);
router.post('/:id/join',                  authMiddleware, joinClub);
router.delete('/:id/leave',              authMiddleware, leaveClub);
router.get('/:id',                        authMiddleware, getClubDetail);
router.put('/:id/current-book',           authMiddleware, setCurrentBook);
router.post('/:id/meetings',              authMiddleware, addMeeting);
router.delete('/:id/meetings/:meetingId', authMiddleware, deleteMeeting);
router.post('/:id/posts',                 authMiddleware, createPost);
router.delete('/:id/posts/:postId',       authMiddleware, deletePost);

module.exports = router;
