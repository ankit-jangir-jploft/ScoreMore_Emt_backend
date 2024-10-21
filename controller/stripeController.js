const { User, Subscription } = require("../models/User");

require("dotenv").config();
console.log("process.env.STRIPE_SECRET_KEY", process.env.STIPRE_SECRET_KEY)
const stripe = require("stripe")(process.env.STIPRE_SECRET_KEY);


exports.checkout = async (req, res) => {
    try {
        const { priceId, userId } = req.body;
        console.log("priceID", priceId);
        const planDuration = priceId === "price_1QBskbJpjKGzAGnrmefpvjeu" ? 30 : priceId === "price_1QCDg1JpjKGzAGnr1kND8zrv" ? 90 : priceId === "" ?  120 : 0;

        // Check if the user already has an active subscription
        const existingSubscription = await Subscription.findOne({ userId }).sort({ createdAt: -1 });
        if (existingSubscription) {
            const currentDate = new Date();
            const expiresAt = new Date(existingSubscription.expiresAt);
            const remainingDays = Math.ceil((expiresAt - currentDate) / (1000 * 60 * 60 * 24)); // Calculate remaining days
            
            if (remainingDays > 0) {
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

        // Create the Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            success_url: 'http://localhost:5173/Congratulationsplus',
            cancel_url: 'http://localhost:5173/failureurl',
        });
        console.log("session", session)
        console.log("planduration", planDuration);

        // Save the new subscription data to the database
        const newSubscription = new Subscription({
            userId: userId,
            transactionId: session.id,
            paymentAmount: session.amount_total / 100,
            currency: session.currency,
            subscriptionStatus: 'pending', // Initial status until confirmed
            paymentMethod: 'card',
            subscriptionPlan: priceId,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + planDuration * 24 * 60 * 60 * 1000), // Set expiration date based on plan duration
        });
        console.log("newSubscription", newSubscription)

        await newSubscription.save();

        const user = await User.findById(userId);
        if (user) {
            user.subscriptionId = newSubscription._id;
            await user.save();
        }

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
        console.log("user", user); // Find the user in the database

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Retrieve the latest subscription associated with the user
        const subscription = await Subscription.findOne({ userId: userId }).sort({ createdAt: -1 });
        console.log("subscription", subscription);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "No active subscription found",
            });
        }

        // Retrieve the checkout session using the transactionId from the subscription
        const session = await stripe.checkout.sessions.retrieve(subscription.transactionId); // Assuming transactionId stores the Stripe session ID
        console.log("session in subscription", session);

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
        console.log("user", user)

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

