// routes/faqRoutes.js
const express = require('express');
const router = express.Router();
const FAQController = require('../controller/FAQController');

// Get all FAQs
router.get('/', FAQController.getAllFAQs);

// Get a single FAQ by ID
router.get('/:id', FAQController.getFAQById);

// Add a new FAQ
router.post('/', FAQController.addFAQ);

// Edit an existing FAQ
router.put('/:id', FAQController.editFAQ);

// Delete an FAQ
router.delete('/:id', FAQController.deleteFAQ);

module.exports = router;
