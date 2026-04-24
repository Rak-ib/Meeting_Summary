import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { onRequest } from 'firebase-functions/v2/https';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI/Groq Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * Route: POST /generate-summary
 * Summarizes meeting notes into JSON format with Title, Summary, and Tasks
 */
app.post('/generate-summary', async (req, res) => {
  const { notes } = req.body;

  if (!notes) {
    return res.status(400).json({ error: 'Notes are required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a professional assistant. Extract a concise Title, a Summary, and structured Action Items from the notes.
          JSON Format: 
          { 
            "title": "Meeting Title", 
            "summary": "...", 
            "action_items": [
              { "text": "task description", "assignee": "name or 'Unassigned'", "deadline": "YYYY-MM-DD or 'No deadline'", "completed": false }
            ] 
          }`
        },
        {
          role: "user",
          content: notes
        }
      ],
    });

    const result = JSON.parse(response.choices[0].message.content);
    res.json(result);
    
  } catch (error) {
    console.error('OpenAI Error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * Route: POST /chat
 * Answers questions using current and past meeting context, including task status
 */
app.post('/chat', async (req, res) => {
  const { query: userQuery, currentMeeting, history } = req.body;

  if (!userQuery) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const retrievedContext = history
    ? history.slice(0, 10).map(m => {
        const tasks = m.actionItems?.map(t => `- [${t.completed ? 'DONE' : 'PENDING'}] ${t.text} (Assignee: ${t.assignee}, Deadline: ${t.deadline})`).join('\n');
        return `Meeting ID: ${m.id}\nMeeting: ${m.title || "Untitled"}\nDate: ${m.createdAt}\nTasks:\n${tasks}`;
      }).join('\n---\n')
    : "No past context available";

  const prompt = `
You are an AI Meeting Intelligence Assistant. 

Your job is to answer queries AND perform actions by returning structured commands.

RESPONSE FORMAT (JSON):
{
  "answer": "Your human-readable response here",
  "actions": [
    { "type": "UPDATE_TITLE", "payload": "New Header Name" },
    { "type": "UPDATE_TASK", "payload": { "taskId": 0, "completed": true } },
    { "type": "DELETE_MEETINGS", "payload": ["id1", "id2"] }
  ]
}

---------------------
CURRENT MEETING SUMMARY:
${currentMeeting || "None selected"}

---------------------
PAST MEETING RECORDS & TASK STATUS:
${retrievedContext}

---------------------
USER QUESTION:
${userQuery}

---------------------
INSTRUCTIONS:
1. If the user asks to "update the database," "change the header," "mark something as done," or "DELETE/REMOVE" a record, include the appropriate action in the "actions" array.
2. For DELETE_MEETINGS: The payload MUST be an array of Meeting IDs.
3. Keep the "answer" friendly and explain what you are updating or proposing to delete.
4. If no update is requested, leave "actions" as an empty array [].
5. ALWAYS RETURN VALID JSON.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an expert meeting analyst and project manager. You communicate strictly in JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content);
    res.json(result);
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to get answer from agent' });
  }
});

// Export for Firebase Functions
export const api = onRequest({ region: "us-central1", memory: "256MiB" }, app);

// Local development
if (process.env.NODE_ENV !== 'production' && !process.env.FUNCTIONS_EMULATOR) {
  app.listen(port, async () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}
