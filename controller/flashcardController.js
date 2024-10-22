const Flashcard = require('../models/Flashcard'); // Adjust the path as necessary
const path = require('path');
const { UserFlashcard } = require('../models/User');
const jwt = require("jsonwebtoken");

// Add Flashcard API
exports.addFlashcard = async (req, res) => {
    try {
        console.log("req.body", req.body); // Log the body fields
        console.log("req.file", req.file); // Log the file details

        const { question, explanation, subject, level, hint } = req.body;

        // Validate required fields
        if (!question || !explanation || !subject || !level) {
            return res.status(400).json({
                message: "Please provide all required fields: question, explanation, subject, level.",
                success: false
            });
        }

        // Extract the image file if uploaded
        let profilePicture;
        if (req.file) {
            // Get just the filename (not the full path)
            profilePicture = path.basename(req.file.path);
        } else {
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
            level
        });

        // Save the flashcard to the database
        await flashcard.save();

        return res.status(201).json({
            message: "Flashcard created successfully",
            success: true,
            data: flashcard
        });
    } catch (err) {
        console.error("Error adding flashcard:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};


// Update Flashcard API
exports.updateFlashcard = async (req, res) => {
    try {
        console.log("req.body", req.body);
        console.log("req.file", req.file);

        const { id } = req.params;
        const { question, explanation, subject, level, hint } = req.body;

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

// Delete Flashcard API
exports.deleteFlashcard = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the flashcard by ID and delete it
        const flashcard = await Flashcard.findByIdAndDelete(id);

        if (!flashcard) {
            return res.status(404).json({
                message: "Flashcard not found",
                success: false
            });
        }

        return res.status(200).json({
            message: "Flashcard deleted successfully",
            success: true,
            data: flashcard // Return the deleted flashcard data (optional)
        });
    } catch (err) {
        console.error("Error deleting flashcard:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};






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

        // Organize flashcards by level
        findAllFlashcard.forEach(flashcard => {
            const { level } = flashcard;

            if (!levels[level]) {
                levels[level] = {
                    totalFlashcards: 0,
                    submittedFlashcards: 0,
                    isCompleted: false,
                    isUnlocked: false,
                    isCurrent: false, // This will be updated later
                };
            }

            // Count total flashcards for each level
            levels[level].totalFlashcards++;
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





