const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const btnClear  = document.querySelector("#clear-btn");
const btnTheme  = document.querySelector("#theme-toggle");

function updateCounts() {
  const text = noteText.value;               // do NOT trim for character count
  const chars = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  charCount.textContent = `${chars} / 200 characters`;
  wordCount.textContent = `${words} words`;

  // remove both classes first, then add the right one
  charCount.classList.remove("warning", "over");
  if (chars > 200) {
    charCount.classList.add("over");
  } else if (chars > 180) {
    charCount.classList.add("warning");
  }

  localStorage.setItem("draft", text);       // save on every input
}

noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem("draft", noteText.value);
});

window.addEventListener("DOMContentLoaded", () => {
  // restore draft
  const savedDraft = localStorage.getItem("draft");
  if (savedDraft !== null) {
    noteText.value = savedDraft;
  }

  // restore theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    btnTheme.textContent = "Light mode";
  } else {
    document.body.classList.remove("dark");
    btnTheme.textContent = "Dark mode";
  }

  updateCounts();   // show correct counts for the restored text
});

// 4. Clear button and Escape key clear everything
function clearAll() {
  noteText.value = "";
  updateCounts();
  localStorage.removeItem("draft");
}

btnClear.addEventListener("click", clearAll);

// Escape only works when the textarea has focus
noteText.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearAll();
  }
});

// 5. Theme button toggles dark mode and remembers the choice
btnTheme.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  btnTheme.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});