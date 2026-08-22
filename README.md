# 📘 DS Help

DS Help is a modern, fully client-side Data Science quiz and study application. It features a premium "Tech-Vibe" user interface, interactive 3D elements, and robust study tools designed to help you master Data Science concepts.

## ✨ Features

- **Study Mode**: Practice questions at your own pace. Get immediate feedback, detailed explanations, and celebrate correct answers with confetti bursts.
- **Quiz Mode**: Test your knowledge! Configure the number of questions, set an optional **time limit**, and receive a comprehensive score report with a full review of your answers.
- **Revision Hub**: 
  - **Star Questions**: Mark difficult questions (⭐) for quick access later.
  - **Custom Notes**: Add personal notes (📝) directly to questions to help you remember key concepts.
  - *All your notes and starred questions are saved automatically in your browser's LocalStorage.*
- **Tech-Vibe UI**: 
  - Stunning dark and light modes with glassmorphism effects.
  - Interactive 3D hover effects on question cards.
  - Animated gradients and custom sleek scrollbars.
- **Dynamic Content**: Questions are loaded seamlessly from local JSON files, easily expandable with new topics.

## 🚀 Getting Started

Since this project uses [Vite](https://vitejs.dev/) for blazing fast development, getting started is incredibly simple.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/AryanPachouri/DS_Help.git
   cd DS_Help
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npx vite
   ```
   *or*
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:5173` (or the URL provided in your terminal) to start studying!

## 📂 Project Structure

- `index.html`: The main layout and structure of the app.
- `style.css`: All styling, themes, animations, and responsive design.
- `main.js`: The core logic handling state, UI transitions, timers, LocalStorage, and rendering.
- `/data/`: Contains JSON files for different Data Science topics (e.g., Machine Learning, Deep Learning, Statistics).

## 🛠 Adding New Questions

To add a new topic or questions, simply create or modify a `.json` file inside the `/data/` directory. The application will automatically parse it and add it to the sidebar filters!

Example format:
```json
[
  {
    "id": 1,
    "question": "What does 'DL' stand for?",
    "difficulty": "Easy",
    "options": {
      "A": "Data Learning",
      "B": "Deep Learning"
    },
    "answer": "B",
    "explanation": "Deep Learning is a subset of Machine Learning based on artificial neural networks."
  }
]
```

## 👨‍💻 Author

**DS Help** was built with ❤️ by [Aryan Pachouri](https://github.com/AryanPachouri).

- GitHub: [@AryanPachouri](https://github.com/AryanPachouri)
- LinkedIn: [Aryan Pachouri](https://www.linkedin.com/in/aryanpachouri/)