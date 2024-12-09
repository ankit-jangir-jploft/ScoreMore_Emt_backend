const mongoose = require("mongoose");

// User Schema

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: function () {
        // Email should be required only for regular users, not for guests
        return !this.isGuest;
      },
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
    },
    otp: {
      type: String,
    },
    otpExpiration: {
      type: String,
    },
    password: {
      type: String,
      
    },
    profilePicture: {
      type: String,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    socialId: {
      type: String,
    },
    registrationType: {
      type: String,
    },
    subscriptionStatus: {
      type: String, // e.g., "active", "canceled", "pending"
      default: "pending",
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: false,
    },
    emailNotificationToggle: {
      type: Boolean,
      default: false, 
    },
    isGuest: {
      type: Boolean,
      default: false, // This is to indicate if the user is a guest
    },
    guestId: {
      type: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  },
  {
    timestamps: true,
  }
);



const SubscriptionSchema = new mongoose.Schema({
  userId: {
       type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
  },
  transactionId: {
      type: String,
      required: true
  },
  paymentAmount: {
      type: Number,
      required: true
  },
  currency: {
      type: String,
      required: true,
      default: 'USD'
  },
  subscriptionStatus: {
      type: String,
      enum: ['pending', 'active', 'canceled'],
      default: 'pending'
  },
  paymentMethod: {
      type: String,
      required: true
  },
  subscriptionPlan: {
      type: String, 
      required: true
  },
  priceId: {
    type: String, 
    required: true
  },
  orderId : {
    type: String, 
  },
  startedAt: {
      type: Date,
      required: true,
      default: Date.now
  },
  expiresAt: {
      type: Date,
      required: false // Can be calculated later based on plan duration
  }
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

// User Question Data Schema
const userQuestionDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // Assuming you have a User model
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Question", // Assuming you have a Question model
    },
    userSelectedOption: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    isMarked: {
      type: Boolean,
      default: false,
    },
    timeTaken: {
      type: String, // Store time in seconds or milliseconds
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: true,
    },
    isOmitted: {
      type: Boolean,
      default: false,
    },
    testId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);



const userFlashcardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  flashcardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flashcard',
    required: true
  },
  subject: {
    type: String, // e.g., "medical"
    required: true
  },
  level: {
    type: Number, // e.g., 1 to 10
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isMarked: {
    type: Boolean,
    default: false
  },
  lastReadAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add unique index to ensure `userId` and `flashcardId` are unique together
userFlashcardSchema.index({ userId: 1, flashcardId: 1 }, { unique: true });


const feedbackSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User' 
  },
  questionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'Question' 
  },
  feedbackText: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String 
  },
  fullName: { 
    type: String 
  },
  userType: { 
    type: String, 
    required: true 
  },
  questionText: { 
    type: String, 
    required: true 
  },
  subject: { 
    type: String, 
    required: true 
  }, 
  level: { 
    type: String, 
    required: true 
  }, 
  explanation: { 
    type: String 
  }, 
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model('Feedback', feedbackSchema);




const ratingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId,  ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  description: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});



// Exporting both models
const User = mongoose.model("User", userSchema);
const UserQuestionData = mongoose.model(
  "UserQuestionData",
  userQuestionDataSchema
);

const UserRating = mongoose.model('Rating', ratingSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const UserFlashcard = mongoose.model('UserFlashcard', userFlashcardSchema);

module.exports = { User, UserQuestionData, Subscription, UserFlashcard, UserRating, Feedback };