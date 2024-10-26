const Flashcard = require('../models/Flashcard'); // Adjust the path as necessary
const path = require('path');
const { UserFlashcard } = require('../models/User');
const jwt = require("jsonwebtoken");



// curd opreration for flashcards
exports.addFlashcard = async (req, res) => {
    try {
        // Trim the incoming request body fields
        Object.keys(req.body).forEach((key) => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });

        // Log incoming request details
        console.log("Incoming Request Body (trimmed):", req.body); 
        console.log("Uploaded File Details:", req.file); 

        const { question, explanation, subject, level, hint, subtitle } = req.body;

        if (!question || !explanation || !subject || !level  || !hint) {
            console.error("Validation Error: Missing required fields."); 
            return res.status(400).json({
                message: "Please provide all required fields: question, explanation, subject, level, hint.",
                success: false
            });
        }

        // Convert level to an integer for comparison
        const newLevel = parseInt(level, 10);
        console.log("Parsed Level:", newLevel); // Log the parsed level

        // Check for existing flashcards with the same subject
        const existingFlashcards = await Flashcard.find({ subject });
        console.log("Existing Flashcards Found:", existingFlashcards.length); // Log the number of existing flashcards

        if (existingFlashcards.length > 0) {
            const existingLevels = existingFlashcards.map(fc => fc.level).sort((a, b) => a - b);
            const maxLevel = parseInt(existingLevels[existingLevels.length - 1], 10); // Convert maxLevel to an integer

            console.log("Existing Levels:", existingLevels); // Log existing levels
            console.log("Max Existing Level:",typeof maxLevel); // Log max existing level

            // Check if the new level is valid
            if (newLevel > maxLevel + 1) {
                console.error(`Gap Error: Attempting to add level ${newLevel} with max level ${maxLevel}.`); // Log the gap error
                return res.status(400).json({
                    message: `In this subject, the last level is ${maxLevel}. You cannot add level ${newLevel} directly. Please add level ${maxLevel + 1} first.`,
                    success: false
                });
            }

            // If adding a new level, check for subtitle requirement
            if (newLevel === maxLevel + 1) {
                // Check if a subtitle is provided
                if (!subtitle) {
                    console.error("Subtitle Requirement Error: Missing subtitle for new level."); // Log the subtitle error
                    return res.status(400).json({
                        message: "Subtitle is required for the new level.",
                        success: false
                    });
                }
            }
        }

        // Extract the image file if uploaded
        let profilePicture;
        if (req.file) {
            // Get just the filename (not the full path)
            profilePicture = path.basename(req.file.path);
            console.log("Profile Picture Filename:", profilePicture); // Log the profile picture filename
        } else {
            console.error("File Upload Error: Profile picture is required."); // Log the file error
            return res.status(400).json({
                message: "Profile picture is required.",
                success: false
            });
        }

        // Create a new Flashcard document
        const flashcard = new Flashcard({
            profilePicture, // Save the image filename
            question,
            explanation,
            subject,
            hint,
            level: newLevel,
            subtitle // Add the subtitle field
        });

        // Save the flashcard to the database
        const savedFlashcard = await flashcard.save();
        console.log("Flashcard Saved Successfully:", savedFlashcard); // Log the saved flashcard data

        return res.status(201).json({
            message: "Flashcard created successfully",
            success: true,
            data: savedFlashcard
        });
    } catch (err) {
        console.error("Error adding flashcard:", err); // Log any errors
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};


exports.updateFlashcard = async (req, res) => {
    try {
        console.log("req.body", req.body);
        console.log("req.file", req.file);

        const { id } = req.params;
        const { question, explanation, subject, level, hint, subtitle } = req.body;

        // Find the flashcard by ID
        const flashcard = await Flashcard.findById(id);
        if (!flashcard) {
            return res.status(404).json({
                message: "Flashcard not found",
                success: false
            });
        }

        // Update fields if they are provided in the request
        if (question) flashcard.question = question;
        if (explanation) flashcard.explanation = explanation;
        if (subject) flashcard.subject = subject;
        if (level) flashcard.level = level;
        if (hint) flashcard.hint = hint;
        if (subtitle) flashcard.subtitle = subtitle;

        // If a new profile picture is uploaded, update the image path
        if (req.file) {
            const profilePicture = path.basename(req.file.path);
            flashcard.profilePicture = profilePicture;
        }

        // Save the updated flashcard to the database
        flashcard.updatedAt = Date.now(); // Update the timestamp
        await flashcard.save();

        return res.status(200).json({
            message: "Flashcard updated successfully",
            success: true,
            data: flashcard
        });
    } catch (err) {
        console.error("Error updating flashcard:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

exports.deleteFlashcard = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the flashcard by ID
        const flashcard = await Flashcard.findById(id);
        console.log("flashcard", flashcard);

        if (!flashcard) {
            return res.status(404).json({
                message: "Flashcard not found",
                success: false
            });
        }

        // Get the level and subject of the flashcard
        const level = flashcard.level;
        const subject = flashcard.subject;
        console.log("level", typeof level);

        // Count how many flashcards exist for this subject and level
        const count = await Flashcard.countDocuments({ level, subject });
        console.log("count in level", count);

        // Check if there's more than one flashcard for the same subject and level
        if (count <= 1) {
            return res.status(400).json({
                message: `There is only one flashcard in subject "${subject}" and level ${level}. You cannot delete the last flashcard from this level.`,
                success: false
            });
        }

        // Proceed to delete the flashcard
        await Flashcard.findByIdAndDelete(id);

        return res.status(200).json({
            message: "Flashcard deleted successfully",
            success: true // Return the deleted flashcard data (optional)
        });
    } catch (err) {
        console.error("Error deleting flashcard:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

exports.getAllFlashcards = async (req, res) => {
    const { page = 1, limit = 9, subject } = req.query; // Extracting query parameters
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
  

// apis for flashcards yo

exports.getRoadmapSubject = async (req, res) => {
    try {
        // Extract and verify token
        const token = req.headers.authorization?.split(" ")[1];
        console.log("Token in myProfile:", token);

        if (!token) {
            return res.status(401).json({
                message: "No token provided!",
                success: false,
            });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;
        console.log("Decoded User ID:", userId);

        // Get all flashcards, distinct subjects sorted by creation date
        const allFlashcards = await Flashcard.find().sort({ createdAt: 1 }).distinct('subject');
        console.log("All Flashcard Subjects:", allFlashcards);

        if (allFlashcards.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No FlashCards found",
            });
        }

        // Get all user submissions
        const userFlashcardSubmissions = await UserFlashcard.find({ userId });
        console.log("User Flashcard Submissions:", userFlashcardSubmissions);

        let subjectStatus = await Promise.all(allFlashcards.map(async (subject) => {
            const flashcardsForSubject = await Flashcard.find({ subject });
            const totalFlashcardsForSubject = flashcardsForSubject.length;

            // Get user submissions for the current subject
            const userSubmissionsForSubject = userFlashcardSubmissions.filter(submission => submission.subject === subject);
            const totalUserSubmissions = userSubmissionsForSubject.length;

            // Determine completion and unlock status
            const isCompleted = totalUserSubmissions === totalFlashcardsForSubject && totalFlashcardsForSubject > 0;
            const isPending = totalUserSubmissions > 0 && totalUserSubmissions < totalFlashcardsForSubject;
            const isUnlocked = totalUserSubmissions > 0 || isCompleted || totalUserSubmissions < totalFlashcardsForSubject;

            return {
                subject,
                isUnlocked,
                isCompleted,
                // isPending,
                totalFlashcards: totalFlashcardsForSubject,
                submittedFlashcards: totalUserSubmissions,
            };
        }));

        // Order subjects: Completed first, then the current subject
        const completedSubjects = subjectStatus.filter(subject => subject.isCompleted);
        const pendingSubjects = subjectStatus.filter(subject => subject.isPending);
        const incompleteSubjects = subjectStatus.filter(subject => !subject.isCompleted && !subject.isPending);

        let currentSubject = null;
        if (pendingSubjects.length > 0) {
            currentSubject = pendingSubjects[0].subject;
        } else if (incompleteSubjects.length > 0) {
            currentSubject = incompleteSubjects[0].subject;
        }

        // Sort by completed first, then pending or incomplete
        const orderedSubjects = [
            ...completedSubjects,
            ...pendingSubjects,
            ...incompleteSubjects,
        ];

        // Send response
        res.status(200).json({
            success: true,
            message: "Roadmap status found successfully!",
            data: {
                subjects: orderedSubjects,
                currentSubject: currentSubject
            },
        });

    } catch (err) {
        console.error("Error retrieving roadmap status:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

exports.getRoadmap = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                message: "No token provided!",
                success: false,
            });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        const { subject } = req.body;

        // Find all flashcards related to the subject
        const findAllFlashcard = await Flashcard.find({ subject });
        if (findAllFlashcard.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No FlashCard found",
            });
        }

        // Find user's submitted flashcards for the specific subject
        const userFlashcardData = await UserFlashcard.find({ userId, subject });
        console.log("userAllsubmittedFlashcard", userFlashcardData);

        const levels = {};

        // Organize flashcards by level and collect one subtitle
        findAllFlashcard.forEach(flashcard => {
            const { level, subtitle } = flashcard;

            if (!levels[level]) {
                levels[level] = {
                    totalFlashcards: 0,
                    submittedFlashcards: 0,
                    isCompleted: false,
                    isUnlocked: false,
                    isCurrent: false, // This will be updated later
                    subtitle: null // To hold one subtitle for each level
                };
            }

            // Count total flashcards for each level
            levels[level].totalFlashcards++;

            // Store the first subtitle found for this level
            if (levels[level].subtitle === null && subtitle) {
                levels[level].subtitle = subtitle;
            }
        });

        // Track submitted flashcards by the user (for the same subject)
        userFlashcardData.forEach(submission => {
            const { level } = submission;
            if (levels[level]) {
                levels[level].submittedFlashcards++;
            }
        });

        // Sort levels based on their keys (assume levels are numeric)
        const sortedLevelKeys = Object.keys(levels).sort((a, b) => Number(a) - Number(b));

        // Calculate status for each level (completed, unlocked, current)
        let currentLevelSet = false;
        sortedLevelKeys.forEach((levelKey, index) => {
            const level = levels[levelKey];

            // Mark level as completed if all flashcards are submitted
            if (level.submittedFlashcards === level.totalFlashcards) {
                level.isCompleted = true;
            }

            // Unlock the first level by default
            if (index === 0) {
                level.isUnlocked = true;
            }

            // Unlock next level if the previous level is completed
            if (index > 0 && levels[sortedLevelKeys[index - 1]].isCompleted) {
                level.isUnlocked = true;
            }

            // Set the current level (first unlocked and not completed level)
            if (!currentLevelSet && level.isUnlocked && !level.isCompleted) {
                level.isCurrent = true;
                currentLevelSet = true;
            }
        });

        // Prepare the response
        const response = {
            subject,
            totalLevels: sortedLevelKeys.length,
            levels: sortedLevelKeys.map(levelKey => ({
                level: levelKey,
                totalFlashcards: levels[levelKey].totalFlashcards,
                submittedFlashcards: levels[levelKey].submittedFlashcards,
                isCompleted: levels[levelKey].isCompleted,
                isUnlocked: levels[levelKey].isUnlocked,
                isCurrent: levels[levelKey].isCurrent,
                subtitle: levels[levelKey].subtitle // Include one subtitle for each level
            })),
        };

        res.status(200).json({
            success: true,
            message: "Roadmap retrieved successfully!",
            data: response,
        });

    } catch (err) {
        console.error("Error retrieving roadmap:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

exports.getAllFlashCardDataInLevel = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                message: "No token provided!",
                success: false,
            });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        const { level, subject } = req.body;

        // Find flashcards based on level and subject
        const findFlashcardInLevel = await Flashcard.find({ level, subject });
        console.log("findFlashcardInLevel", findFlashcardInLevel);

        // Find submitted flashcards by the user
        const getUserSubmittedFlashcard = await UserFlashcard.find({ userId, subject, level });
        console.log("getUserSubmittedFlashcard", getUserSubmittedFlashcard);

        // Check if any flashcards were found
        if (findFlashcardInLevel.length === 0) {
            return res.status(404).json({ message: 'No flashcards found for this level and subject.' });
        }

        // Create a set of submitted flashcard IDs for quick lookup
        const submittedFlashcardIds = new Set(getUserSubmittedFlashcard.map(f => f.flashcardId.toString()));

        // Create the response data
        const responseData = {
            level: level,
            noOfFlashcard: findFlashcardInLevel.length,
            flashcards: findFlashcardInLevel.map(flashcard => ({
                ...flashcard._doc, // Spread the flashcard data
                isRead: submittedFlashcardIds.has(flashcard._id.toString()) // Check if flashcard has been submitted
            }))
        };

        console.log("flashcards", responseData);

        // Return the flashcards in the response
        return res.status(200).json({
            success: true,
            message: 'Flashcards retrieved successfully.',
            data: responseData,
        });
    } catch (err) {
        console.error("Error retrieving flashcards:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

exports.submitFlashcard = async (req, res) => {
    const { userId, flashcardId } = req.body;

    try {
        // Find the flashcard by its ID
        let flashCard = await Flashcard.findById(flashcardId);
        if (!flashCard) {
            return res.status(404).json({ message: "Flashcard not found", success: false });
        }

        // Check if the user has already submitted this flashcard
        let userFlashcard = await UserFlashcard.findOne({ userId, flashcardId });

        if (!userFlashcard) {
            // If not found, create a new submission
            userFlashcard = new UserFlashcard({
                userId,
                flashcardId,
                isRead: true,
                lastReadAt: new Date(),
                subject: flashCard.subject, // Set the subject from flashcard
                level: flashCard.level // Set the level from flashcard
            });
            await userFlashcard.save();
            console.log("New userFlashcard created:", userFlashcard);
        } else {
            // If found, update the existing submission
            userFlashcard.isRead = true;
            userFlashcard.lastReadAt = new Date();
            await userFlashcard.save();
            console.log("Existing userFlashcard updated:", userFlashcard);
        }

        // Check if all flashcards in the same level are read
        const allReadInLevel = await UserFlashcard.find({
            userId,
            subject: userFlashcard.subject,
            level: userFlashcard.level,
            isRead: false
        });

        console.log("Unread flashcards in level:", allReadInLevel);

        if (allReadInLevel.length === 0) {
            // Unlock the next level if all flashcards in the current level are read
            const nextLevel = userFlashcard.level + 1;
            console.log(`All flashcards read. Unlock next level: ${nextLevel}`);
            // You can implement the unlock logic here if necessary
        }

        // Check if all levels in the subject are completed (optional logic)
        const completedLevels = await UserFlashcard.find({
            userId,
            subject: userFlashcard.subject,
            isRead: true
        });

        const totalLevels = 10; // Assuming 10 levels per subject, adjust as needed
        if (completedLevels.length === totalLevels) {
            console.log("All levels completed for this subject.");
            // You can implement logic for unlocking the next subject here
        }

        return res.status(200).json({
            success: true,
            message: 'Flashcard marked as read successfully.',
            userFlashcard
        });
    } catch (err) {
        console.error("Error submitting flashcard:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

exports.getUserSubmitFlashcard = async (req, res) => {
    try {
        // Extract token from headers
        const token = req.headers.authorization?.split(" ")[1];
        console.log("Token in myProfile:", token);

        // Check for token presence
        if (!token) {
            return res.status(401).json({
                message: "No token provided!",
                success: false,
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId; // Assuming userId is stored in the token

        // Log the user ID
        console.log("Decoded User ID:", userId);

        // Retrieve the most recent user flashcard
        const userFlashcard = await UserFlashcard.findOne({ userId })
            .sort({ createdAt: -1 });
        console.log("userFlashcard laytest", userFlashcard) // Sort to get the most recent flashcard

        // Check if the user has any flashcards
        if (!userFlashcard) {
            return res.status(404).json({ message: 'No flashcards found for this user.' });
        }

        // Extract flashcard details
        const { subject, level, flashcardId, isRead } = userFlashcard;

        // Retrieve the flashcard details
        const flashcardDetails = await Flashcard.findById(flashcardId);
        console.log("flashcard", flashcardDetails)

        // Check if the flashcard exists
        if (!flashcardDetails) {
            return res.status(404).json({ message: 'Flashcard not found.' });
        }

        // Return the structured response with user ID, subject, level, and flashcard details
        return res.status(200).json({
            success: true,
            userId,
            subject,
            level,
            currentFlashcard: {
                id: flashcardDetails._id,
                question: flashcardDetails.question,
                explanation: flashcardDetails.explanation,
                hint: flashcardDetails.hint,
                isMarked: flashcardDetails.isMarked,
                profilePicture: flashcardDetails.profilePicture,
                createdAt: flashcardDetails.createdAt,
                updatedAt: flashcardDetails.updatedAt,
            },
            isRead
        });
    } catch (err) {
        console.error("Error retrieving user flashcard:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};




