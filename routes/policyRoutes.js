const express = require('express');
const router = express.Router();
const {
    getPolicies,
    getPolicyByType,
    updatePolicy,
} = require('../controller/policyController');

// Get all policies
router.get('/all', getPolicies);

// Get a specific policy by type (privacy or terms)
router.get('/:type', getPolicyByType);

// Update or create a policy
router.put('/:type', updatePolicy);

module.exports = router;