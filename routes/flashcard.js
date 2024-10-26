const express = require('express');
const router = express.Router();
const { upload } = require("../middleware/multer"); // Using multer middleware
const flashcardController = require("../controller/flashcardController");

// Add Flashcard Route with Multer Middleware
router.post("/addFlashcard", upload, flashcardController.addFlashcard);
router.put("/updateFlashcard/:id", upload, flashcardController.updateFlashcard);
router.delete("/deleteFlashcard/:id", flashcardController.deleteFlashcard);
router.get("/getAllFlashcards", flashcardController.getAllFlashcards)


router.get("/getRoadmapSubject", flashcardController.getRoadmapSubject)
router.post("/getRoadmap", flashcardController.getRoadmap);

router.post("/findFlashcardInLevel", flashcardController.getAllFlashCardDataInLevel);
router.post("/submitFlashcard", flashcardController.submitFlashcard);
router.get("/getUserCurrentFlashCard", flashcardController.getUserSubmitFlashcard)




module.exports = router;
