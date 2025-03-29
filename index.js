// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import required libraries
import { OpenAI } from "openai";
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Setup directory path for documents
const directoryPath = "./documents";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to load and process documents
function loadDocuments() {
  console.log("Loading documents from directory...");
  
  try {
    // Check if directory exists
    if (!fs.existsSync(directoryPath)) {
      console.error(`Directory ${directoryPath} does not exist!`);
      return [];
    }
    
    // Get all markdown files
    const files = fs.readdirSync(directoryPath);
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    
    console.log(`Found ${markdownFiles.length} markdown files.`);
    
    // Load content from each file
    const documents = [];
    
    for (const file of markdownFiles) {
      const filePath = path.join(directoryPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(file, '.md');
      
      documents.push({
        name: fileName,
        content: content
      });
      
      console.log(`Loaded ${fileName}.md (${content.length} characters)`);
    }
    
    return documents;
  } catch (error) {
    console.error("Error loading documents:", error);
    return [];
  }
}

// Function to ask a question using OpenAI
async function askQuestion(documents, question) {
  console.log(`Question: ${question}`);
  
  try {
    // Prepare context from documents
    let context = "";
    for (const doc of documents) {
      // Add document name and first 1000 characters of content to context
      context += `Document: ${doc.name}\n${doc.content.substring(0, 1000)}\n\n`;
    }
    
    // Prepare the messages for the API call
    const messages = [
      {
        role: "system",
        content: `You are a helpful assistant for OrganicDough Donuts, an organic donut company. 
          Answer the user's question based only on the following documents.
          Be specific and detailed when the information is available in the documents.
          If the answer is not in the documents, just say "I don't have that information about OrganicDough Donuts."
          Keep your answers friendly and helpful, maintaining the company's sustainable and organic brand voice.`
      },
      {
        role: "user",
        content: `Here are documents about OrganicDough Donuts:\n\n${context}\n\nBased only on these documents, please answer this question: ${question}`
      }
    ];
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k", // Using a model with larger context
      messages: messages,
      temperature: 0.3,
      max_tokens: 500
    });
    
    const answer = response.choices[0].message.content;
    console.log("\nAnswer:", answer);
    return answer;
    
  } catch (error) {
    console.error("Error getting answer:", error);
    return "Sorry, I encountered an error while processing your question. Please try again.";
  }
}

// Create an interactive CLI interface
function createInterface(documents) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\n====================================");
  console.log("OrganicDough Donuts Q&A System");
  console.log("Ask questions about our donuts, policies, or company!");
  console.log("Type 'exit' to quit");
  console.log("====================================\n");

  const askNextQuestion = () => {
    rl.question("\nWhat would you like to know? ", async (question) => {
      if (question.toLowerCase() === 'exit') {
        console.log("Thank you for using OrganicDough Donuts Q&A System!");
        rl.close();
        return;
      }

      await askQuestion(documents, question);
      askNextQuestion();
    });
  };

  askNextQuestion();
}

async function main() {
  try {
    // Load all documents
    const documents = loadDocuments();
    
    if (documents.length === 0) {
      console.error("No documents found or error loading documents. Exiting.");
      process.exit(1);
    }
    
    // Handle command line arguments
    if (process.argv.length > 2) {
      // If question provided as command line argument
      const question = process.argv.slice(2).join(" ");
      await askQuestion(documents, question);
      process.exit(0);
    } else {
      // Start interactive mode
      createInterface(documents);
    }
  } catch (error) {
    console.error("Error in main function:", error);
    process.exit(1);
  }
}

main();
