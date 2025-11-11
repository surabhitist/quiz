const scriptURL =
  "https://script.google.com/macros/s/AKfycbyr9f_YmLpXcKHfqkaTuf9n5pTeao81uznDUz9MW98-4QZr0pLSDbqXmmHkSUxK9SjX/exec";

let questions = [];
let currentQuestion = 0;
let score = 0;
let userName = "";
let userEmail = "";
let userAnswers = [];

const startBtn = document.getElementById("startBtn");
const beginQuizBtn = document.getElementById("beginQuizBtn");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");

const userSection = document.getElementById("user-section");
const instructionsSection = document.getElementById("instructions-section");
const quizSection = document.getElementById("quiz-section");
const resultSection = document.getElementById("result-section");

// ----------------------
// Utility: Shuffle
// ----------------------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ----------------------
// Utility: Attempt management
// ----------------------
function getAttempts(email) {
  const data = JSON.parse(localStorage.getItem("quizAttempts") || "{}");
  return data[email] || 0;
}
function incrementAttempts(email) {
  const data = JSON.parse(localStorage.getItem("quizAttempts") || "{}");
  data[email] = (data[email] || 0) + 1;
  localStorage.setItem("quizAttempts", JSON.stringify(data));
}

// ----------------------
// Start Button - Show Instructions First
// ----------------------
startBtn.addEventListener("click", async () => {
  userName = document.getElementById("name").value.trim();
  userEmail = document.getElementById("email").value.trim();

  if (!userName || !userEmail) {
    alert("Please enter both name and email.");
    return;
  }

  const attempts = getAttempts(userEmail);
  if (attempts >= 2) {
    alert(
      "You have already completed your 2 attempts. You cannot retake the quiz."
    );
    return;
  }

  // Fetch questions before showing instructions
  try {
    const res = await fetch(`${scriptURL}?action=getQuestions`);
    questions = await res.json();

    if (!questions || !questions.length) {
      alert("No questions found in Google Sheet!");
      return;
    }

    // Shuffle questions
    questions = shuffleArray(questions);

    // Show instructions section
    userSection.classList.add("hidden");
    instructionsSection.classList.remove("hidden");
  } catch (err) {
    console.error("Error loading quiz:", err);
    alert("Could not connect to server. Please try again later.");
  }
});

// ----------------------
// Begin Quiz from Instructions
// ----------------------
beginQuizBtn.addEventListener("click", () => {
  instructionsSection.classList.add("hidden");
  quizSection.classList.remove("hidden");

  currentQuestion = 0;
  score = 0;
  userAnswers = [];

  showQuestion();
  incrementAttempts(userEmail);
});

// ----------------------
// Go Back to Login
// ----------------------
backBtn.addEventListener("click", () => {
  instructionsSection.classList.add("hidden");
  userSection.classList.remove("hidden");
});

// ----------------------
// Show Question
// ----------------------
function showQuestion() {
  const q = questions[currentQuestion];
  document.getElementById("question-number").innerText = `Question ${
    currentQuestion + 1
  }`;
  document.getElementById("question-text").innerText = q.question;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  q.options.forEach((opt, i) => {
    if (opt && opt.toString().trim() !== "") {
      const label = document.createElement("label");
      label.classList.add("option-label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = String.fromCharCode(65 + i);

      const span = document.createElement("span");
      span.innerText = opt;
      span.classList.add("option-text");

      label.appendChild(checkbox);
      label.appendChild(span);
      optionsDiv.appendChild(label);
    }
  });

  nextBtn.innerText =
    currentQuestion === questions.length - 1 ? "Submit" : "Next";
}

// ----------------------
// Next / Submit
// ----------------------
nextBtn.addEventListener("click", async () => {
  const selected = Array.from(
    document.querySelectorAll("input[type='checkbox']:checked")
  ).map((cb) => cb.value);

  if (selected.length === 0) {
    alert("Please select at least one option before continuing.");
    return;
  }

  userAnswers.push(selected);

  const correct = questions[currentQuestion].correct || [];
  const hasCorrect = selected.some((s) => correct.includes(s));
  const hasWrong = selected.some((s) => !correct.includes(s));

  if (selected.length > 0 && hasCorrect && !hasWrong) {
    score++;
  }

  currentQuestion++;

  if (currentQuestion < questions.length) {
    showQuestion();
  } else {
    await submitQuiz();
  }
});

// ----------------------
// Submit Quiz
// ----------------------
async function submitQuiz() {
  quizSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
  document.getElementById("score").innerText = `${score} / ${questions.length}`;

  const correctAnswers = questions.map((q) => q.correct || []);

  try {
    await fetch(scriptURL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveResult",
        name: userName,
        email: userEmail,
        score,
        total: questions.length,
        answers: userAnswers,
        correctAnswers: correctAnswers,
      }),
    });
  } catch (err) {
    console.error("Error saving result:", err);
  }

  if (!resultSection.querySelector("#view-answers-btn")) {
    const answersBtn = document.createElement("button");
    answersBtn.id = "view-answers-btn";
    answersBtn.innerText = "View Answers";
    answersBtn.classList.add("btn", "primary");
    answersBtn.style.marginTop = "12px";
    resultSection.querySelector(".controls-row").appendChild(answersBtn);

    const answersContainer = document.createElement("div");
    answersContainer.id = "answers-container";
    answersContainer.classList.add("hidden");
    answersContainer.style.marginTop = "20px";
    resultSection.appendChild(answersContainer);

    answersBtn.addEventListener("click", () => {
      if (answersContainer.classList.contains("hidden")) {
        showAnswers(answersContainer);
        answersContainer.classList.remove("hidden");
        answersBtn.innerText = "Hide Answers";
      } else {
        answersContainer.classList.add("hidden");
        answersContainer.innerHTML = "";
        answersBtn.innerText = "View Answers";
      }
    });
  }
}

// ----------------------
// Show Answers
// ----------------------
function showAnswers(container) {
  container.innerHTML = "";

  questions.forEach((q, index) => {
    const userAns = userAnswers[index] || [];
    const correctAns = q.correct || [];

    const block = document.createElement("div");
    block.style.marginBottom = "16px";
    block.style.padding = "12px";
    block.style.border = "1px solid rgba(255,255,255,0.08)";
    block.style.borderRadius = "8px";
    block.style.background = "rgba(255,255,255,0.03)";

    const qText = document.createElement("div");
    qText.innerHTML = `<strong>Q${index + 1}:</strong> ${q.question}`;
    qText.style.marginBottom = "8px";
    block.appendChild(qText);

    q.options.forEach((opt, i) => {
      if (!opt || opt.toString().trim() === "") return;

      const optCode = String.fromCharCode(65 + i);
      const line = document.createElement("div");
      line.style.marginLeft = "12px";
      line.style.padding = "4px 0";

      const labelSpan = document.createElement("span");
      labelSpan.innerText = `${optCode}. `;
      labelSpan.style.fontWeight = "600";
      line.appendChild(labelSpan);

      const textSpan = document.createElement("span");
      textSpan.innerText = opt;
      line.appendChild(textSpan);

      const pickedByUser = userAns.includes(optCode);
      const isCorrectOption = correctAns.includes(optCode);

      if (isCorrectOption) {
        line.style.color = "#00c853";
        if (pickedByUser) {
          line.style.fontWeight = "700";
          line.style.textDecoration = "underline";
        }
      } else if (pickedByUser && !isCorrectOption) {
        line.style.color = "#ff0000";
        line.style.fontWeight = "600";
      } else {
        line.style.color = "#ffffff";
      }

      block.appendChild(line);
    });

    container.appendChild(block);
  });

  const summary = document.createElement("div");
  summary.style.margin = "8px 0 16px";
  summary.innerHTML = `<strong>Your score:</strong> ${score} / ${questions.length}`;
  container.prepend(summary);
}

// ----------------------
// Restart Quiz
// ----------------------
restartBtn.addEventListener("click", () => {
  location.reload();
});
