import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI/Grok Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * Route: POST /generate-summary
 * Summarizes meeting notes into JSON format
 */
app.post('/generate-summary', async (req, res) => {
  const { notes } = req.body;

  if (!notes) {
    return res.status(400).json({ error: 'Notes are required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Using a stable Groq model
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a professional assistant. Summarize the meeting notes and extract action items in JSON format: { \"summary\": \"\", \"action_items\": [] }"
        },
        {
          role: "user",
          content: notes
        }
      ],
    });

    // OpenAI returns a string, so we parse it into a JSON object
    const result = JSON.parse(response.choices[0].message.content);
    res.json(result);
    
  } catch (error) {
    console.error('OpenAI Error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

app.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);
  
  // Debug: List available models to find the correct name
  try {
    const models = await openai.models.list();
    console.log('Available Groq models:', models.data.map(m => m.id));
  } catch (err) {
    console.error('Could not list models:', err.message);
  }
});
