const Flashcard = require('../models/Flashcard'); // Adjust the path as necessary
const path = require('path');
const { UserFlashcard } = require('../models/User');
const jwt = require("jsonwebtoken");
const Subject = require('../models/Subject');



// curd opreration for flashcards
exports.addFlashcard = async (req, res) => {
    try {
        // Trim the incoming request body fields
        Object.keys(req.body).forEach((key) => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });

        const { question, explanation, subject, level, hint, subtitle } = req.body;

        if (!question || !explanation || !subject || !level  || !hint) {
            console.error("Validation Error: Missing required fields."); 
            return res.status(400).json({
                message: "Please provide all required fields: question, explanation, subject, level, hint.",
                success: false
            });
        }

        // Fetch the subjectId from the Subject collection
        const subjectData = await Subject.findOne({ name: subject });
        if (!subjectData) {
            console.error("Subject not found"); 
            return res.status(400).json({
                message: "Subject not found. Please ensure the subject exists.",
                success: false
            });
        }

        const subjectId = subjectData._id;

        // Convert level to an integer for comparison
        const newLevel = parseInt(level, 10);

        // Check for existing flashcards with the same subject
        const existingFlashcards = await Flashcard.find({ subject });
        
        if (existingFlashcards.length > 0) {
            const existingLevels = existingFlashcards.map(fc => fc.level).sort((a, b) => a - b);
            const maxLevel = parseInt(existingLevels[existingLevels.length - 1], 10);

            // Check if the new level is valid
            if (newLevel > maxLevel + 1) {
                console.error(`Gap Error: Attempting to add level ${newLevel} with max level ${maxLevel}.`);
                return res.status(400).json({
                    message: `In this subject, the last level is ${maxLevel}. You cannot add level ${newLevel} directly. Please add level ${maxLevel + 1} first.`,
                    success: false
                });
            }

            // If adding a new level, check for subtitle requirement
            if (newLevel === maxLevel + 1) {
                if (!subtitle) {
                    console.error("Subtitle Requirement Error: Missing subtitle for new level.");
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
            profilePicture = path.basename(req.file.path);
        } else {
            console.error("File Upload Error: Profile picture is required.");
            return res.status(400).json({
                message: "Profile picture is required.",
                success: false
            });
        }

        // Create a new Flashcard document
        const flashcard = new Flashcard({
            profilePicture, 
            question,
            explanation,
            subject,
            subjectId, // Add subjectId
            hint,
            level: newLevel,
            subtitle
        });

        // Save the flashcard to the database
        const savedFlashcard = await flashcard.save();

        return res.status(201).json({
            message: "Flashcard created successfully",
            success: true,
            data: savedFlashcard
        });
    } catch (err) {
        console.error("Error adding flashcard:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

exports.updateFlashcard = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, explanation, subject, subjectId, level, hint, subtitle } = req.body;

        // Find the flashcard by ID
        const flashcard = await Flashcard.findById(id);
        if (!flashcard) {
            return res.status(404).json({
                message: "Flashcard not found",
                success: false
            });
        }
        console.log("flashcard by id",flashcard);

        const flashcarddata = await Flashcard.findOne({subjectId : subjectId, level : level});
        console.log("flashcarddata",flashcarddata)

        // Fetch the subjectId from the Subject model if the subject is provided
        if (subject) {
            const subjectData = await Subject.find({ name: subject });
            if (!subjectData) {
                return res.status(400).json({
                    message: "Subject not found. Please ensure the subject exists.",
                    success: false
                });
            }
            flashcard.subjectId = subjectData._id;  // Save the subjectId
            flashcard.subject = flashcarddata.subject;  // Update the subject name (if needed)
        }

        // Update other fields if they are provided in the request
        if (question) flashcard.question = question;
        if (explanation) flashcard.explanation = explanation;
        if (level) flashcard.level = level;
        if (hint) flashcard.hint = hint;
        if (subtitle) flashcard.subtitle = subtitle;
        if (subjectId) flashcard.subjectId = subjectId;

        // If a new profile picture is uploaded, update the image path
        if (req.file) {
            const profilePicture = path.basename(req.file.path);
            flashcard.profilePicture = profilePicture;
        }

        // Save the updated flashcard to the database
        flashcard.updatedAt = Date.now();  // Update the timestamp
        await flashcard.save();

        console.log("flascard after update ", flashcard)

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
        // console.log("flashcard", flashcard);

        if (!flashcard) {
            return res.status(404).json({
                message: "Flashcard not found",
                success: false
            });
        }

        // Get the level and subject of the flashcard
        const level = flashcard.level;
        const subject = flashcard.subject;
        // console.log("level", typeof level);

        // Count how many flashcards exist for this subject and level
        const count = await Flashcard.countDocuments({ level, subject });
        // console.log("count in level", count);

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

exports.getFlashcardById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the flashcard by ID
        const flashcard = await Flashcard.findById(id);
        if (!flashcard) {
            return res.status(404).json({
                success: false,
                message: "Flashcard not found",
            });
        }

        // Extract the subject and level from the flashcard
        const flashCardSubject = flashcard.subject;
        const flashCardLevel = flashcard.level;

        // Count the total number of flashcards with the same subject and level
        const totalFlashcardInlevel = await Flashcard.countDocuments({
            subject: flashCardSubject,
            level: flashCardLevel,
        });

        console.log("totalFlashcardInlevel", totalFlashcardInlevel);

        // Respond with the flashcard data and the count
        res.status(200).json({
            success: true,
            message: "Flashcard found successfully",
            data: {
                flashcard,
                totalFlashcardInlevel, // Include the total count in the response
            },
        });
    } catch (error) {
        console.error("error", error);
        res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

  

// apis for flashcards yo

// exports.getRoadmapSubject = async (req, res) => {
//     try {
//         // Extract and verify token
//         const token = req.headers.authorization?.split(" ")[1];
//         console.log("Token in myProfile:", token);

//         if (!token) {
//             return res.status(401).json({
//                 message: "No token provided!",
//                 success: false,
//             });
//         }

//         const decoded = jwt.verify(token, process.env.SECRET_KEY);
//         const userId = decoded.userId;
//         console.log("Decoded User ID:", userId);

//         // Get all flashcards, distinct subjects sorted by creation date
//         const allFlashcards = await Flashcard.find().sort({ createdAt: 1 }).distinct('subject');
//         console.log("All Flashcard Subjects:", allFlashcards);

//         if (allFlashcards.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No FlashCards found",
//             });
//         }

//         // Get all user submissions
//         const userFlashcardSubmissions = await UserFlashcard.find({ userId });
//         console.log("User Flashcard Submissions:", userFlashcardSubmissions);

//         let subjectStatus = await Promise.all(allFlashcards.map(async (subject) => {
//             const flashcardsForSubject = await Flashcard.find({ subject });
//             const totalFlashcardsForSubject = flashcardsForSubject.length;

//             // Get user submissions for the current subject
//             const userSubmissionsForSubject = userFlashcardSubmissions.filter(submission => submission.subject === subject);
//             const totalUserSubmissions = userSubmissionsForSubject.length;

//             // Determine completion and unlock status
//             const isCompleted = totalUserSubmissions === totalFlashcardsForSubject && totalFlashcardsForSubject > 0;
//             const isPending = totalUserSubmissions > 0 && totalUserSubmissions < totalFlashcardsForSubject;
//             const isUnlocked = totalUserSubmissions > 0 || isCompleted || totalUserSubmissions < totalFlashcardsForSubject;

//             return {
//                 subject,
//                 isUnlocked,
//                 isCompleted,
//                 totalFlashcards: totalFlashcardsForSubject,
//                 submittedFlashcards: totalUserSubmissions,
//             };
//         }));

//         // Define the custom order of subjects
//         const customOrder = ['medical', 'airway', 'cardiology', 'trauma', 'EMS Operations'];

//         // Sort subjectStatus based on the customOrder array
//         subjectStatus.sort((a, b) => customOrder.indexOf(a.subject) - customOrder.indexOf(b.subject));

//         // Order subjects: Completed first, then the current subject
//         const completedSubjects = subjectStatus.filter(subject => subject.isCompleted);
//         const pendingSubjects = subjectStatus.filter(subject => subject.isPending);
//         const incompleteSubjects = subjectStatus.filter(subject => !subject.isCompleted && !subject.isPending);

//         let currentSubject = null;
//         if (pendingSubjects.length > 0) {
//             currentSubject = pendingSubjects[0].subject;
//         } else if (incompleteSubjects.length > 0) {
//             currentSubject = incompleteSubjects[0].subject;
//         }

//         // Sort by completed first, then pending or incomplete
//         const orderedSubjects = [
//             ...completedSubjects,
//             ...pendingSubjects,
//             ...incompleteSubjects,
//         ];

//         // Send response
//         res.status(200).json({
//             success: true,
//             message: "Roadmap status found successfully!",
//             data: {
//                 subjects: orderedSubjects,
//                 currentSubject: currentSubject
//             },
//         });

//     } catch (err) {
//         console.error("Error retrieving roadmap status:", err);
//         return res.status(500).json({ message: "Internal server error", success: false });
//     }
// };

// Helper function to convert strings to camelCase
function toCamelCase(str) {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
            index === 0 ? match.toLowerCase() : match.toUpperCase()
        )
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9]/g, ''); // Removing any special characters if present
}

exports.getRoadmapSubject = async (req, res) => {
    try {
        // Extract and verify token
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                message: "No token provided!",
                success: false,
            });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        // Get all flashcards, distinct subjects
        const allFlashcards = await Flashcard.find().distinct('subject');
        if (allFlashcards.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No FlashCards found",
            });
        }

        // Get all user submissions
        const userFlashcardSubmissions = await UserFlashcard.find({ userId });

        // Fetch exact subject names from the Subject collection (in the correct order)
        const subjectsFromDB = await Subject.find({}).select('name'); // Adjust the sort order if needed

        const subjectStatus = await Promise.all(
            subjectsFromDB.map(async (subjectFromDB) => {
                const subject = subjectFromDB.name;
                const subjectId = subjectFromDB._id;
                const flashcardsForSubject = await Flashcard.find({ subject : subject  });
                const totalFlashcardsForSubject = flashcardsForSubject.length;

                // User submissions for the subject
                const userSubmissionsForSubject = userFlashcardSubmissions.filter((submission) => {
                    const formattedSubject = subject === "EMS Operations" ? "EMS Operations" : toCamelCase(subject || "");
                    return submission.subject?.toLowerCase() === formattedSubject.toLowerCase();
                });
                
                const totalUserSubmissions = userSubmissionsForSubject.length;

                // Determine completion and unlock status
                const isCompleted =
                    totalUserSubmissions === totalFlashcardsForSubject && totalFlashcardsForSubject > 0;
                const isUnlocked =
                    totalUserSubmissions > 0 || isCompleted || totalUserSubmissions < totalFlashcardsForSubject;

                return {
                    subject: subject, // Use camelCase for the subject name
                    subjectId : subjectId,
                    isUnlocked,
                    isCompleted,
                    totalFlashcards: totalFlashcardsForSubject,
                    submittedFlashcards: totalUserSubmissions,
                };
            })
        );

        // Sort the subjectStatus array to match the exact order from the subjectsFromDB
        subjectStatus.sort((a, b) => {
            const indexA = subjectsFromDB.findIndex(sub => sub.name === a.subject);
            const indexB = subjectsFromDB.findIndex(sub => sub.name === b.subject);
            return indexA - indexB;
        });

        // Determine the current subject
        const currentSubject = subjectStatus.find(
            (subject) => !subject.isCompleted
        )?.subject || null;

        // Send the ordered response
        res.status(200).json({
            success: true,
            message: "Roadmap status found successfully!",
            data: {
                subjects: subjectStatus,
                currentSubject,
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

        const { subjectId } = req.body;

        // Find all flashcards related to the subject
        const findAllFlashcard = await Flashcard.find({ subjectId : subjectId });
        if (findAllFlashcard.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No FlashCard found",
            });
        }

        // Find user's submitted flashcards for the specific subject
        const userFlashcardData = await UserFlashcard.find({ userId, subjectId });
        // console.log("userAllsubmittedFlashcard", userFlashcardData);

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
            subject : findAllFlashcard.subject,
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

// exports.getAllRoadmaps = async (req, res) => {
//     try {
//         const token = req.headers.authorization?.split(" ")[1];
//         if (!token) {
//             return res.status(401).json({
//                 message: "No token provided!",
//                 success: false,
//             });
//         }

//         const decoded = jwt.verify(token, process.env.SECRET_KEY);
//         const userId = decoded.userId;

//         // Get all flashcards, distinct subjects
//         const allFlashcards = await Flashcard.find().distinct('subject');
//         if (allFlashcards.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No FlashCards found",
//             });
//         }


//         const subject = await Subject.find();
        

//         // Define custom subject order
//         const customOrder = ["medical", "airway", "cardiology", "trauma", "EMS Operations"];
//         const orderedSubjects = customOrder.filter(subject => allFlashcards.includes(subject));

//         // Get all user submissions
//         const userFlashcardSubmissions = await UserFlashcard.find({ userId });

//         // Map through ordered subjects and gather roadmap data for each
//         let subjectRoadmaps = await Promise.all(orderedSubjects.map(async (subject) => {
//             const flashcardsForSubject = await Flashcard.find({ subject });
//             const totalFlashcardsForSubject = flashcardsForSubject.length;

//             // Get user submissions for the current subject
//             const userSubmissionsForSubject = userFlashcardSubmissions.filter(submission => submission.subject === subject);
//             const totalUserSubmissions = userSubmissionsForSubject.length;

//             // Determine completion and unlock status
//             const isCompleted = totalUserSubmissions === totalFlashcardsForSubject && totalFlashcardsForSubject > 0;
//             const isPending = totalUserSubmissions > 0 && totalUserSubmissions < totalFlashcardsForSubject;
//             const isUnlocked = totalUserSubmissions > 0 || isCompleted || totalUserSubmissions < totalFlashcardsForSubject;

//             // Get levels data for the subject
//             const levels = {};

//             flashcardsForSubject.forEach(flashcard => {
//                 const { level, subtitle } = flashcard;
//                 if (!levels[level]) {
//                     levels[level] = {
//                         totalFlashcards: 0,
//                         submittedFlashcards: 0,
//                         isCompleted: false,
//                         isUnlocked: false,
//                         isCurrent: false,
//                         subtitle: null
//                     };
//                 }

//                 levels[level].totalFlashcards++;

//                 if (levels[level].subtitle === null && subtitle) {
//                     levels[level].subtitle = subtitle;
//                 }
//             });

//             // Track submitted flashcards by the user for each subject
//             userSubmissionsForSubject.forEach(submission => {
//                 const { level } = submission;
//                 if (levels[level]) {
//                     levels[level].submittedFlashcards++;
//                 }
//             });

//             // Sort levels based on their numeric values (level)
//             const sortedLevelKeys = Object.keys(levels).sort((a, b) => Number(a) - Number(b));

//             let currentLevelSet = false;
//             sortedLevelKeys.forEach((levelKey, index) => {
//                 const level = levels[levelKey];

//                 if (level.submittedFlashcards === level.totalFlashcards) {
//                     level.isCompleted = true;
//                 }

//                 if (index === 0) {
//                     level.isUnlocked = true;
//                 }

//                 if (index > 0 && levels[sortedLevelKeys[index - 1]].isCompleted) {
//                     level.isUnlocked = true;
//                 }

//                 if (!currentLevelSet && level.isUnlocked && !level.isCompleted) {
//                     level.isCurrent = true;
//                     currentLevelSet = true;
//                 }
//             });

//             return {
//                 subject,
//                 totalLevels: sortedLevelKeys.length,
//                 levels: sortedLevelKeys.map(levelKey => ({
//                     level: levelKey,
//                     totalFlashcards: levels[levelKey].totalFlashcards,
//                     submittedFlashcards: levels[levelKey].submittedFlashcards,
//                     isCompleted: levels[levelKey].isCompleted,
//                     isUnlocked: levels[levelKey].isUnlocked,
//                     isCurrent: levels[levelKey].isCurrent,
//                     subtitle: levels[levelKey].subtitle
//                 })),
//             };
//         }));

//         res.status(200).json({
//             success: true,
//             message: "All Roadmaps retrieved successfully!",
//             data: subjectRoadmaps
//         });

//     } catch (err) {
//         console.error("Error retrieving all roadmaps:", err);
//         return res.status(500).json({
//             message: "Internal server error",
//             success: false
//         });
//     }
// };


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

        const { level, flashcardLevelName, subjectId, cardsLength, bookmarked } = req.body;

        // Find all flashcards for the given level and subject
        const findFlashcardInLevel = await Flashcard.find({ level, subjectId });

        // Find all flashcards submitted by the user
        const getUserSubmittedFlashcard = await UserFlashcard.find({ userId, subjectId, level });

        if (findFlashcardInLevel.length === 0) {
            return res.status(404).json({ message: 'No flashcards found for this level and subject.' });
        }

        // Create a map of submitted flashcard IDs to their isMarked status
        const submittedFlashcardMap = new Map();
        getUserSubmittedFlashcard.forEach(flashcard => {
            submittedFlashcardMap.set(flashcard.flashcardId.toString(), flashcard.isMarked);
        });

        // Separate unused and used flashcards
        let unusedFlashcards = findFlashcardInLevel.filter(
            flashcard => !submittedFlashcardMap.has(flashcard._id.toString())
        );

        let usedFlashcards = findFlashcardInLevel.filter(
            flashcard => submittedFlashcardMap.has(flashcard._id.toString())
        );

        // If bookmarked is true, filter only marked flashcards
        if (bookmarked) {
            unusedFlashcards = unusedFlashcards.filter(flashcard => submittedFlashcardMap.get(flashcard._id.toString()) === true);
            usedFlashcards = usedFlashcards.filter(flashcard => submittedFlashcardMap.get(flashcard._id.toString()) === true);
        }

        // Start with unused flashcards
        let finalFlashcards = unusedFlashcards.slice(0, cardsLength);

        // If more flashcards are needed, add random ones from the remaining pool
        if (finalFlashcards.length < cardsLength) {
            const remainingNeeded = cardsLength - finalFlashcards.length;
            const shuffledUsedFlashcards = usedFlashcards.sort(() => Math.random() - 0.5);
            finalFlashcards = finalFlashcards.concat(shuffledUsedFlashcards.slice(0, remainingNeeded));
        }

        const subjectName = await Subject.findById(subjectId);

        console.log("subjectName",subjectName)

        // Create the response data
        const responseData = {
            level: level,
            noOfFlashcard: finalFlashcards.length,
            totalFlashCards: findFlashcardInLevel.length,
            submittedFlashcards: getUserSubmittedFlashcard.length,
            flashcardSubject: subjectName.name,
            flashcardLevelName: flashcardLevelName,
            flashcards: finalFlashcards.map(flashcard => {
                const isMarked = submittedFlashcardMap.get(flashcard._id.toString()) || false;
                return {
                    ...flashcard._doc,
                    isRead: submittedFlashcardMap.has(flashcard._id.toString()),
                    isMarked, // Include the correct isMarked status
                };
            }),
        };

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



exports.getAllRoadmaps = async (req, res) => {
    try {
        // Extract and verify token
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "No token provided!", success: false });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decoded.userId;

        // Fetch all distinct subjects with flashcards
        const distinctSubjects = await Flashcard.distinct("subjectId");
        if (!distinctSubjects.length) {
            return res.status(404).json({ success: false, message: "No FlashCards found" });
        }

        // Fetch all subjects and filter by distinct IDs
        const allSubjects = await Subject.find({ _id: { $in: distinctSubjects } });

        // Fetch all user flashcard submissions
        const userSubmissions = await UserFlashcard.find({ userId });

        // Process each subject
        const subjectRoadmaps = await Promise.all(
            allSubjects.map(async (subject) => {
                const flashcards = await Flashcard.find({ subjectId: subject._id });
                const totalFlashcards = flashcards.length;

                // User submissions for this subject
                const userSubmissionsForSubject = userSubmissions.filter(
                    (submission) => submission.subjectId.toString() === subject._id.toString()
                );
                const totalSubmissions = userSubmissionsForSubject.length;

                // Define completion status
                const isCompleted = totalSubmissions === totalFlashcards && totalFlashcards > 0;
                const isUnlocked = totalSubmissions > 0 || isCompleted;

                // Organize levels
                const levels = {};
                flashcards.forEach(({ level, subtitle }) => {
                    if (!levels[level]) {
                        levels[level] = {
                            totalFlashcards: 0,
                            submittedFlashcards: 0,
                            isCompleted: false,
                            isUnlocked: false,
                            isCurrent: false,
                            subtitle: null,
                        };
                    }
                    levels[level].totalFlashcards++;
                    if (!levels[level].subtitle && subtitle) {
                        levels[level].subtitle = subtitle;
                    }
                });

                // Update levels with user submissions
                userSubmissionsForSubject.forEach(({ level }) => {
                    if (levels[level]) {
                        levels[level].submittedFlashcards++;
                    }
                });

                // Determine level states
                const sortedLevels = Object.keys(levels).sort((a, b) => Number(a) - Number(b));
                let currentLevelSet = false;
                sortedLevels.forEach((levelKey, index) => {
                    const level = levels[levelKey];
                    level.isCompleted = level.submittedFlashcards === level.totalFlashcards;

                    if (index === 0 || levels[sortedLevels[index - 1]].isCompleted) {
                        level.isUnlocked = true;
                    }

                    if (!currentLevelSet && level.isUnlocked && !level.isCompleted) {
                        level.isCurrent = true;
                        currentLevelSet = true;
                    }
                });

                return {
                    subject: subject.name,
                    subjectId : subject._id,
                    totalLevels: sortedLevels.length,
                    levels: sortedLevels.map((levelKey) => ({
                        level: levelKey,
                        totalFlashcards: levels[levelKey].totalFlashcards,
                        submittedFlashcards: levels[levelKey].submittedFlashcards,
                        isCompleted: levels[levelKey].isCompleted,
                        isUnlocked: levels[levelKey].isUnlocked,
                        isCurrent: levels[levelKey].isCurrent,
                        subtitle: levels[levelKey].subtitle,
                    })),
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "All Roadmaps retrieved successfully!",
            data: subjectRoadmaps,
        });
    } catch (err) {
        console.error("Error retrieving all roadmaps:", err);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};



exports.getAllBookmarkedFlashcardDataInLevel = async (req, res) => {
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

        const { level, flashcardLevelName, subject, cardsLength } = req.body;

        // Find all flashcards for the given level and subject
        const findFlashcardInLevel = await Flashcard.find({ level, subject });

        // Check if any flashcards were found for the level and subject
        if (findFlashcardInLevel.length === 0) {
            return res.status(404).json({ message: 'No flashcards found for this level and subject.' });
        }

        // Find all bookmarked flashcards submitted by the user
        const getBookmarkedFlashcards = await UserFlashcard.find({ 
            userId, 
            subject, 
            level, 
            isMarked: true 
        });

        // If no bookmarked flashcards exist, return an empty list
        if (getBookmarkedFlashcards.length === 0) {
            return res.status(404).json({ 
                success: true, 
                message: 'No bookmarked flashcards found.', 
                data: {
                    level: level,
                    noOfFlashcard: 0,
                    totalFlashCards: findFlashcardInLevel.length,
                    submittedFlashcards: 0,
                    flashcardSubject: subject,
                    flashcardLevelName: flashcardLevelName,
                    flashcards: []
                }
            });
        }

        // Create a set of bookmarked flashcard IDs for quick lookup
        const bookmarkedFlashcardIds = new Set(getBookmarkedFlashcards.map(f => f.flashcardId.toString()));

        // Filter flashcards to include only the bookmarked ones
        const bookmarkedFlashcards = findFlashcardInLevel.filter(
            flashcard => bookmarkedFlashcardIds.has(flashcard._id.toString())
        );

        // Limit the results to the specified cardsLength
        const finalFlashcards = bookmarkedFlashcards.slice(0, cardsLength);

        // Create the response data
        const responseData = {
            level: level,
            noOfFlashcard: finalFlashcards.length,
            totalFlashCards: findFlashcardInLevel.length,
            submittedFlashcards: getBookmarkedFlashcards.length,
            flashcardSubject: subject,
            flashcardLevelName: flashcardLevelName,
            flashcards: finalFlashcards.map(flashcard => ({
                ...flashcard._doc, // Spread the flashcard data
                isRead: bookmarkedFlashcardIds.has(flashcard._id.toString()) 
            }))
        };

        // Return the flashcards in the response
        return res.status(200).json({
            success: true,
            message: 'Bookmarked flashcards retrieved successfully.',
            data: responseData,
        });
    } catch (err) {
        console.error("Error retrieving flashcards:", err);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};



exports.submitFlashcard = async (req, res) => {
    const { userId, flashcardId , isMarked} = req.body;

    try {
        let flashCard = await Flashcard.findById(flashcardId);
        if (!flashCard) {
            return res.status(404).json({ message: "Flashcard not found", success: false });
        }

        // Ensure there isn't an entry exceeding total flashcards
        const totalFlashcards = await Flashcard.countDocuments({ subject: flashCard.subject, level: flashCard.level });

        const userFlashcardsCount = await UserFlashcard.countDocuments({
            userId,
            subject: flashCard.subject,
            level: flashCard.level
        });

        // if (userFlashcardsCount >= totalFlashcards) {
        //     return res.status(400).json({
        //         message: `All flashcards for this subject and level are already submitted.`,
        //         success: false
        //     });
        // }

        // Check if the user has already submitted this flashcard
        let userFlashcard = await UserFlashcard.findOne({ userId, flashcardId });

        if (!userFlashcard) {
            // If not found, create a new submission
            userFlashcard = new UserFlashcard({
                userId,
                flashcardId,
                isRead: true,
                isMarked : isMarked,
                lastReadAt: new Date(),
                subject: flashCard.subject,
                subjectId: flashCard.subjectId, 
                level: flashCard.level 
            });
            await userFlashcard.save();
            // console.log("New userFlashcard created:", userFlashcard);
        } else {
            // If found, update the existing submission
            userFlashcard.isRead = true;
            userFlashcard.isMarked = isMarked;
            userFlashcard.lastReadAt = new Date();
            await userFlashcard.save();
            // console.log("Existing userFlashcard updated:", userFlashcard);
        }

        // Check if all flashcards in the same level are read
        const unreadFlashcards = await UserFlashcard.find({
            userId,
            subject: userFlashcard.subject,
            level: userFlashcard.level,
            isRead: false
        });

        // console.log("Unread flashcards in level:", unreadFlashcards);

        if (unreadFlashcards.length === 0) {
            // Unlock the next level if all flashcards in the current level are read
            const nextLevel = userFlashcard.level + 1;
            // console.log(`All flashcards read. Unlock next level: ${nextLevel}`);
            // Implement the unlock logic here if necessary
        }

        // Check if all levels in the subject are completed (optional logic)
        const completedLevels = await UserFlashcard.find({
            userId,
            subject: userFlashcard.subject,
            isRead: true
        });

        const totalLevels = 10; // Assuming 10 levels per subject, adjust as needed
        if (completedLevels.length === totalLevels) {
            // console.log("All levels completed for this subject.");
            // Implement logic for unlocking the next subject here
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
        // console.log("Token in myProfile:", token);

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
        // console.log("Decoded User ID:", userId);

        // Retrieve the most recent user flashcard
        const userFlashcard = await UserFlashcard.findOne({ userId })
            .sort({ createdAt: -1 });
        // console.log("userFlashcard laytest", userFlashcard) // Sort to get the most recent flashcard

        // Check if the user has any flashcards
        if (!userFlashcard) {
            return res.status(404).json({ message: 'No flashcards found for this user.' });
        }

        // Extract flashcard details
        const { subject, level, flashcardId, isRead } = userFlashcard;

        // Retrieve the flashcard details
        const flashcardDetails = await Flashcard.findById(flashcardId);
        // console.log("flashcard", flashcardDetails)

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





