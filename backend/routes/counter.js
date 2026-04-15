const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const counterController = require('../controllers/counter');

router.get('/', authenticate, counterController.getStats);

module.exports = router;
