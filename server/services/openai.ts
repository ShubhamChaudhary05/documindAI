import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI with the API key
const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function summarizeDocument(content: string): Promise<string> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const prompt = `You are a document summarization expert. Create concise summaries that capture the main points and key insights of documents. Keep summaries under 150 words.

Please provide a concise summary (maximum 150 words) of the following document:

${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text || "Unable to generate summary - please try again later";
    } catch (error: any) {
      lastError = error;
      console.error(`Summarization attempt ${attempt} failed:`, error.message || error);
      
      // Check if it's a 503 (service overloaded) or rate limit error
      if (error.status === 503 || error.message?.includes('overloaded') || error.message?.includes('rate limit')) {
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Waiting ${delay}ms before retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        // If all retries failed, return a fallback summary instead of throwing
        return `Document uploaded successfully. Summary temporarily unavailable due to high AI service load. The document contains ${Math.round(content.length / 6)} words and has been processed for analysis.`;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  // If we get here, all retries failed
  console.error("All summarization attempts failed:", lastError);
  return `Document uploaded successfully. Summary temporarily unavailable due to AI service issues. The document has been processed and is ready for questions.`;
}

export async function answerQuestion(documentContent: string, question: string, conversationHistory: string[]): Promise<string> {
  try {
    const historyContext = conversationHistory
      .map(msg => {
        try {
          const parsed = JSON.parse(msg);
          return `${parsed.role}: ${parsed.content}`;
        } catch {
          return msg;
        }
      })
      .join('\n');

    const prompt = `You are an intelligent document analysis assistant. Answer questions based ONLY on the provided document content. Always include specific references to sections, paragraphs, or quotes from the document to justify your answers. If the document doesn't contain information to answer the question, clearly state that. Format your response with the answer followed by a reference section.

Document content: ${documentContent}

Previous conversation:
${historyContext}

New question: ${question}

Please provide a detailed answer based on the document content above.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text || "Unable to provide answer";
  } catch (error) {
    console.error("Question answering error:", error);
    throw new Error("Failed to answer question");
  }
}

export async function generateChallengeQuestions(documentContent: string): Promise<string[]> {
  try {
    const prompt = `You are an expert at creating thoughtful comprehension questions. Generate exactly 3 challenging questions that test deep understanding, critical thinking, and inference skills based on the document content. Questions should require more than simple recall and should encourage analysis and reasoning. Return the response as a JSON object with a "questions" array.

Based on this document, create 3 challenging comprehension questions:

${documentContent}

Please respond with a JSON object like: {"questions": ["question1", "question2", "question3"]}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions.slice(0, 3);
      }
    } catch {
      // Fallback: try to extract questions from text
      try {
        // Look for JSON array in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.questions && Array.isArray(parsed.questions)) {
            return parsed.questions.slice(0, 3);
          }
        }
      } catch {
        // Extract questions manually
        const lines = content.split('\n').filter(line => line.trim() && (line.includes('?') || line.match(/^\d+\.?\s*/)));
        if (lines.length >= 3) {
          return lines.slice(0, 3).map(line => line.replace(/^\d+\.?\s*/, '').trim());
        }
      }
    }
    
    // Return default questions as fallback
    return [
      "What are the main themes or key points discussed in this document?",
      "How do the ideas presented relate to or build upon each other?",
      "What conclusions can you draw from the information provided?"
    ];
  } catch (error) {
    console.error("Question generation error:", error);
    throw new Error("Failed to generate challenge questions");
  }
}

export async function evaluateAnswer(documentContent: string, question: string, userAnswer: string): Promise<string> {
  try {
    const prompt = `You are an expert evaluator of comprehension answers. Evaluate the user's answer based on accuracy, depth of understanding, and how well it addresses the question. Provide constructive feedback, highlight what was done well, and suggest improvements. Always reference specific parts of the document to support your evaluation.

Document content: ${documentContent}

Question: ${question}

Please evaluate this answer: ${userAnswer}

Provide detailed feedback on accuracy, completeness, and understanding demonstrated.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text || "Unable to evaluate answer";
  } catch (error) {
    console.error("Answer evaluation error:", error);
    throw new Error("Failed to evaluate answer");
  }
}
