import { documents, conversations, challenges, type Document, type InsertDocument, type Conversation, type InsertConversation, type Challenge, type InsertChallenge } from "@shared/schema";

export interface IStorage {
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<void>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  getChallenge(id: number): Promise<Challenge | undefined>;
  updateChallenge(id: number, updates: Partial<Challenge>): Promise<void>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document>;
  private conversations: Map<number, Conversation>;
  private challenges: Map<number, Challenge>;
  private currentDocumentId: number;
  private currentConversationId: number;
  private currentChallengeId: number;

  constructor() {
    this.documents = new Map();
    this.conversations = new Map();
    this.challenges = new Map();
    this.currentDocumentId = 1;
    this.currentConversationId = 1;
    this.currentChallengeId = 1;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = {
      id,
      content: insertDocument.content,
      filename: insertDocument.filename,
      summary: insertDocument.summary ?? null,
      uploadedAt: new Date()
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const conversation: Conversation = {
      id,
      mode: insertConversation.mode,
      documentId: insertConversation.documentId ?? null,
      messages: insertConversation.messages ?? [],
      createdAt: new Date()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      this.conversations.set(id, { ...conversation, ...updates });
    }
  }

  async createChallenge(insertChallenge: InsertChallenge): Promise<Challenge> {
    const id = this.currentChallengeId++;
    const challenge: Challenge = {
      id,
      documentId: insertChallenge.documentId ?? null,
      questions: insertChallenge.questions,
      userAnswers: insertChallenge.userAnswers ?? [],
      evaluations: insertChallenge.evaluations ?? [],
      currentQuestion: insertChallenge.currentQuestion ?? 0,
      completed: insertChallenge.completed ?? false,
      createdAt: new Date()
    };
    this.challenges.set(id, challenge);
    return challenge;
  }

  async getChallenge(id: number): Promise<Challenge | undefined> {
    return this.challenges.get(id);
  }

  async updateChallenge(id: number, updates: Partial<Challenge>): Promise<void> {
    const challenge = this.challenges.get(id);
    if (challenge) {
      this.challenges.set(id, { ...challenge, ...updates });
    }
  }
}

export const storage = new MemStorage();
