# DocuMind AI - Document Analysis Assistant

A GenAI-powered document analysis application that helps users read and comprehend large documents like research papers, legal files, or technical manuals.

## Features

- **Document Upload**: Support for PDF and TXT files with drag-and-drop interface
- **Auto Summarization**: AI-generated summaries using Google Gemini
- **Ask Anything Mode**: Interactive Q&A about document content
- **Challenge Mode**: AI-generated comprehension questions with evaluation
- **Dark/Light Theme**: Toggle between themes with persistent preference

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key

## Setup for VS Code Development

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd documental-ai
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

**Note**: Despite the variable name `OPENAI_API_KEY`, this app uses Google Gemini API. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### 3. Create Required Directories

```bash
mkdir -p uploads
mkdir -p test/data
touch test/data/05-versions-space.pdf
```

### 4. VS Code Configuration

The project includes VS Code settings in `.vscode/` directory for optimal development experience.

### 5. Running the Application

```bash
# Start the development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5000
- API: http://localhost:5000/api

### 6. Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check
```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities
├── server/                 # Express backend
│   ├── routes.ts           # API routes
│   ├── storage.ts          # In-memory storage
│   └── services/           # AI services
├── shared/                 # Shared types and schemas
└── uploads/                # File upload directory
```

## API Endpoints

- `POST /api/documents/upload` - Upload and process document
- `GET /api/documents/:id` - Get document by ID
- `POST /api/conversations/ask` - Ask questions about document
- `POST /api/challenges/start` - Start challenge mode
- `POST /api/challenges/answer` - Submit challenge answer

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **AI**: Google Gemini API
- **Storage**: In-memory (development)
- **Build Tools**: Vite, ESBuild

## Troubleshooting

### Common Issues

1. **"Failed to fetch" errors**: Ensure the server is running on port 5000
2. **API key errors**: Verify your Gemini API key is correctly set in `.env`
3. **File upload failures**: Check that the `uploads/` directory exists and is writable

### Development Tips

- Use the VS Code debugger with the included launch configuration
- Hot reload is enabled for both frontend and backend
- Check browser console and terminal for error messages
- Use the included REST client files for API testing

## Contributing

1. Follow the TypeScript and ESLint configurations
2. Use the provided Prettier settings for code formatting
3. Test both upload modes before submitting changes
4. Update this README for any new setup requirements
