// script.js
const scriptURL =
  "https://script.google.com/macros/s/AKfycbzjHyIiKyREItsYPnel90fh3FziniTXI3NsxEMdw6FP6sX8vg77ObR7LkVp7jXWsyZr/exec";

let questions = []; // array of question objects { question, options[], correct[] }
let currentQuestion = 0;
let score = 0;
let userName = "";
let userEmail = "";
let userAnswers = []; // array of arrays, each inner array contains chosen letters like ["A","C"]

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");

const userSection = document.getElementById("user-section");
const quizSection = document.getElementById("quiz-section");
const resultSection = document.getElementById("result-section");

// ----------------------
// Utility: Fisher-Yates shuffle
// ----------------------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

    if (!questions || !questions.length) {
      alert("No questions found in Google Sheet!");
      return;
    }

    // Shuffle questions each time
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
    if (opt && opt.toString().trim() !== "") {
      const label = document.createElement("label");
      label.classList.add("option-label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = String.fromCharCode(65 + i); // 'A','B','C',...
      checkbox.setAttribute(
        "aria-label",
        `Option ${String.fromCharCode(65 + i)}`
      );

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
// NEXT / SUBMIT (multi-correct logic + mandatory)
// ----------------------
nextBtn.addEventListener("click", async () => {
  const selected = Array.from(
    document.querySelectorAll("input[type='checkbox']:checked")
  ).map((cb) => cb.value);

  // Mandatory: must select at least one
  if (selected.length === 0) {
    alert("Please select at least one option before continuing.");
    return;
  }

  // Save user's selected letters for this question
  userAnswers.push(selected);

  // Multi-correct logic:
  // If user selected any correct option AND selected no wrong options -> correct (1 mark)
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
// SUBMIT QUIZ
// ----------------------
async function submitQuiz() {
  // Hide quiz, show result
  quizSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
  document.getElementById("score").innerText = `${score} / ${questions.length}`;

  // Prepare correctAnswers array aligned with the (shuffled) questions
  const correctAnswers = questions.map((q) => q.correct || []);

  // Send to server (answers and correctAnswers)
  try {
    await fetch(scriptURL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveResult",
        name: userName,
        email: userEmail,
        score,
        total: questions.length,
        answers: userAnswers, // array of arrays like [["A"],["B","C"],...]
        correctAnswers: correctAnswers, // array of arrays
      }),
    });
  } catch (err) {
    console.error("Error saving result:", err);
  }

  // Add "View Answers" button (if not already present)
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
// SHOW ANSWERS (UI) — shows user's selections and correct answers
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

      // Show label letter + option text
      const labelSpan = document.createElement("span");
      labelSpan.innerText = `${optCode}. `;
      labelSpan.style.fontWeight = "600";
      line.appendChild(labelSpan);

      const textSpan = document.createElement("span");
      textSpan.innerText = opt;
      line.appendChild(textSpan);

      // Determine styling: green for correct option; underline if user picked it;
      // blue for user-picked wrong (so user can see what they clicked)
      const pickedByUser = userAns.includes(optCode);
      const isCorrectOption = correctAns.includes(optCode);

      if (isCorrectOption) {
        // correct option — green text
        line.style.color = "#00c853"; // green
        if (pickedByUser) {
          line.style.fontWeight = "700";
          line.style.textDecoration = "underline";
        }
      } else if (pickedByUser && !isCorrectOption) {
        // wrong option that user picked — blue
        line.style.color = "#ff0000";
        line.style.fontWeight = "600";
      } else {
        // neutral
        line.style.color = "#ffffff";
      }

      block.appendChild(line);
    });

    container.appendChild(block);
  });

  // Optionally add a summary header with score
  const summary = document.createElement("div");
  summary.style.margin = "8px 0 16px";
  summary.innerHTML = `<strong>Your score:</strong> ${score} / ${questions.length}`;
  container.prepend(summary);
}

// ----------------------
// RESTART QUIZ
// ----------------------
restartBtn.addEventListener("click", () => {
  location.reload();
});
