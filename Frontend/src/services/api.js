const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const summarizeNotes = async (notes) => {
  try {
    const response = await fetch(`${API_URL}/generate-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to summarize notes');
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const askAgent = async (query, currentMeeting, history) => {
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, currentMeeting, history }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get answer from agent');
    }

    return await response.json();
  } catch (error) {
    console.error("Agent API Error:", error);
    throw error;
  }
};
