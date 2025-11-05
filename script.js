const scriptURL =
  "https://script.google.com/macros/s/AKfycbxfyaNxYqwVymfsYCMfAe9CzTG7E0t3lEqJmiHdIX7D8rnBA7VKDHEFoKUudidsXS13/exec"; // Replace with your Apps Script Web App URL
let questions = [];
let currentQuestion = 0;
let score = 0;
let userName = "";
let userEmail = "";

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");

// Hide/show sections
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
    // ✅ Check if user has already attempted
    const checkRes = await fetch(
      `${scriptURL}?action=checkEmail&email=${encodeURIComponent(userEmail)}`
    );
    const checkData = await checkRes.json();

    if (checkData.exists) {
      userSection.classList.add("hidden");
      resultSection.classList.remove("hidden");
      document.getElementById(
        "score"
      ).innerText = `You already attempted. Score: ${checkData.score}/${checkData.total}`;
      return;
    }

    // ✅ Fetch questions
    const res = await fetch(`${scriptURL}?action=getQuestions`);
    questions = await res.json();

    if (!questions.length) {
      alert("No questions found in Google Sheet!");
      return;
    }

    userSection.classList.add("hidden");
    quizSection.classList.remove("hidden");

    currentQuestion = 0;
    score = 0;
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
    if (opt && opt.trim() !== "") {
      const label = document.createElement("label");
      label.classList.add("option-label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = String.fromCharCode(65 + i);

      const span = document.createElement("span");
      span.innerText = opt;

      label.appendChild(checkbox);
      label.appendChild(span);
      optionsDiv.appendChild(label);
    }
  });

  nextBtn.innerText =
    currentQuestion === questions.length - 1 ? "Submit" : "Next";
}

// ----------------------
// NEXT / SUBMIT
// ----------------------
nextBtn.addEventListener("click", async () => {
  const selected = Array.from(
    document.querySelectorAll("input[type='checkbox']:checked")
  ).map((cb) => cb.value);

  const correct = questions[currentQuestion].correct;
  const hasCorrect = selected.some((opt) => correct.includes(opt));
  const hasWrong = selected.some((opt) => !correct.includes(opt));

  // ✅ 1 mark if any correct & no wrong
  if (selected.length > 0 && hasCorrect && !hasWrong) score++;

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

  try {
    await fetch(scriptURL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveResult",
        name: userName,
        email: userEmail,
        score,
        total: questions.length,
      }),
    });
  } catch (err) {
    console.error("Error saving result:", err);
  }
}

// ----------------------
// RESTART QUIZ
// ----------------------
restartBtn.addEventListener("click", () => {
  location.reload();
});
