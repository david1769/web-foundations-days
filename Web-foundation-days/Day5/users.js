const loadBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusEl = document.getElementById("status");
const usersList = document.getElementById("users-list");

let allUsers = []; // 2. Store the loaded users in an array

// 2. renderUsers(list) – draws any array of users
function renderUsers(list) {
  usersList.innerHTML = "";

  if (list.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No users match your filter.";
    usersList.appendChild(li);
    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("span");
    email.textContent = ` — ${user.email}`;

    const city = document.createElement("span");
    city.textContent = ` | City: ${user.address.city}`;

    const company = document.createElement("span");
    company.textContent = ` | Company: ${user.company.name}`;

    li.append(name, email, city, company);
    usersList.appendChild(li);
  });
}

// 1. loadUsers() using fetch, async/await and try/catch/finally
async function loadUsers() {
  loadBtn.disabled = true;
  statusEl.textContent = "Loading users…";
  usersList.innerHTML = "";

  try {
    // 4. To test the error path, temporarily change the URL to something invalid, e.g.:
    // const response = await fetch("https://jsonplaceholder.typicode.com/usersXXX");
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    allUsers = await response.json();
    renderUsers(allUsers);
    statusEl.textContent = `Successfully loaded ${allUsers.length} users.`;
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
    allUsers = [];
  } finally {
    loadBtn.disabled = false;
  }
}

// 3. Listen for the input event on the filter box
filterInput.addEventListener("input", () => {
  const query = filterInput.value.trim().toLowerCase();

  const filtered = allUsers.filter((user) =>
    user.name.toLowerCase().includes(query)
  );

  renderUsers(filtered);
});

loadBtn.addEventListener("click", loadUsers);