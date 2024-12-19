// models/subscriptionModel.js
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: Number, required: true },
    subscriptionTime: { type: String, required: true },
    stripeProductId: { type: String, required: true },
    stripePriceId: { type: String, required: true },
    isActive: { type: Boolean, default: true }, // Indicates if the subscription is active
});

module.exports = mongoose.model('SubscriptionSchema', SubscriptionSchema);

