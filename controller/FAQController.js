// controllers/FAQController.js
const FAQ = require('../models/FAQ');

// Get all FAQs
exports.getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find();
    res.json({ success: true, data: faqs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single FAQ by ID
exports.getFAQById = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }
    res.json({ success: true, data: faq });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add a new FAQ
exports.addFAQ = async (req, res) => {
  const { question, answer } = req.body;

  try {
    const newFAQ = new FAQ({ question, answer });
    await newFAQ.save();
    res.status(201).json({ success: true, data: newFAQ });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Edit an existing FAQ
exports.editFAQ = async (req, res) => {
  const { question, answer } = req.body;
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }
    faq.question = question || faq.question;
    faq.answer = answer || faq.answer;
    await faq.save();
    res.json({ success: true, data: faq });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete an FAQ
exports.deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }
    await faq.remove();
    res.json({ success: true, message: 'FAQ deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
