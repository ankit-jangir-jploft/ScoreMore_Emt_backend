const { User, Subscription } = require("../models/User");
const axios = require('axios'); // Import axios for making API requests
require("dotenv").config();

console.log("process.env.STRIPE_SECRET_KEY", process.env.STIPRE_SECRET_KEY);
const stripe = require("stripe")(process.env.STIPRE_SECRET_KEY);

exports.checkout = async (req, res) => {
    try {
        const { userId, priceId } = req.body;

        // Step 1: Fetch subscription details from your admin API
        const response = await axios.get(`${process.env.LOCAL_URL}/api/admin/getAllSubscriptions`);
        const subscriptions = response.data.subscriptions;

        // Step 2: Find the subscription details based on the priceId
        const selectedSubscription = subscriptions.find(sub => sub.stripePriceId === priceId);

        if (!selectedSubscription) {
            return res.status(400).json({
                success: false,
                message: "Invalid price ID selected",
            });
        }

        const { stripePriceId, title, subscriptionTime } = selectedSubscription;

        // Map the subscription time to plan duration in days
        const planDuration = subscriptionTime === "1_month" ? 30 :
            subscriptionTime === "3_months" ? 90 :
                subscriptionTime === "12_months" ? 365 : 0;

        console.log("Stripe Price ID:", stripePriceId);
        console.log("Plan Duration (in days):", planDuration);

        // Step 3: Check if the user already has an active subscription
        const existingSubscription = await Subscription.findOne({ userId }).sort({ createdAt: -1 });
        if (existingSubscription) {
            const currentDate = new Date();
            const expiresAt = new Date(existingSubscription.expiresAt);
            const remainingDays = Math.ceil((expiresAt - currentDate) / (1000 * 60 * 60 * 24)); 

            if (remainingDays > 0 && existingSubscription.subscriptionStatus === "active") {
                return res.status(400).json({
                    success: false,
                    message: `You already have an active subscription. Days remaining: ${remainingDays}`
                });
            } else {
                // If subscription has expired, update subscription status to pending
                existingSubscription.subscriptionStatus = 'pending';
                await existingSubscription.save();
            }
        }

        // Step 4: Create the Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{
                price: stripePriceId,
                quantity: 1,
            }],
            success_url: process.env.SUCCESS_URL,
            cancel_url: process.env.FAILURE_URL,
        });

        console.log("Stripe Session:", session);

        // Step 5: Create the new subscription object only after the session is created
        const newSubscription = new Subscription({
            userId: userId,
            transactionId: session.id,
            paymentAmount: session.amount_total / 100,
            currency: session.currency,
            subscriptionStatus: 'pending', // Start as pending until confirmed
            paymentMethod: 'card',
            subscriptionPlan: priceId,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + planDuration * 24 * 60 * 60 * 1000), // Set expiration date
        });

        console.log("New Subscription:", newSubscription);

        // Step 6: Save the subscription after session creation
        await newSubscription.save();

        // Step 7: Update user with subscription ID only after the subscription is saved
        const user = await User.findById(userId);
        if (user) {
            user.subscriptionId = newSubscription._id;
            await user.save();
        }

        // Step 8: Send response with session ID and URL
        res.status(200).json({
            success: true,
            sessionId: session.id,
            sessionURL: session.url,
        });
    } catch (err) {
        console.error("Error creating checkout session:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};



exports.stripeSession = async (req, res) => {
    try {
        const { userId } = req.body; // Get userId from request body
        const user = await User.findById(userId);
        console.log("User:", user); // Find the user in the database

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Retrieve the latest subscription associated with the user
        const subscription = await Subscription.findOne({ userId }).sort({ createdAt: -1 });
        console.log("Subscription:", subscription);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "No active subscription found",
            });
        }

        // Retrieve the checkout session using the transactionId from the subscription
        const session = await stripe.checkout.sessions.retrieve(subscription.transactionId);
        console.log("Session in Subscription:", session);

        // Check if session exists
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found",
            });
        }

        // Update user if session status is complete
        if (session.status === "complete") {
            subscription.subscriptionStatus = "active";
            await subscription.save();

            user.subscriptionStatus = "active";
            user.subscriptionId = subscription._id;
            await user.save();

            console.log("Subscription and user updated to active status");
        }

        res.status(200).json({
            success: true,
            session,
        });
    } catch (err) {
        console.error("Error retrieving checkout session:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
