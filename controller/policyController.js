// controllers/policyController.js
const Policy = require("../models/privacyandTerm");

// Get all policies
exports.getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find();
    res.status(200).json({ success: true, data: policies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get policy by type (privacy or terms)
exports.getPolicyByType = async (req, res) => {
  const { type } = req.params;
  try {
    const policy = await Policy.findOne({ type });
    if (!policy) {
      return res.status(404).json({ success: false, message: `${type} policy not found` });
    }
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update or create policy content
exports.updatePolicy = async (req, res) => {
  const { type } = req.params;
  const { content } = req.body;

  try {
    let policy = await Policy.findOne({ type });

    if (policy) {
      // Update existing policy
      policy.content = content;
      await policy.save();
    } else {
      // Create new policy
      policy = new Policy({ type, content });
      await policy.save();
    }

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
