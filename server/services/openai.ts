import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your-api-key-here" 
});

export async function summarizeDocument(content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a document summarization expert. Create concise summaries that capture the main points and key insights of documents. Keep summaries under 150 words."
        },
        {
          role: "user",
          content: `Please provide a concise summary (maximum 150 words) of the following document:\n\n${content}`
        }
      ],
      max_tokens: 200
    });

    return response.choices[0].message.content || "Unable to generate summary";
  } catch (error) {
    console.error("Summarization error:", error);
    throw new Error("Failed to generate document summary");
  }
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an intelligent document analysis assistant. Answer questions based ONLY on the provided document content. Always include specific references to sections, paragraphs, or quotes from the document to justify your answers. If the document doesn't contain information to answer the question, clearly state that. Format your response with the answer followed by a reference section.

          Document content: ${documentContent}`
        },
        {
          role: "user",
          content: `Previous conversation:\n${historyContext}\n\nNew question: ${question}`
        }
      ],
      max_tokens: 800
    });

    return response.choices[0].message.content || "Unable to provide answer";
  } catch (error) {
    console.error("Question answering error:", error);
    throw new Error("Failed to answer question");
  }
}

export async function generateChallengeQuestions(documentContent: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating thoughtful comprehension questions. Generate exactly 3 challenging questions that test deep understanding, critical thinking, and inference skills based on the document content. Questions should require more than simple recall and should encourage analysis and reasoning. Return the response as a JSON object with a "questions" array.`
        },
        {
          role: "user",
          content: `Based on this document, create 3 challenging comprehension questions:\n\n${documentContent}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.questions || [];
  } catch (error) {
    console.error("Question generation error:", error);
    throw new Error("Failed to generate challenge questions");
  }
}

export async function evaluateAnswer(documentContent: string, question: string, userAnswer: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert evaluator of comprehension answers. Evaluate the user's answer based on accuracy, depth of understanding, and how well it addresses the question. Provide constructive feedback, highlight what was done well, and suggest improvements. Always reference specific parts of the document to support your evaluation.

          Document content: ${documentContent}
          
          Question: ${question}`
        },
        {
          role: "user",
          content: `Please evaluate this answer: ${userAnswer}`
        }
      ],
      max_tokens: 600
    });

    return response.choices[0].message.content || "Unable to evaluate answer";
  } catch (error) {
    console.error("Answer evaluation error:", error);
    throw new Error("Failed to evaluate answer");
  }
}
