const express = require('express');
const reportController = require('../controllers/reportController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.get('/dashboard', reportController.getDashboard);
router.get('/departments', reportController.getDepartments);
router.get('/contracts', reportController.getContracts);
router.get('/alerts', reportController.getAlerts);

module.exports = router;
