const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
    profilePicture: {
        type: String, // URL or path to the image
        required: true
    },
    question: {
        type: String,
        required: true
    },
    explanation: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    hint: {
        type: String
    },
    isMarked: {
        type: Boolean,
        default: false
    },
    level: {
        type: String, // You can customize this as needed
        required: true
    },
    subtitle : {
        type : String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Flashcard = mongoose.model('Flashcard', flashcardSchema);

module.exports = Flashcard;
