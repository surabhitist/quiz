const scriptURL =
  "https://script.google.com/macros/s/AKfycbxfyaNxYqwVymfsYCMfAe9CzTG7E0t3lEqJmiHdIX7D8rnBA7VKDHEFoKUudidsXS13/exec";

let questions = [];
let currentQuestion = 0;
let score = 0;
let userName = "";
let userEmail = "";
let userAnswers = [];

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");

const userSection = document.getElementById("user-section");
const quizSection = document.getElementById("quiz-section");
const resultSection = document.getElementById("result-section");

// ----------------------
// START QUIZ
// ----------------------
startBtn.addEventListener("click", async () => {
  userName = document.getElementById("name").value.trim();
  userEmail = document.getElementById("email").value.trim();

  if (!userName || !userEmail) {
    alert("Please enter both name and email.");
    return;
  }

  try {
    const res = await fetch(`${scriptURL}?action=getQuestions`);
    questions = await res.json();

    if (!questions.length) {
      alert("No questions found in Google Sheet!");
      return;
    }

    // ✅ Shuffle questions randomly
    questions = shuffleArray(questions);

    userSection.classList.add("hidden");
    quizSection.classList.remove("hidden");

    currentQuestion = 0;
    score = 0;
    userAnswers = [];
    showQuestion();
  } catch (err) {
    console.error("Error starting quiz:", err);
    alert(
      "Could not connect to server. Check your Apps Script deployment URL."
    );
  }
});

// ----------------------
// SHUFFLE FUNCTION
// ----------------------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ----------------------
// SHOW QUESTION
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
    if (opt && opt.trim() !== "") {
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
// NEXT / SUBMIT (multi-correct logic)
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

  const correct = questions[currentQuestion].correct;
  const hasCorrect = selected.some((s) => correct.includes(s));
  const hasWrong = selected.some((s) => !correct.includes(s));

  // ✅ 1 mark if at least one correct AND no wrong
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
// SUBMIT QUIZ
// ----------------------
async function submitQuiz() {
  quizSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
  document.getElementById("score").innerText = `${score} / ${questions.length}`;

  // ✅ Save results
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
        correctAnswers: questions.map((q) => q.correct),
      }),
    });
  } catch (err) {
    console.error("Error saving result:", err);
  }

  // ✅ Add "View Answers" button
  const answersBtn = document.createElement("button");
  answersBtn.innerText = "View Answers";
  answersBtn.classList.add("btn", "primary");
  answersBtn.style.marginTop = "12px";
  resultSection.querySelector(".controls-row").appendChild(answersBtn);

  // ✅ Container to show answers
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

// ----------------------
// SHOW ANSWERS FUNCTION
// ----------------------
function showAnswers(container) {
  container.innerHTML = "";

  questions.forEach((q, index) => {
    const userAns = userAnswers[index] || [];
    const correctAns = q.correct || [];

    const block = document.createElement("div");
    block.style.marginBottom = "16px";
    block.style.padding = "12px";
    block.style.border = "1px solid rgba(255,255,255,0.1)";
    block.style.borderRadius = "8px";
    block.style.background = "rgba(255,255,255,0.05)";

    const qText = document.createElement("div");
    qText.innerHTML = `<strong>Q${index + 1}:</strong> ${q.question}`;
    qText.style.marginBottom = "8px";
    block.appendChild(qText);

    q.options.forEach((opt, i) => {
      if (!opt.trim()) return;

      const optCode = String.fromCharCode(65 + i);
      const line = document.createElement("div");
      line.innerText = opt;
      line.style.marginLeft = "12px";

      // ✅ Highlight logic
      if (correctAns.includes(optCode)) {
        line.style.color = "#00ff88"; // green for correct
        line.style.fontWeight = "600";
      }
      if (userAns.includes(optCode) && !correctAns.includes(optCode)) {
        line.style.color = "#ff0000"; // blue for user-selected wrong
      }
      if (userAns.includes(optCode) && correctAns.includes(optCode)) {
        line.style.textDecoration = "underline"; // underline correct selections
      }

      block.appendChild(line);
    });

    container.appendChild(block);
  });
}

// ----------------------
// RESTART QUIZ
// ----------------------
restartBtn.addEventListener("click", () => {
  location.reload();
});
