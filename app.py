from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import tempfile
import PyPDF2
import google.generativeai as genai
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configure upload settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'txt'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize Gemini client
genai.configure(api_key=os.getenv('GEMINI_API_KEY', 'your-api-key-here'))
model = genai.GenerativeModel('gemini-1.5-flash')

# In-memory storage (replace with database in production)
documents = {}
conversations = {}
challenges = {}
next_doc_id = 1
next_conv_id = 1
next_challenge_id = 1

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_path):
    """Extract text content from a PDF file."""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
    except Exception as e:
        raise Exception(f"Error reading PDF: {str(e)}")

def extract_text_from_txt(file_path):
    """Extract text content from a TXT file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read().strip()
    except Exception as e:
        raise Exception(f"Error reading TXT file: {str(e)}")

def summarize_document(content):
    """Generate a summary of the document using Gemini."""
    try:
        prompt = f"""You are a document summarization expert. Create a concise summary that captures the main points and key insights of this document. Keep the summary under 150 words.

Document:
{content}

Please provide a concise summary (maximum 150 words):"""
        
        response = model.generate_content(prompt)
        return response.text or "Unable to generate summary"
    except Exception as e:
        print(f"Summarization error: {e}")
        raise Exception("Failed to generate document summary")

def answer_question(document_content, question, conversation_history):
    """Answer a question based on document content and conversation history."""
    try:
        history_context = '\n'.join([
            f"{msg['role']}: {msg['content']}" 
            for msg in conversation_history
        ])

        prompt = f"""You are an intelligent document analysis assistant. Answer questions based ONLY on the provided document content. Always include specific references to sections, paragraphs, or quotes from the document to justify your answers. If the document doesn't contain information to answer the question, clearly state that. Format your response with the answer followed by a reference section.

Document content:
{document_content}

Previous conversation:
{history_context}

New question: {question}

Please provide your answer with specific references to the document:"""

        response = model.generate_content(prompt)
        return response.text or "Unable to provide answer"
    except Exception as e:
        print(f"Question answering error: {e}")
        raise Exception("Failed to answer question")

def generate_challenge_questions(document_content):
    """Generate challenge questions based on document content."""
    try:
        prompt = f"""You are an expert at creating thoughtful comprehension questions. Generate exactly 3 challenging questions that test deep understanding, critical thinking, and inference skills based on the document content. Questions should require more than simple recall and should encourage analysis and reasoning.

Document:
{document_content}

Please create 3 challenging comprehension questions and return them as a JSON object in this exact format:
{{"questions": ["Question 1?", "Question 2?", "Question 3?"]}}

Make sure to return only valid JSON:"""

        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Try to extract JSON from the response
        try:
            # Look for JSON object in the response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx != -1 and end_idx != -1:
                json_str = response_text[start_idx:end_idx]
                result = json.loads(json_str)
                return result.get("questions", [])
        except:
            pass
        
        # Fallback: try to parse the entire response
        result = json.loads(response_text)
        return result.get("questions", [])
        
    except Exception as e:
        print(f"Question generation error: {e}")
        # Return some default questions as fallback
        return [
            "What are the main themes or key points discussed in this document?",
            "How do the ideas presented relate to or build upon each other?",
            "What conclusions can you draw from the information provided?"
        ]

def evaluate_answer(document_content, question, user_answer):
    """Evaluate a user's answer to a challenge question."""
    try:
        prompt = f"""You are an expert evaluator of comprehension answers. Evaluate the user's answer based on accuracy, depth of understanding, and how well it addresses the question. Provide constructive feedback, highlight what was done well, and suggest improvements. Always reference specific parts of the document to support your evaluation.

Document content:
{document_content}

Question: {question}

User's answer: {user_answer}

Please provide a detailed evaluation with constructive feedback:"""

        response = model.generate_content(prompt)
        return response.text or "Unable to evaluate answer"
    except Exception as e:
        print(f"Answer evaluation error: {e}")
        raise Exception("Failed to evaluate answer")

@app.route('/api/documents/upload', methods=['POST'])
def upload_document():
    """Handle document upload and processing."""
    global next_doc_id
    
    try:
        if 'document' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['document']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Unsupported file type. Please upload PDF or TXT files."}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(temp_path)
        
        try:
            # Extract text based on file type
            if filename.lower().endswith('.pdf'):
                content = extract_text_from_pdf(temp_path)
            else:  # .txt
                content = extract_text_from_txt(temp_path)
            
            # Clean up temp file
            os.remove(temp_path)
            
            if not content.strip():
                return jsonify({"error": "Document appears to be empty or unreadable"}), 400
            
            # Generate summary
            summary = summarize_document(content)
            
            # Store document
            doc_id = next_doc_id
            next_doc_id += 1
            
            document = {
                "id": doc_id,
                "filename": filename,
                "content": content,
                "summary": summary,
                "uploadedAt": datetime.now().isoformat()
            }
            
            documents[doc_id] = document
            
            return jsonify({
                "document": {
                    "id": document["id"],
                    "filename": document["filename"],
                    "summary": document["summary"],
                    "uploadedAt": document["uploadedAt"]
                }
            })
            
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/documents/<int:doc_id>', methods=['GET'])
def get_document(doc_id):
    """Get document by ID."""
    document = documents.get(doc_id)
    if not document:
        return jsonify({"error": "Document not found"}), 404
    
    return jsonify({"document": document})

@app.route('/api/conversations/ask', methods=['POST'])
def ask_question():
    """Handle question asking in conversation mode."""
    global next_conv_id
    
    try:
        data = request.get_json()
        document_id = data.get('documentId')
        question = data.get('question')
        conversation_id = data.get('conversationId')
        
        document = documents.get(document_id)
        if not document:
            return jsonify({"error": "Document not found"}), 404
        
        # Get existing conversation or create new one
        conversation = None
        if conversation_id:
            conversation = conversations.get(conversation_id)
        
        if not conversation:
            conv_id = next_conv_id
            next_conv_id += 1
            conversation = {
                "id": conv_id,
                "documentId": document_id,
                "mode": "ask",
                "messages": [],
                "createdAt": datetime.now().isoformat()
            }
            conversations[conv_id] = conversation
        
        # Get AI response
        answer = answer_question(document["content"], question, conversation["messages"])
        
        # Update conversation with new messages
        conversation["messages"].extend([
            {"role": "user", "content": question, "timestamp": datetime.now().isoformat()},
            {"role": "assistant", "content": answer, "timestamp": datetime.now().isoformat()}
        ])
        
        return jsonify({
            "answer": answer,
            "conversationId": conversation["id"]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/challenges/start', methods=['POST'])
def start_challenge():
    """Start a new challenge session."""
    global next_challenge_id
    
    try:
        data = request.get_json()
        document_id = data.get('documentId')
        
        document = documents.get(document_id)
        if not document:
            return jsonify({"error": "Document not found"}), 404
        
        # Generate challenge questions
        questions = generate_challenge_questions(document["content"])
        
        challenge_id = next_challenge_id
        next_challenge_id += 1
        
        challenge = {
            "id": challenge_id,
            "documentId": document_id,
            "questions": questions,
            "userAnswers": [],
            "evaluations": [],
            "currentQuestion": 0,
            "completed": False,
            "createdAt": datetime.now().isoformat()
        }
        
        challenges[challenge_id] = challenge
        
        return jsonify({
            "challengeId": challenge_id,
            "question": questions[0] if questions else "No questions generated",
            "questionNumber": 1,
            "totalQuestions": len(questions)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/challenges/answer', methods=['POST'])
def submit_challenge_answer():
    """Submit an answer to a challenge question."""
    try:
        data = request.get_json()
        challenge_id = data.get('challengeId')
        answer = data.get('answer')
        
        challenge = challenges.get(challenge_id)
        if not challenge:
            return jsonify({"error": "Challenge not found"}), 404
        
        document = documents.get(challenge["documentId"])
        if not document:
            return jsonify({"error": "Document not found"}), 404
        
        current_question = challenge["questions"][challenge["currentQuestion"]]
        
        # Evaluate the answer
        evaluation = evaluate_answer(document["content"], current_question, answer)
        
        # Update challenge with answer and evaluation
        challenge["userAnswers"].append(answer)
        challenge["evaluations"].append(evaluation)
        challenge["currentQuestion"] += 1
        challenge["completed"] = challenge["currentQuestion"] >= len(challenge["questions"])
        
        response_data = {
            "evaluation": evaluation,
            "isCompleted": challenge["completed"],
            "questionNumber": challenge["currentQuestion"],
            "totalQuestions": len(challenge["questions"])
        }
        
        if not challenge["completed"]:
            response_data["nextQuestion"] = challenge["questions"][challenge["currentQuestion"]]
            response_data["nextQuestionNumber"] = challenge["currentQuestion"] + 1
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/challenges/<int:challenge_id>', methods=['GET'])
def get_challenge(challenge_id):
    """Get challenge by ID."""
    challenge = challenges.get(challenge_id)
    if not challenge:
        return jsonify({"error": "Challenge not found"}), 404
    
    return jsonify({"challenge": challenge})

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)