require('dotenv').config();
const connectDB = require('./config/db');
const { retrieveRAGResponse } = require('./services/aiService');
const mongoose = require('mongoose');

async function test() {
  console.log("Connecting to database...");
  await connectDB();
  
  const testQueries = [
    "how can i get stipnd?",
    "what is the attendance policy?",
    "where is the bonafide template?",
    "what is vicharanshala?",
    "can my hod mail NOC?"
  ];

  console.log("\n=== RUNNING DB BACKED RAG TESTS ===");
  for (const query of testQueries) {
    console.log(`\nQuery: "${query}"`);
    const response = await retrieveRAGResponse(query);
    console.log(`Answer:\n${response.answer}`);
    console.log(`Confidence: ${response.confidence}%`);
    console.log(`Thread ID: ${response.threadId}`);
    console.log(`Suggest Thread: ${response.suggestThread}`);
  }

  console.log("\nTests complete. Closing connection.");
  await mongoose.connection.close();
}

test().catch(err => {
  console.error("Test failed:", err);
  mongoose.connection.close();
});
