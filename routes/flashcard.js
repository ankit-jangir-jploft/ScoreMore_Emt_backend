const express = require('express');
const router = express.Router();
const { uploadProfilePicture } = require("../middleware/multer"); 
const flashcardController = require("../controller/flashcardController");

// Add Flashcard Route with Multer Middleware
router.post("/addFlashcard", uploadProfilePicture, flashcardController.addFlashcard);
router.put("/updateFlashcard/:id", uploadProfilePicture, flashcardController.updateFlashcard);
router.delete("/deleteFlashcard/:id", flashcardController.deleteFlashcard);
router.get("/getAllFlashcards", flashcardController.getAllFlashcards)
router.get("/getFlashcardById/:id", flashcardController.getFlashcardById);


router.get("/getRoadmapSubject", flashcardController.getRoadmapSubject)
router.post("/getRoadmap", flashcardController.getRoadmap);
router.get("/getAllRoadmap", flashcardController.getAllRoadmaps);

router.post("/findFlashcardInLevel", flashcardController.getAllFlashCardDataInLevel);
router.post("/findBookmarkedFlashcardInLevel", flashcardController.getAllBookmarkedFlashcardDataInLevel)
router.post("/submitFlashcard", flashcardController.submitFlashcard);
router.get("/getUserCurrentFlashCard", flashcardController.getUserSubmitFlashcard)




module.exports = router;
