import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Serve your HTML, CSS, and JS files ---
// This tells Express to serve all files (like script.js) from your project folder
app.use(express.static(__dirname));

// This tells Express to send 'index.html' when someone visits the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
// ----------------------------------------------

app.post("/api/finance", async (req, res) => {
  const { income, expenses } = req.body;

  const prompt = `
  You are an expert, friendly AI finance planner.
  The user earns ₹${income} per month.
  Their expenses are: ${expenses}.

  Please generate:
  1.  **Spending Summary:** A quick breakdown of their income, total expenses, and remaining surplus.
  2.  **3 Money-Saving Tips:** Provide 3 specific, actionable tips based *directly* on their expense list.
  3.  **1 Long-Term Goal Suggestion:** Suggest a creative, personalized long-term financial goal (e.g., saving for a specific online course, an investment in an index fund, a travel goal, or a down payment). **Try to avoid suggesting "emergency fund" every single time, especially if they have a healthy surplus.**
  
  Keep the whole response friendly and under 150 words.
  `;

  const generationConfig = {
    temperature: 0.7,
    topK: 40,
  };

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    });

    if (result && 
        result.candidates && 
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0 &&
        result.candidates[0].content.parts[0].text
    ) {
      const text = result.candidates[0].content.parts[0].text;
      res.json({ output: text });
    } else {
      console.error("❌ Error: No valid text found in API response.");
      console.error("Full API Result:", JSON.stringify(result, null, 2));
      res.status(500).json({ error: "AI response was empty or in an unexpected format. Check server logs." });
    }

  } catch (err) {
    console.error("❌ Error:", err);
    
    if (err.message && err.message.includes("404")) {
        console.error("--- 404 MODEL NOT FOUND ---");
        console.error("Please try changing the model name in server.js to 'gemini-pro'");
        res.status(500).json({ error: "AI model not found. Check server logs." });
    } else if (err.message && err.message.includes("API key not valid")) {
        console.error("--- INVALID API KEY ---");
        console.error("Please check your GEMINI_API_KEY in the .env file.");
        res.status(500).json({ error: "Invalid API Key. Check server logs." });
    } else {
        res.status(500).json({ error: "AI generation failed. Check server logs." });
    }
  }
});

app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));
