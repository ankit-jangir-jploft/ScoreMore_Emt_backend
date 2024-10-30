const Flashcard = require("../models/Flashcard");
const { User, Subscription } = require("../models/User");
const Question = require("../models/question");
const TestResult = require('../models/TestResult');
const SubscriptionSchema = require("../models/StripeModels");
require('dotenv').config();
const stripe = require('stripe')(process.env.STIPRE_SECRET_KEY);

const path = require('path');
const { default: mongoose } = require("mongoose");

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');



function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}



 // Adjust path as needed

 exports.signInWithPassword = async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("req, body", req.body);
  
      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required!",
          success: false,
        });
      }
  
      // Find the user by email
      let user = await User.findOne({ email });
      console.log("user", user);
      if (!user) {
        return res.status(400).json({
          message: "Incorrect email or password!",
          success: false,
        });
      }
  
      // Check if the user is an admin
      if (user.role !== "admin") {
        return res.status(403).json({
          message: "Access denied. Admin privileges required.",
          success: false,
        });
      }
  
      // Check if password matches
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        return res.status(400).json({
          message: "Incorrect email or password!",
          success: false,
        });
      }
  
      // Check if user is active and email is verified
      if (!user.isActive || !user.isEmailVerified) {
        return res.status(403).json({
          message: "Account is inactive or email not verified.",
          success: false,
        });
      }
  
      // Generate JWT token for the admin (without expiration)
      const tokenData = { userId: user._id, role: user.role };
      const token = jwt.sign(tokenData, process.env.SECRET_KEY);
  
      const userResponse = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        mobileNumber: user.mobileNumber,
      };
  
      // Send token in response body
      return res.status(200).json({
        message: `Welcome back Admin ${userResponse.firstName}`,
        user: userResponse,
        token,
        success: true,
      });
    } catch (err) {
      console.log("Error in admin login", err);
      return res.status(500).json({
        message: "Internal server error",
        success: false,
      });
    }
  };
  
  exports.getDashboardData = async (req, res) => {
    try {
        const { filters } = req.body;

        let startsDate, endsDate;

        // Determine the date range for filtering
        if (filters?.dateRange?.startsDate && filters?.dateRange?.endsdate) {
            startsDate = new Date(filters.dateRange.startsDate);
            endsDate = new Date(filters.dateRange.endsdate);
            endsDate.setHours(23, 59, 59, 999); 
        } else {
            startsDate = new Date("1970-01-01");
            endsDate = new Date();
            endsDate.setHours(23, 59, 59, 999); 
        }
        
        // Format dates to yyyy-mm-dd (if needed for logging)
        const startDate = formatDate(startsDate);
        const endDate = formatDate(endsDate);
        
        console.log("Start Date:", startDate);
        console.log("End Date:", endDate);

        // Default filters if not provided
        const subscriptionStatus = filters?.subscriptionStatus || 'active';
        const isActive = filters?.userStatus?.isActive ?? true;

        // Count total users based on date range
        const totalUsers = await User.countDocuments({
            createdAt: { $gte: startsDate, $lte: endsDate }
        });

        // Count subscribed users based on subscription status and date range
        const totalSubscribedUsers = await User.countDocuments({
            subscriptionStatus: subscriptionStatus,
            createdAt: { $gte: startsDate, $lte: endsDate }
        });

        // Count active users based on isActive status and date range
        const totalActiveUsers = await User.countDocuments({
            isActive: isActive,
            createdAt: { $gte: startsDate, $lte: endsDate }
        });

        const totalQuestions = await Question.countDocuments({
                createdAt: { $gte: startsDate, $lte: endsDate }
        });
        const totalFlashcards = await Flashcard.countDocuments({
            createdAt: { $gte: startsDate, $lte: endsDate }
        });
        const totalTestsCount = await TestResult.countDocuments();
        console.log("Total Tests Count:", totalTestsCount);

        const distinctTestTypes = await TestResult.distinct("testType");
        console.log("Distinct Test Types:", distinctTestTypes);

        const testResults = await TestResult.find({
            ...(filters?.testType && { testType: filters.testType }),
            date: { $gte: startDate, $lte: endDate }
        }).lean();

        const testStatsMap = testResults.reduce((acc, curr) => {
            const testType = curr.testType;
            if (!acc[testType]) {
                acc[testType] = 0;
            }
            acc[testType] += 1;
            return acc;
        }, {});

        console.log("Test Stats Map:", testStatsMap);

        const resultTestStats = distinctTestTypes.map(testType => ({
            _id: testType,
            totalSubmittedTests: testStatsMap[testType] || 0
        }));

        console.log("Result Test Stats:", resultTestStats);

        const totalRevenue = await Subscription.aggregate([
            {
                $match: {
                    startedAt: { $gte: startsDate, $lte: endsDate }
                }
            },
            {
                $lookup: {
                    from: 'users', // The collection where users are stored
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $match: {
                    'user.0': { $exists: true } // Ensure the user exists in the 'users' collection
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$paymentAmount' }
                }
            }
        ]);

        res.status(200).json({
            status: true,
            data: {
                totalUsers,
                totalSubscribedUsers,
                totalActiveUsers,
                totalQuestions,
                totalFlashcards,
                totalSubmittedTestsByType: resultTestStats,
                totalRevenue: totalRevenue.length ? totalRevenue[0].totalRevenue : 0,
            }
        });
    } catch (err) {
        console.error("Error in dashboard API", err);
        res.status(500).json({
            status: false,
            message: "Internal server error!"
        });
    }
};


// Updated getAllUsers function
exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, startsDate, endsDate, isActive, isBlocked, subscriptionStatus } = req.query;
        const skip = (page - 1) * limit;

        // Build the query object for filtering
        const query = { role: "user" };

        // Date range filter
        if (startsDate && endsDate) {
            query.createdAt = {
                $gte: new Date(startsDate),
                $lte: new Date(endsDate)
            };
        }

        // Additional filters
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        if (isBlocked !== undefined) {
            query.isBlocked = isBlocked === 'true';
        }
        if (subscriptionStatus) {
            query.subscriptionStatus = subscriptionStatus;
        }

        // Fetch users with pagination, filtering, and sorting
        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Count total users for pagination metadata
        const totalUsers = await User.countDocuments(query);

        res.status(200).json({
            status: true,
            data: {
                users,
                totalRecords: totalUsers,
                page: Number(page),
                totalPages: Math.ceil(totalUsers / limit)
            }
        });
    } catch (err) {
        console.error("Error in getAllUsers API", err);
        res.status(500).json({
            status: false,
            message: "Internal server error!"
        });
    }
};

exports.deactivateUser = async (req, res) => {
    try {
        const { id } = req.params;  // Get user ID from the request (assumes user authentication middleware)
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false,
            });
        }

        // Deactivate the user
        user.isBlocked = true;
        user.isActive = false;
        await user.save();
        console.log("user after block", user)

        return res.status(200).json({
            message: 'User account deactivated successfully',
            success: true,
        });
    } catch (err) {
        console.error('Error deactivating user:', err);
        return res.status(500).json({
            message: 'Internal server error',
            success: false,
        });
    }
};

exports.unblockUser = async (req, res) => {
    try {
        const { id } = req.params;  // Get user ID from the request (assumes user authentication middleware)
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false,
            });
        }

        // Reactivate the user
        user.isBlocked = false; 
        user.isActive = true;
        await user.save();
        console.log("user after unblock", user)

        return res.status(200).json({
            message: 'User account reactivated successfully',
            success: true,
        });
    } catch (err) {
        console.error('Error unblocking user:', err);
        return res.status(500).json({
            message: 'Internal server error',
            success: false,
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // The ID of the user to be deleted
        // const { role } = req.user; // Assuming `req.user` contains the logged-in admin info

        // Ensure the request is made by an admin
        // if (role !== 'admin') {
        //     return res.status(403).json({
        //         message: 'Only admins can delete users',
        //         success: false,
        //     });
        // }

        // Check if the user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
                success: false,
            });
        }

        // Delete the user
        await User.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'User deleted successfully',
            success: true,
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({
            message: 'Internal server error',
            success: false,
        });
    }
};

exports.editProfile = async (req, res) => {
    try {
      const { id } = req.params; 
      const { firstName, lastName, email, mobileNumber } = req.body; 
  
      let profilePicture;
  
      if (req.file) {
        // Extract just the filename (not the full path)
        profilePicture = path.basename(req.file.path);
      }
  
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found", success: false });
      }
  
      // Check if the email is being changed and verify its uniqueness
      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
          return res.status(400).json({ message: "Email already in use by another account", success: false });
        }
      }
  
      // Update user details
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.email = email || user.email;
      user.mobileNumber = mobileNumber || user.mobileNumber; 
      user.profilePicture = profilePicture || user.profilePicture; // Update profile picture if new one is uploaded
  
      await user.save();
  
      return res.status(200).json({
        message: "Profile updated successfully",
        success: true,
        data: user,
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      return res.status(500).json({ message: "Internal server error", success: false });
    }
};

exports.userExcel = async (req, res) => {
    try {
        // Fetch user data from the database
        const users = await User.find({}); // You can add your query here if needed

        // Transform user data into a suitable format for Excel
        const userInfoArray = users.map(user => ({
            'User ID': user._id,
            'Full Name': `${user.firstName} ${user.lastName}`,
            'Email ID': user.email,
            'Date Registered': moment(user.createdAt).format('MM/DD/YYYY'),
            'Subscription Status': user.subscriptionStatus || 'N/A',
        }));

        // Create a new workbook and worksheet
        const worksheet = XLSX.utils.json_to_sheet(userInfoArray);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'UserData');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // Set the response headers to download the file
        res.setHeader('Content-Disposition', 'attachment; filename=UserData.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting users:', error);
        res.status(500).send('Internal Server Error');
    }
}

// stripe apis 

// Create a new subscription with Stripe integration
exports.createSubscription = async (req, res) => {
    try {
        console.log("req.body", req.body);
        const { title, price, subscriptionTime } = req.body; // Use subscriptionType here

        // Validate subscriptionType input
        const intervalMap = {
            '1_month': { interval: 'month', interval_count: 1 },
            '3_months': { interval: 'month', interval_count: 3 },
            '12_months': { interval: 'year', interval_count: 1 },
        };

        const selectedInterval = intervalMap[subscriptionTime]; // Check against subscriptionType
        if (!selectedInterval) {
            return res.status(400).json({ message: 'Invalid subscription time provided' });
        }

        // Step 1: Create a new product on Stripe
        const stripeProduct = await stripe.products.create({
            name: title, // Ensure you are using the correct field
        });

        // Step 2: Create a new price on Stripe linked to the product with the selected interval
        const stripePrice = await stripe.prices.create({
            unit_amount: price * 100,  // Stripe accepts prices in cents
            currency: 'usd',
            recurring: {
                interval: selectedInterval.interval,
                interval_count: selectedInterval.interval_count,
            },
            product: stripeProduct.id,
        });

        // Log the created price
        console.log('Stripe Price Created:', stripePrice);

        // Step 3: Save the subscription with Stripe IDs to the database
        const subscription = new SubscriptionSchema({
            title, // Save the title instead of name if that's what you intend
            price,
            subscriptionTime, // Save subscriptionType
            stripeProductId: stripeProduct.id,
            stripePriceId: stripePrice.id,
        });

        await subscription.save();
        res.status(201).json({success : true, message: 'Subscription created successfully', subscription });
    } catch (error) {
        console.error(error);
        res.status(500).json({success : false, message: 'Failed to create subscription', error });
    }
};

exports.updateSubscriptionPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;

    // Find the subscription in the database
    const subscription = await SubscriptionSchema.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Check if there are any active subscriptions using this product
    // const activeSubscriptions = await SubscriptionSchema.find({
    //   stripeProductId: subscription.stripeProductId,
    //   isActive: true,  // Assuming isActive indicates it's in use
    // });

    // if (activeSubscriptions.length > 0) {
    //   return res.status(400).json({ 
    //     message: 'Cannot update subscription price as it is currently in use. Create a new price instead.' 
    //   });
    // }

    // Create a new price on Stripe for the updated amount
    const newStripePrice = await stripe.prices.create({
      unit_amount: price * 100,
      currency: 'usd',
      recurring: { interval: 'month' },
      product: subscription.stripeProductId,
    });

    // Update the database with the new price and price ID
    subscription.price = price;
    subscription.stripePriceId = newStripePrice.id;
    await subscription.save();

    res.status(200).json({ 
        success : true,
        message: 'Subscription price updated successfully',
        subscription });
  } catch (error) {
    console.error(error);
    res.status(500).json({success : false, message: 'Failed to update subscription price', error });
  }
};

exports.getAllSubscription = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;

        // Building the query object
        const query = search
            ? {
                  $or: [
                      { title: { $regex: search, $options: 'i' } },
                      { subscriptionType: { $regex: search, $options: 'i' } },
                  ],
              }
            : {};

        // Pagination and limit settings
        const subscriptions = await SubscriptionSchema.find(query)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 }); // Optionally, sort by date

        // Total count for pagination
        const totalSubscriptions = await SubscriptionSchema.countDocuments(query);

        // Response
        res.status(200).json({
            success: true,
            message: 'Subscriptions fetched successfully',
            subscriptions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalSubscriptions / limit),
                totalRecords: totalSubscriptions,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions',
            error: error.message,
        });
    }
}

exports.getSubscriptionById = async (req, res) => {
  
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ status: 400, message: 'Invalid subscription ID' });
        }

        const subscription = await SubscriptionSchema.findById(id);
        
        if (!subscription) {
            return res.status(404).json({ status: 404, message: 'Subscription not found' });
        }

        return res.status(200).json({ success : true, subscription });
  } catch (error) {
    res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriptions',
        error: error.message,
    });
  }
}

exports.deleteSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const subscription = await SubscriptionSchema.findById(id);
        console.log("subscription", subscription)
        
        if (!subscription) {
            return res.status(404).json({
                status: false,
                message: "Subscription not found"
            });
        }

        // Check if any users are using this subscription plan
        const userSubscription = await Subscription.find({ subscriptionPlan: subscription.stripePriceId });
        console.log("userSubsc", userSubscription);

        if (userSubscription.length > 0) {
            return res.status(200).json({
                status: true,
                message: "Subscription is already in use. You cannot delete this subscription, but you can add a new price for the same subscription."
            });
        }

        // If no users are using this subscription, proceed to delete
        await SubscriptionSchema.findByIdAndDelete(id);
        
        res.status(200).json({
            status: true,
            message: "Subscription deleted successfully"
        });
        
    } catch (error) {
        console.error("error", error);
        res.status(500).json({
            status: false,
            message: "An error occurred while deleting the subscription"
        });
    }
};



// flashcard
exports.getAllFlashcards = async (req, res) => {
    const { page = 1, limit = 9, subject, level } = req.query; // Extracting query parameters
    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
    };

    try {
        // Build the filter object
        const filter = {};
        if (subject) {
            filter.subject = subject; // Add subject filtering if provided
        }
        if (level) {
            filter.level = level; // Add level filtering if provided
        }

        // Fetch flashcards sorted by the creation date in descending order
        const flashcards = await Flashcard.find(filter)
            .sort({ createdAt: -1 }) // Sort by createdAt field in descending order
            .limit(options.limit)
            .skip((options.page - 1) * options.limit); // Pagination logic

        const totalFlashcards = await Flashcard.countDocuments(filter); // Count total documents

        res.status(200).json({
            success: true,
            data: flashcards,
            pagination: {
                totalFlashcards,
                totalPages: Math.ceil(totalFlashcards / options.limit),
                currentPage: options.page,
            },
        });
    } catch (error) {
        console.error("Error fetching flashcards:", error);
        res.status(500).json({
            success: false,
            message: 'Error fetching flashcards',
            error: error.message,
        });
    }
};


// question
exports.getAllSubjects = async (req, res) => {
    try {
        // Fetch distinct subjects from questions in the database
        const allSubjects = await Question.distinct('subject'); // You can filter by isActive if needed

        if (allSubjects.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No subjects found",
            });
        }

        // Send the response with the found subjects
        res.status(200).json({
            success: true,
            subjects: allSubjects, // Return the subjects array
        });
        
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subjects in question',
            error: error.message,
        });
    }
};




