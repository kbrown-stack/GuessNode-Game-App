require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("./models/question");


const questions = [
    {question: "What is the name of my grandmother?", answer: "Mama Suzana"},
    {question: "What is Brown Middle name?", answer: "Kachi"},
    {question: "What is Dera middle name?", answer: "Chinemelum"},
    {question: "What is Dera best meal?", answer: "Plantain"},
    {question: "What is  Brown best meal?", answer: "Yam"},
];

mongoose.connect(process.env.MONGODB_URL) 
.then(async() => {
    console.log("Connected to MongoDB");
    await Question.deleteMany({});  // This clears the existing questions 
    await Question.insertMany(questions); // This is insert new questions.
    console.log("Questions seeded successfully");
    mongoose.disconnect();
})
.catch(err => {
    console.error("Error connecting to MongoDB:", err)
});