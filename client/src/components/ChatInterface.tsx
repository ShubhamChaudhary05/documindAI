import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Brain, 
  Send, 
  Lightbulb, 
  Clock, 
  User, 
  Bot,
  Loader2
} from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  document: any;
}

type Mode = 'ask' | 'challenge';

interface Challenge {
  id: number;
  question: string;
  questionNumber: number;
  totalQuestions: number;
  userAnswer?: string;
  evaluation?: string;
  isCompleted?: boolean;
}

export function ChatInterface({ document }: ChatInterfaceProps) {
  const [mode, setMode] = useState<Mode>('ask');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message when document is loaded
    if (document) {
      setMessages([{
        role: 'assistant',
        content: "Hello! I've analyzed your document. You can now ask me anything about the content, or switch to Challenge Mode where I'll test your comprehension with thoughtful questions.",
        timestamp: new Date().toISOString()
      }]);
    }
  }, [document]);

  const askMutation = useMutation({
    mutationFn: async ({ question, docId, convId }: { question: string; docId: number; convId?: number }) => {
      const response = await apiRequest('POST', '/api/conversations/ask', {
        documentId: docId,
        question,
        conversationId: convId
      });
      return await response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setConversationId(data.conversationId);
      setCurrentQuestion('');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to get response",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });

  const startChallengeMutation = useMutation({
    mutationFn: async (docId: number) => {
      const response = await apiRequest('POST', '/api/challenges/start', {
        documentId: docId
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setChallenge({
        id: data.challengeId,
        question: data.question,
        questionNumber: data.questionNumber,
        totalQuestions: data.totalQuestions
      });
      setChallengeAnswer('');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start challenge",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ challengeId, answer }: { challengeId: number; answer: string }) => {
      const response = await apiRequest('POST', '/api/challenges/answer', {
        challengeId,
        answer
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setChallenge(prev => prev ? {
        ...prev,
        evaluation: data.evaluation,
        userAnswer: challengeAnswer,
        isCompleted: data.isCompleted,
        ...(data.nextQuestion ? {
          question: data.nextQuestion,
          questionNumber: data.nextQuestionNumber
        } : {})
      } : null);
      setChallengeAnswer('');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit answer",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'challenge' && document) {
      startChallengeMutation.mutate(document.id);
    } else {
      setChallenge(null);
    }
  };

  const handleSubmitQuestion = () => {
    if (!currentQuestion.trim() || !document) return;

    const userMessage: Message = {
      role: 'user',
      content: currentQuestion,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    askMutation.mutate({
      question: currentQuestion,
      docId: document.id,
      convId: conversationId || undefined
    });
  };

  const handleSubmitAnswer = () => {
    if (!challengeAnswer.trim() || !challenge) return;
    
    submitAnswerMutation.mutate({
      challengeId: challenge.id,
      answer: challengeAnswer
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'ask') {
        handleSubmitQuestion();
      } else {
        handleSubmitAnswer();
      }
    }
  };

  if (!document) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 transition-colors duration-300">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500 dark:text-slate-400">Upload a document to start using the AI assistant</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 transition-colors duration-300">
      {/* Mode Selection */}
      <div className="border-b border-gray-200 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
          
          <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <Button
              variant={mode === 'ask' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeChange('ask')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                mode === 'ask' 
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <MessageCircle className="mr-2" size={16} />
              Ask Anything
            </Button>
            <Button
              variant={mode === 'challenge' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeChange('challenge')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                mode === 'challenge' 
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <Brain className="mr-2" size={16} />
              Challenge Me
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="h-96 overflow-y-auto p-6 space-y-4">
        {mode === 'ask' && (
          <>
            {messages.map((message, index) => (
              <div key={index} className={`flex items-start space-x-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="text-white" size={12} />
                  </div>
                )}
                
                <div className={`rounded-lg p-4 max-w-3xl ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="text-gray-600 dark:text-slate-300" size={12} />
                  </div>
                )}
              </div>
            ))}

            {askMutation.isPending && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="text-white" size={12} />
                </div>
                <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 max-w-3xl">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-gray-600 dark:text-slate-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'challenge' && challenge && (
          <div className="space-y-4">
            {startChallengeMutation.isPending && (
              <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating challenge questions...</span>
              </div>
            )}

            {challenge && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Brain className="text-amber-600 dark:text-amber-400 mr-2" size={20} />
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                      Challenge Question {challenge.questionNumber} of {challenge.totalQuestions}
                    </h4>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    {challenge.isCompleted ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>

                <p className="text-amber-800 dark:text-amber-200 mb-4">
                  {challenge.question}
                </p>

                {challenge.evaluation && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-400">
                    <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Evaluation:</h5>
                    <p className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap">{challenge.evaluation}</p>
                  </div>
                )}

                {!challenge.isCompleted && !challenge.evaluation && (
                  <>
                    <Textarea
                      placeholder="Type your answer here..."
                      value={challengeAnswer}
                      onChange={(e) => setChallengeAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="mb-3 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors duration-200"
                      rows={3}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-amber-600 dark:text-amber-400">Take your time to think through this...</span>
                      <Button 
                        onClick={handleSubmitAnswer}
                        disabled={!challengeAnswer.trim() || submitAnswerMutation.isPending}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {submitAnswerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Submit Answer
                      </Button>
                    </div>
                  </>
                )}

                {challenge.isCompleted && (
                  <div className="text-center p-4">
                    <p className="text-amber-800 dark:text-amber-200 font-semibold">Challenge completed!</p>
                    <Button 
                      onClick={() => startChallengeMutation.mutate(document.id)}
                      className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Start New Challenge
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Only show for Ask mode */}
      {mode === 'ask' && (
        <div className="border-t border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder="Ask me anything about your document..."
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors duration-200"
                rows={2}
              />
            </div>
            <Button
              onClick={handleSubmitQuestion}
              disabled={!currentQuestion.trim() || askMutation.isPending}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              {askMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="mr-2" size={16} />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400">
              <span><Lightbulb className="mr-1" size={12} />Tip: Ask specific questions for detailed answers</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-slate-500">
              <Clock size={12} />
              <span>Avg response: 2.3s</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
