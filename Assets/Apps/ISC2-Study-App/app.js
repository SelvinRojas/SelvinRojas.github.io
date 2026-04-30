// ==========================================
// 1. State Management (The App's Brain)
// ==========================================
let allQuestions = [];
let currentQuest = [];
let currentQuestionIndex = 0;
let currentScore = 0;

// User Stats stored in LocalStorage
let userStats = {
    xp: 0,
    streak: 0,
    lastLoginDate: null,
    history: [],
    mastery: {
        area1: { correct: 0, total: 0 },
        area2: { correct: 0, total: 0 },
        area3: { correct: 0, total: 0 }
    }
};

// ==========================================
// 2. DOM Elements (Connecting to HTML)
// ==========================================
const views = {
    dashboard: document.getElementById('dashboard-view'),
    quiz: document.getElementById('quiz-view'),
    results: document.getElementById('results-view')
};

// Buttons
const btnStart = document.getElementById('start-quest-btn');
const btnNext = document.getElementById('next-btn');
const btnReturnHome = document.getElementById('return-home-btn');
const btnRetry = document.getElementById('retry-quest-btn');

// ==========================================
// 3. Initialization & LocalStorage
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadUserStats();
    calculateStreak();
    updateDashboardUI();
    fetchQuestions();

    // Event Listeners
    btnStart.addEventListener('click', startQuest);
    btnNext.addEventListener('click', loadNextQuestion);
    btnReturnHome.addEventListener('click', () => showView('dashboard'));
    btnRetry.addEventListener('click', startQuest);
});

function loadUserStats() {
    const saved = localStorage.getItem('cpaQuestStats');
    if (saved) {
        userStats = JSON.parse(saved);
    }
}

function saveUserStats() {
    localStorage.setItem('cpaQuestStats', JSON.stringify(userStats));
    updateDashboardUI();
}

// ==========================================
// 4. Gamification Logic (Streaks & Ranks)
// ==========================================
function calculateStreak() {
    const today = new Date().toDateString();
    
    if (userStats.lastLoginDate === today) return; // Already logged in today
    
    if (userStats.lastLoginDate) {
        const lastLogin = new Date(userStats.lastLoginDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastLogin.toDateString() === yesterday.toDateString()) {
            userStats.streak += 1; // Logged in yesterday, increment streak
        } else {
            userStats.streak = 1; // Streak broken, reset to 1
        }
    } else {
        userStats.streak = 1; // First time ever
    }
    
    userStats.lastLoginDate = today;
    saveUserStats();
}

function getRank(xp) {
    if (xp >= 500) return "🧙‍♂️ Grand Archmage [Partner]";
    if (xp >= 300) return "🐉 Dragon Slayer [Manager]";
    if (xp >= 150) return "🛡️ Paladin of Compliance [Senior]";
    if (xp >= 50) return "🧙‍♂️ Apprentice of Spreadsheets [Staff]";
    return "🧝‍♂️ Workpaper Elf [Intern]";
}

function updateDashboardUI() {
    document.getElementById('streak-count').innerText = userStats.streak;
    document.getElementById('user-rank').innerText = getRank(userStats.xp);
    
    // Calculate Mastery Percentages
    const calcWidth = (correct, total) => total === 0 ? 0 : Math.round((correct / total) * 100);
    
    document.getElementById('progress-area-1').style.width = `${calcWidth(userStats.mastery.area1.correct, userStats.mastery.area1.total)}%`;
    document.getElementById('progress-area-2').style.width = `${calcWidth(userStats.mastery.area2.correct, userStats.mastery.area2.total)}%`;
    document.getElementById('progress-area-3').style.width = `${calcWidth(userStats.mastery.area3.correct, userStats.mastery.area3.total)}%`;
}

// ==========================================
// 5. Quiz Engine Logic
// ==========================================
async function fetchQuestions() {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        allQuestions = data.questions;
    } catch (error) {
        console.error("Failed to load the Ancient Scrolls (JSON):", error);
        document.getElementById('question-text').innerText = "Error loading questions. Ensure you are running a local server.";
    }
}

function showView(viewName) {
    Object.values(views).forEach(view => view.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

function startQuest() {
    // Shuffle and pick 5 questions for a quick quest
    currentQuest = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);
    currentQuestionIndex = 0;
    currentScore = 0;
    
    showView('quiz');
    renderQuestion();
}

function renderQuestion() {
    // Reset UI
    const q = currentQuest[currentQuestionIndex];
    document.getElementById('feedback-container').classList.add('hidden');
    btnNext.classList.add('hidden');
    document.getElementById('question-counter').innerText = `Scroll ${currentQuestionIndex + 1} of ${currentQuest.length}`;
    
    // Scenario Logic
    const scenarioBox = document.getElementById('scenario-container');
    if (q.scenario) {
        scenarioBox.classList.remove('hidden');
        document.getElementById('scenario-text').innerText = q.scenario;
    } else {
        scenarioBox.classList.add('hidden');
    }

    // Question Text
    document.getElementById('question-text').innerText = q.question;

    // Options Rendering
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; // Clear old buttons

    const isMSQ = q.correctAnswer.length > 1;

    q.options.forEach((optText, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.innerText = optText;
        
        btn.addEventListener('click', () => {
            if (!isMSQ) {
                // MCQ: Evaluate immediately
                evaluateAnswer([index]);
            } else {
                // MSQ: Toggle selection
                btn.classList.toggle('selected');
                checkMsqSubmission();
            }
        });
        optionsContainer.appendChild(btn);
    });

    // If MSQ, add a Submit button
    if (isMSQ) {
        const submitBtn = document.createElement('button');
        submitBtn.classList.add('primary-btn');
        submitBtn.id = 'msq-submit-btn';
        submitBtn.innerText = 'Cast Spell (Submit MSQ)';
        submitBtn.addEventListener('click', () => {
            const selectedIndices = Array.from(optionsContainer.children)
                .map((btn, idx) => btn.classList.contains('selected') ? idx : -1)
                .filter(idx => idx !== -1);
            evaluateAnswer(selectedIndices);
            submitBtn.classList.add('hidden');
        });
        optionsContainer.appendChild(submitBtn);
    }
}

function evaluateAnswer(selectedIndices) {
    const q = currentQuest[currentQuestionIndex];
    const optionsBtns = document.querySelectorAll('.option-btn');
    
    // Disable all buttons
    optionsBtns.forEach(btn => btn.disabled = true);
    
    // Check if correct
    const isCorrect = 
        selectedIndices.length === q.correctAnswer.length && 
        selectedIndices.every(val => q.correctAnswer.includes(val));

    // UI Updates
    const feedbackBox = document.getElementById('feedback-container');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackText = document.getElementById('feedback-text');
    
    feedbackBox.classList.remove('hidden', 'success', 'error');
    
    // Update Mastery Tracking
    const areaKey = q.contentArea.includes("Area I") ? 'area1' : q.contentArea.includes("Area II") ? 'area2' : 'area3';
    userStats.mastery[areaKey].total += 1;

    if (isCorrect) {
        currentScore++;
        userStats.xp += 10; // 10 XP per correct answer
        userStats.mastery[areaKey].correct += 1;
        
        selectedIndices.forEach(idx => optionsBtns[idx].classList.add('correct'));
        feedbackBox.classList.add('success');
        feedbackTitle.innerText = "✨ Correct!";
        
        // Use the first correct explanation (or combine them if MSQ)
        feedbackText.innerText = q.explanations[selectedIndices[0]];
    } else {
        views.quiz.classList.remove('shake'); // Reset animation
        void views.quiz.offsetWidth; // Trigger reflow
        views.quiz.classList.add('shake'); // Shake screen
        
        selectedIndices.forEach(idx => optionsBtns[idx].classList.add('incorrect'));
        // Show where the correct answers were
        q.correctAnswer.forEach(idx => optionsBtns[idx].classList.add('correct'));
        
        feedbackBox.classList.add('error');
        feedbackTitle.innerText = "🧟 Material Weakness Detected!";
        // Show explanation for the trap they fell into (using the first wrong choice clicked)
        const wrongChoice = selectedIndices.find(idx => !q.correctAnswer.includes(idx));
        feedbackText.innerText = wrongChoice !== undefined ? q.explanations[wrongChoice] : "Incomplete spell cast.";
    }

    document.getElementById('auth-lit-text').innerText = q.authoritativeLiterature;
    btnNext.classList.remove('hidden');
    saveUserStats();
}

function loadNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuest.length) {
        renderQuestion();
    } else {
        showResults();
    }
}

// ==========================================
// 6. The Victory Hall (Results)
// ==========================================
function showResults() {
    showView('results');
    
    const percentage = Math.round((currentScore / currentQuest.length) * 100);
    document.getElementById('final-score-display').innerText = `${percentage}%`;
    
    const rankMsg = document.getElementById('rank-update-message');
    rankMsg.innerText = `You earned ${currentScore * 10} XP! Your rank is currently: ${getRank(userStats.xp)}`;
    
    // The Magic Confetti Spell
    if (percentage === 100) {
        rankMsg.innerText += " Flawless Victory!";
        triggerConfetti();
    } else if (percentage >= 75) {
        confetti({ particleCount: 50, spread: 40 }); // Small burst for passing
    }
}

function triggerConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));
        confetti(Object.assign({}, defaults, { particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
    }, 250);
}