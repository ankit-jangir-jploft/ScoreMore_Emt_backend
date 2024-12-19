const { User, Subscription, updateSearchIndex } = require("../models/User");
const axios = require('axios'); // Import axios for making API requests
require("dotenv").config();

const SubscriptionSchema = require("../models/StripeModels")
console.log("process.env.STRIPE_SECRET_KEY", process.env.STIPRE_SECRET_KEY);
const stripe = require("stripe")(process.env.STIPRE_SECRET_KEY);
const jwt = require("jsonwebtoken");
const { Buffer } = require("safe-buffer");
const sgMail = require('@sendgrid/mail');

const cron = require('node-cron');


const checkAndUpdateSubscriptions = async () => {
    try {
        console.log("it hitss cron ")
        const currentDate = new Date();

        // Find subscriptions that are expired and still active
        const expiredSubscriptions = await Subscription.find({
            subscriptionStatus: 'active',
            expiresAt: { $lt: currentDate },
        });

        if (expiredSubscriptions.length > 0) {
            for (const subscription of expiredSubscriptions) {
                subscription.subscriptionStatus = 'expired';
                await subscription.save();
                console.log(`Updated subscription ${subscription._id} to pending`);
            }
        } else {
            console.log('No expired subscriptions to update');
        }
    } catch (error) {
        console.error('Error checking and updating subscriptions:', error);
    }
};

// Schedule the function to run every minute
cron.schedule('0 * * * *', async () => {
    console.log('Running subscription check...');
    await checkAndUpdateSubscriptions();
});

exports.checkout = async (req, res) => {
    try {
        const { userId, priceId } = req.body;

        // Step 1: Fetch subscription details from your admin API
        const response = await axios.get(`${process.env.LOCAL_URL}/api/admin/getAllSubscriptions`);
        const subscriptions = response.data.subscriptions;
        // console.log("subscriptions", subscriptions)

        // Step 2: Find the subscription details based on the priceId
        const selectedSubscription = subscriptions.find(sub => sub.stripePriceId === priceId);
        // console.log("selectedSubscription", selectedSubscription)

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

        // console.log("Stripe Price ID:", stripePriceId);
        // console.log("Plan Duration (in days):", planDuration);

        // Step 3: Check if the user already has an active subscription
        const existingSubscription = await Subscription.findOne({ userId }).sort({ createdAt: -1 });
        if (existingSubscription) {
            const currentDate = new Date();
            const expiresAt = new Date(existingSubscription.expiresAt);
            const remainingDays = Math.ceil((expiresAt - currentDate) / (1000 * 60 * 60 * 24));

            if (expiresAt > currentDate && remainingDays > 0 && existingSubscription.subscriptionStatus === "active") {
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

        // console.log("Stripe Session:", session);

        // Step 5: Create the new subscription object only after the session is created
        const newSubscription = new Subscription({
            userId: userId,
            transactionId: session.id,
            paymentAmount: session.amount_total / 100,
            currency: session.currency,
            productId : selectedSubscription.stripeProductId,
            subscriptionStatus: 'pending', // Start as pending until confirmed
            paymentMethod: 'card',
            subscriptionPlan: selectedSubscription.title,
            priceId: priceId,
            orderId: await randomOrderId(),
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + planDuration * 24 * 60 * 60 * 1000), // Set expiration date
        });

        // console.log("New Subscription:", newSubscription);

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
        // console.log("User:", user); // Find the user in the database

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


        const orderDate = new Date(subscription.createdAt).toLocaleString('en-US', {
            timeZone: 'CST',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // Update user if session status is complete
        if (session.status === "complete") {
            subscription.subscriptionStatus = "active";
            await subscription.save();

            user.subscriptionStatus = "active";
            user.subscriptionId = subscription._id;

            await user.save();


            const mailOptions = {
                from: process.env.MAIL_ID,
                to: user.email,
                subject: `Your ScoreMore purchase (#${subscription.orderId}) was successful`,
                html: `
                  <div style="font-family: Arial, sans-serif; width: 100%; max-width: 1000px; margin: 0 auto; border: 2px solid #08273f; border-radius: 10px; overflow: hidden;">
              
                    <!-- Header -->
                    <div style="background-color: #08273f; color: #ffffff; text-align: center; padding: 20px;">
                      <h1 style="margin: 0; font-size: 24px;">Thank you for your order!</h1>
                    </div>
              
                    <!-- Body Content -->
                    <div style="padding: 20px; line-height: 1.6;">
                      <p>Hi ${user.firstName || "Customer"},</p>
                      <p>We know you are excited about your test prep, and we can assure you that you made the right choice.</p>
                      <p>Here's your confirmation for order number <strong>#${subscription.orderId}</strong>. Review your receipt and get started with your prep.</p>
              
                      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr style="background-color: #f4f4f4;">
                          <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Order Placed On</th>
                          <td style="padding: 10px; border: 1px solid #ddd;">${orderDate}</td>
                        </tr>
                        <tr>
                          <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Order Number</th>
                          <td style="padding: 10px; border: 1px solid #ddd;">${subscription.orderId}</td>
                        </tr>
                      </table>
              
                      <h3 style="margin-top: 30px;">Subscription Details</h3>
                      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                          <tr style="background-color: #f4f4f4;">
                            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Subscription</th>
                            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Duration</th>
                            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">${subscription.subscriptionPlan}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${subscription.startedAt.toDateString()} - ${subscription.expiresAt.toDateString()}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">$${subscription.paymentAmount} USD</td>
                          </tr>
                        </tbody>
                      </table>
              
                      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr style="background-color: #f4f4f4;">
                          <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Total (USD)</th>
                          <td style="padding: 10px; border: 1px solid #ddd;">$${subscription.paymentAmount} USD</td>
                        </tr>
                      </table>
              
                      <p style="margin-top: 30px;">What are you waiting for? Start your preparation now!</p>
                      <a href="${process.env.VERIFY_REDIRECT_URL}/Dashboard" 
                         style="background-color: #4CAF50; color: white; padding: 15px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; font-size: 16px; margin: 10px 0;">
                         Let's Start
                      </a>
              
                      <p style="margin-top: 20px;">You can now practice on the ScoreMore! </p>
                      <p style="margin-top: 10px;"> Download our apps from Apple and Google Play Store to practice for your exam.</p>
                    </div>
              
                    <!-- Footer -->
                    <div style="background-color: #08273f; color: #ffffff; text-align: center; padding: 15px; line-height: 1.8;">
                      <p style="margin: 0;">© 2024 ScoreMore LLC. All Rights Reserved.</p>
                      <p style="margin: 0;">e-mail: <a href="mailto:scoremoreapp@gmail.com" style="color: #ffffff; text-decoration: none;">scoremoreapp@gmail.com</a> | Web: <a href="https://scoremoreprep.com" target="_blank" style="color: #ffffff; text-decoration: none;">https://scoremoreprep.com</a></p>
                    </div>
              
                  </div>
              
                  <!-- Mobile Styles -->
                  <style>
                    @media only screen and (max-width: 600px) {
                      .container {
                        width: 100% !important;
                        padding: 10px !important;
                      }
              
                      h1 {
                        font-size: 22px !important;
                      }
              
                      h3 {
                        font-size: 20px !important;
                      }
              
                      table {
                        width: 100% !important;
                        font-size: 14px !important;
                      }
              
                      th, td {
                        padding: 8px !important;
                      }
              
                      .cta-button {
                        width: 100% !important;
                        font-size: 16px !important;
                        padding: 15px !important;
                      }
              
                      p {
                        font-size: 14px !important;
                      }
                    }
                  </style>
                `
            };



            const emailSent = await sendEmail(mailOptions);
            if (!emailSent) {
                return res.status(500).json({
                    message: "Failed to send verification email.",
                    success: false,
                });
            }

            // console.log("Subscription and user updated to active status");
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

const randomOrderId = async function () {
    // Generate a random number between 0 and 99999
    const randomNumber = Math.floor(Math.random() * 100000);

    // Ensure it has 5 digits, padding with zeros if necessary
    const formattedNumber = String(randomNumber).padStart(5, '0');

    // Prefix with 'sm'
    return `ORDER-${formattedNumber}`;
};

async function sendEmail(mailOptions) {
    try {
        // Set SendGrid API key
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);


        const msg = {
            to: mailOptions.to,       // Recipient email address
            from: process.env.MAIL_ID, // Verified sender email address in SendGrid
            subject: mailOptions.subject, // Subject of the email
            text: mailOptions.text,    // Plain text content (optional)
            html: mailOptions.html,    // HTML content (optional)
        };

        // Send the email using SendGrid
        const response = await sgMail.send(msg);
        // console.log("Email sent successfully:", response);
        return true;
    } catch (error) {
        console.error("Error sending email:", error.response?.body || error.message);
        return false;
    }
}


exports.saveSubscription = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "No token provided!",
            success: false,
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        const { subscriptionId, transactionId, paymentStatus, platform } = req.body;

        if (!subscriptionId || !transactionId || !paymentStatus || !platform) {
            return res.status(400).json({
                success: false,
                message: "All fields are required, including subscription time.",
            });
        }

        const subscriptionSchema = await SubscriptionSchema.findOne({ stripeProductId: subscriptionId });
        const SubscriptionTime = subscriptionSchema.subscriptionTime;
        const subscriptionAmount = subscriptionSchema.price;

        // Validate and map subscription time to duration in days
        const planDuration = SubscriptionTime === "1_month" ? 30 :
            SubscriptionTime === "3_months" ? 90 :
                SubscriptionTime === "12_months" ? 365 : 0;

        if (planDuration === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid subscription time provided.",
            });
        }

        // Check and update expired subscriptions
        const existingSubscriptions = await Subscription.find({ userId });
        const currentDate = new Date();

        for (const existingSubscription of existingSubscriptions) {
            if (
                new Date(existingSubscription.expiresAt) <= currentDate &&
                existingSubscription?.paymentStatus === "success" &&
                existingSubscription.subscriptionStatus !== "expired"
            ) {
                existingSubscription.subscriptionStatus = "expired";
                await existingSubscription.save();
            }
        }

        // Removed the "active subscription" check
        // Now users can purchase a plan even if they have an active subscription

        // Calculate startedAt and expiresAt
        const startedAt = currentDate;
        const expiresAt = new Date(currentDate.getTime() + planDuration * 24 * 60 * 60 * 1000);

        // Create a new subscription document
        const subscription = new Subscription({
            subscriptionId,
            transactionId,
            paymentStatus,
            platform,
            userId,
            productId : subscriptionId,
            paymentAmount: subscriptionAmount,
            subscriptionStatus: paymentStatus === "success" ? "active" : "pending",
            startedAt,
            expiresAt,
        });

        await subscription.save();

        res.status(201).json({
            success: true,
            message: "Subscription saved successfully.",
            data: subscription,
        });
    } catch (error) {
        console.error("Error saving subscription:", error);
        res.status(500).json({
            success: false,
            message: "Error saving subscription.",
            error: error.message,
        });
    }
};


exports.cancelIOSSubscription = async (req, res) => {
    try {
        const { signedPayload } = req.body;

        // Parse signed payload
        const tokenParts = signedPayload.split(".");
        const payload = Buffer.from(tokenParts[1], "base64").toString("utf-8");
        const decodedPayload = JSON.parse(payload);
        console.log("decodedPayload", decodedPayload)
        let useFullData = {};

        // Extract signedTransactionInfo
        if (decodedPayload?.data?.signedTransactionInfo) {
            const signedTransactionInfo = decodedPayload.data.signedTransactionInfo;
            const tokenParts1 = signedTransactionInfo.split(".");
            const responseData = Buffer.from(tokenParts1[1], "base64").toString("utf-8");
            console.log("responseData",responseData)
            const responseJson = JSON.parse(responseData);

            useFullData = {
                notificationType: decodedPayload?.notificationType,
                subtype : decodedPayload?.subtype,
                transactionId: responseJson?.transactionId,
                matchToken: responseJson?.originalTransactionId,
                productId: responseJson?.productId,
                purchaseDate: new Date(responseJson?.purchaseDate),
                expiresDate: responseJson?.expiresDate,
                transactionReason: responseJson?.transactionReason,
            };

            console.log("useFullData", useFullData);
        }

        // Call handleNotification
        await handleNotification(useFullData);

        return res.status(200).json({
            success: true,
            result: [],
            message: "Notification processed successfully",
        });
    } catch (error) {
        console.error("Error in cancelIOSSubscription:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};


const handleNotification = async (notification) => {
    const { notificationType } = notification;

    switch (notificationType) {
        case "CANCEL":
            await handleCancel(notification);
            break;
        case "DID_CHANGE_RENEWAL_STATUS":
        case "DID_RENEW":
            await handleRenew(notification);
            break;
        default:
            console.log("Unknown notification type:", notificationType);
    }
};

const handleRenew = async (notification) => {
    try {
        // Find the subscription based on the matchToken
        const subscription = await Subscription.findOne({
            transactionId: notification.transactionId,
        }).populate({ path: 'userId', select: "_id firstName lastName email" });

        if (!subscription) {
            console.log("No subscription found for the given transaction ID.");
            return;
        }
        console.log("notification",notification)

        // Step 1: Handle Auto-Renewal Disabled
        if (notification.notificationType === "DID_CHANGE_RENEWAL_STATUS") {
            if (notification.subtype === "AUTO_RENEW_DISABLED") {
                // Auto-renewal is disabled, just disable the auto-renewal flag
                console.log("subscriptionbefore", subscription)
                subscription.autoRenewal = false; // Set auto-renewal to false
                console.log("subscriptionafter", subscription)
                await subscription.save();

                console.log("Auto-renewal has been disabled.");

                // No need to mark subscription as "pending" or "expired"
                // Subscription remains in its current status (e.g., "active" until it actually expires)
                return;
            }
        }

        // Step 2: Handle other renewal or expiration scenarios
        if (notification.notificationType === "RENEWAL") {
            const newExpireDate = new Date(notification.expiresDate);
            console.log("New expiration date:", newExpireDate);

            // Update subscription expiry date
            subscription.expiresAt = newExpireDate;
            subscription.subscriptionStatus = "active"; // Mark as active when renewed
            await subscription.save();

            // Update user’s plan status
            const updatedUser = await User.findByIdAndUpdate(
                subscription.userId._id,
                {
                    subscriptionStatus: "active", // Ensure subscription is active
                    plan_date: newExpireDate,
                    updatedAt: new Date(),
                },
                { new: true }
            );

            console.log("User subscription renewed:", updatedUser);

            // Send renewal notification
            const message = {
                receiver_id: subscription.userId._id,
                title: "Subscription Renewed",
                message: "Your subscription has been successfully renewed.",
            };
            await sendNotification(message, subscription.userId.device_token);

            console.log("Subscription renewed successfully.");
        }

        // Handle expired subscription logic here if needed
        if (notification.notificationType === "EXPIRED") {
            console.log("Subscription has expired. Please inform the user to renew.");
            // Update the subscription status to "expired" if applicable
            subscription.subscriptionStatus = "expired";
            await subscription.save();
        }

    } catch (error) {
        console.error("Error handling subscription renewal:", error.message);
    }
};



const handleCancel = async (notification) => {
    try {
        const subscription = await Subscription.findOne({
            transactionId: notification.transactionId,
        }).populate({ path: 'userId', select: "_id firstName lastName email" });

        if (!subscription) {
            console.log("No active subscription found to cancel.");
            return;
        }

        // Update subscription status
        subscription.subscriptionStatus = "canceled";
        subscription.expiresAt = new Date();
        await subscription.save();

        // Update user plan status
        const updatedUser = await User.findByIdAndUpdate(
            subscription.userId._id,
            {
                subscriptionStatus: "canceled", // Reflect active subscription
                updatedAt: new Date()         // Update the timestamp
            },
            { new: true } // Return the updated document
        );
        console.log("userUpdate", updatedUser)

        // Send notification
        const message = {
            receiver_id: subscription.userId._id,
            title: "Subscription Canceled",
            message: "Your subscription has been canceled successfully.",
        };
        // await sendNotification(message, subscription.userId.device_token);

        console.log("Subscription canceled successfully.");
    } catch (error) {
        console.error("Error canceling subscription:", error.message);
    }
};



exports.cancelGoogleSubscription = async (req, res) => {
    const notification = req.body;  // Google Play RTDN notification

    if (notification.notificationType === 'CANCEL') {
        const subscriptionId = notification.subscriptionId;  // Subscription ID
        const userId = notification.userId;  // User ID

        try {
            // Find the subscription and update status to "canceled"
            const subscription = await Subscription.findOne({ subscriptionId, userId });

            if (!subscription) {
                return res.status(404).json({
                    message: "Subscription not found.",
                });
            }

            // Update the subscription status to canceled
            subscription.subscriptionStatus = "canceled";
            await subscription.save();

            return res.status(200).json({
                message: "Subscription canceled successfully.",
                data: subscription,
            });
        } catch (error) {
            console.error("Error processing Google Play cancel notification:", error);
            return res.status(500).json({
                message: "Error processing subscription cancellation.",
                error: error.message,
            });
        }
    } else {
        return res.status(400).json({
            message: "Invalid notification type.",
        });
    }
}
