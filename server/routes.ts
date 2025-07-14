import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertDocumentSchema, insertConversationSchema, insertChallengeSchema } from "@shared/schema";
import multer from "multer";
import * as fs from "fs";
import pdfParse from "pdf-parse";

// Extend Request type to include file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
import { summarizeDocument, answerQuestion, generateChallengeQuestions, evaluateAnswer } from "./services/openai";

const upload = multer({ dest: 'uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload document endpoint
  app.post("/api/documents/upload", upload.single('document'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      let content: string;

      // Extract text based on file type
      if (file.mimetype === 'application/pdf') {
        const buffer = fs.readFileSync(file.path);
        const data = await pdfParse(buffer);
        content = data.text;
      } else if (file.mimetype === 'text/plain') {
        content = fs.readFileSync(file.path, 'utf-8');
      } else {
        fs.unlinkSync(file.path); // Clean up
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF or TXT files." });
      }

      // Clean up uploaded file
      fs.unlinkSync(file.path);

      if (!content.trim()) {
        return res.status(400).json({ error: "Document appears to be empty or unreadable" });
      }

      // Generate summary (with fallback handling)
      let summary: string;
      try {
        summary = await summarizeDocument(content);
      } catch (error) {
        console.error("Summary generation failed, using fallback:", error);
        summary = `Document uploaded successfully. Summary temporarily unavailable due to AI service issues. The document contains approximately ${Math.round(content.length / 6)} words and is ready for analysis.`;
      }

      // Store document
      const document = await storage.createDocument({
        filename: file.originalname,
        content,
        summary
      });

      res.json({ 
        document: {
          id: document.id,
          filename: document.filename,
          summary: document.summary,
          uploadedAt: document.uploadedAt
        }
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to process document" });
    }
  });

  // Get document by ID
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json({ document });
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({ error: "Failed to retrieve document" });
    }
  });

  // Ask question endpoint
  app.post("/api/conversations/ask", async (req, res) => {
    try {
      const { documentId, question, conversationId } = req.body;

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Get existing conversation or create new one
      let conversation;
      if (conversationId) {
        conversation = await storage.getConversation(conversationId);
      }

      if (!conversation) {
        conversation = await storage.createConversation({
          documentId,
          mode: 'ask',
          messages: []
        });
      }

      // Get AI response
      const answer = await answerQuestion(document.content, question, conversation.messages);

      // Update conversation with new messages
      const updatedMessages = [
        ...conversation.messages,
        JSON.stringify({ role: 'user', content: question, timestamp: new Date().toISOString() }),
        JSON.stringify({ role: 'assistant', content: answer, timestamp: new Date().toISOString() })
      ];

      await storage.updateConversation(conversation.id, { messages: updatedMessages });

      res.json({ 
        answer,
        conversationId: conversation.id
      });
    } catch (error) {
      console.error("Ask question error:", error);
      res.status(500).json({ error: "Failed to process question" });
    }
  });

  // Start challenge mode
  app.post("/api/challenges/start", async (req, res) => {
    try {
      const { documentId } = req.body;

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Generate challenge questions
      const questions = await generateChallengeQuestions(document.content);

      const challenge = await storage.createChallenge({
        documentId,
        questions,
        userAnswers: [],
        evaluations: [],
        currentQuestion: 0,
        completed: false
      });

      res.json({ 
        challengeId: challenge.id,
        question: questions[0],
        questionNumber: 1,
        totalQuestions: questions.length
      });
    } catch (error) {
      console.error("Start challenge error:", error);
      res.status(500).json({ error: "Failed to start challenge" });
    }
  });

  // Submit challenge answer
  app.post("/api/challenges/answer", async (req, res) => {
    try {
      const { challengeId, answer } = req.body;

      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      const document = await storage.getDocument(challenge.documentId!);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const currentQuestionIndex = challenge.currentQuestion ?? 0;
      const currentQuestion = challenge.questions[currentQuestionIndex];
      
      // Evaluate the answer
      const evaluation = await evaluateAnswer(document.content, currentQuestion, answer);

      // Update challenge with answer and evaluation
      const updatedAnswers = [...(challenge.userAnswers ?? []), answer];
      const updatedEvaluations = [...(challenge.evaluations ?? []), evaluation];
      const nextQuestion = currentQuestionIndex + 1;
      const isCompleted = nextQuestion >= challenge.questions.length;

      await storage.updateChallenge(challengeId, {
        userAnswers: updatedAnswers,
        evaluations: updatedEvaluations,
        currentQuestion: nextQuestion,
        completed: isCompleted
      });

      const response: any = {
        evaluation,
        isCompleted,
        questionNumber: currentQuestionIndex + 1,
        totalQuestions: challenge.questions.length
      };

      if (!isCompleted) {
        response.nextQuestion = challenge.questions[nextQuestion];
        response.nextQuestionNumber = nextQuestion + 1;
      }

      res.json(response);
    } catch (error) {
      console.error("Submit answer error:", error);
      res.status(500).json({ error: "Failed to evaluate answer" });
    }
  });

  // Get challenge status
  app.get("/api/challenges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const challenge = await storage.getChallenge(id);
      
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      res.json({ challenge });
    } catch (error) {
      console.error("Get challenge error:", error);
      res.status(500).json({ error: "Failed to retrieve challenge" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
