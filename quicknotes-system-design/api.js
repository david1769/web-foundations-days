const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.querySelector("#load-btn");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const statusMessage = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

let notes = [];
let isRequestRunning = false;

async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  if (response.status === 204) {
    return { data: null, status: response.status };
  }

  return { data: await response.json(), status: response.status };
}

function setBusy(isBusy) {
  isRequestRunning = isBusy;
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });
}

function showStatus(message, state) {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

function renderNotes() {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.textContent = "No notes to show.";
    notesList.append(emptyMessage);
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("li");
    const title = document.createElement("h2");
    const body = document.createElement("p");
    const deleteButton = document.createElement("button");

    title.textContent = note.title;
    body.textContent = note.body || "";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.disabled = isRequestRunning;
    deleteButton.addEventListener("click", () => removeNote(note.id));

    item.append(title, body, deleteButton);
    notesList.append(item);
  });
}

async function loadNotes() {
  setBusy(true);
  showStatus("Loading notes...", "loading");

  try {
    const { data: loadedNotes } = await request(`${API_URL}?_limit=10`);
    if (!Array.isArray(loadedNotes)) {
      throw new Error("The server returned an invalid notes list.");
    }

    notes = loadedNotes;
    renderNotes();
    showStatus("Loaded 10 notes from the server.", "success");
  } catch {
    showStatus("Could not load notes. Please check your connection and try again.", "error");
  } finally {
    setBusy(false);
  }
}

async function createNote(title, body) {
  setBusy(true);
  showStatus("Creating note...", "loading");

  try {
    const { data: createdNote, status } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });

    notes.unshift(createdNote);
    renderNotes();
    noteForm.reset();
    showStatus(`Note created (status ${status}, id ${createdNote.id}).`, "success");
  } catch (error) {
    showStatus(`Unable to create note: ${error.message}`, "error");
  } finally {
    setBusy(false);
  }
}

async function removeNote(noteId) {
  setBusy(true);
  showStatus("Deleting note...", "loading");

  try {
    await request(`${API_URL}/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
    });

    notes = notes.filter((note) => note.id !== noteId);
    renderNotes();
    showStatus(
      notes.length === 0 ? "No notes remain." : "Note deleted successfully.",
      notes.length === 0 ? "empty" : "success"
    );
  } catch (error) {
    showStatus(`Unable to delete note: ${error.message}`, "error");
  } finally {
    setBusy(false);
  }
}

loadButton.addEventListener("click", loadNotes);

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    showStatus("A title is required.", "error");
    titleInput.focus();
    return;
  }

  if (title.length > 100) {
    showStatus("The title must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  return createNote(title, body);
});

showStatus("Load notes or create a new note.", "empty");
renderNotes();
