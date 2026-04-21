const API_URL = "http://localhost:5000/api";

// 🔐 Check login
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

// 👤 User
const user = JSON.parse(localStorage.getItem('user'));

if (user) {
    document.getElementById('username-display').textContent = user.username;

    if (user.role === "admin") {
        document.getElementById('username-display').innerHTML += 
            ' <span style="color:red; font-size:12px;">(Admin)</span>';

        document.getElementById("admin-panel").style.display = "block";
    }
}

// 📂 Inputs
const fileInput = document.getElementById('document-file');
const fileName = document.getElementById('file-name');
const titleInput = document.getElementById("doc-title");

// 📂 File name show
fileInput.addEventListener('change', () => {
    fileName.textContent = fileInput.files[0]?.name || "";
});

// 📤 Upload
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    const title = titleInput.value.trim();

    if (!file || !title) return alert("File & title required ❌");

    const formData = new FormData();
    formData.append("document", file);
    formData.append("title", title);

    try {
        const res = await fetch(`${API_URL}/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert("Uploaded ✅");

        fileInput.value = "";
        titleInput.value = "";
        fileName.textContent = "";

        loadDocuments();

    } catch (err) {
        alert(err.message);
    }
});
let usersVisible = false;

function toggleUsers() {
    console.log("Button clicked"); // 🔥 debug

    const container = document.getElementById("user-list");

    if (usersVisible) {
        container.style.display = "none";
        container.innerHTML = "";
        usersVisible = false;
    } else {
        container.style.display = "block";
        usersVisible = true;

        loadUsers();
    }
}
// 📥 Load Documents
async function loadDocuments() {
    try {
        const res = await fetch(`${API_URL}/documents`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await res.json();

        // 🔥 ERROR HANDLE
        if (!Array.isArray(data)) {
            console.error("Docs error:", data);
            alert(data.error || "Unauthorized ❌");
            return;
        }

        const search = document.getElementById("search")?.value.toLowerCase() || "";

        const filteredDocs = data.filter(doc =>
            (doc.title || doc.originalName).toLowerCase().includes(search)
        );

        document.getElementById('total-docs').textContent = data.length;

        const container = document.getElementById('documents-grid');

        if (!filteredDocs.length) {
            container.innerHTML = "<p>No documents found</p>";
            return;
        }

        container.innerHTML = filteredDocs.map(doc => {
            const date = new Date(doc.createdAt);

            return `
                <div class="doc-card">

                    <input type="checkbox" class="doc-checkbox" value="${doc.fileUrl}">

                    <div class="doc-info">
                        <h4>${doc.title || doc.originalName}</h4>
                        <small>${date.toLocaleDateString()} | ${date.toLocaleTimeString()}</small>
                    </div>

                    <div class="doc-actions">

                        <button onclick='previewDoc("${doc.fileUrl}")'>
                            👁️
                        </button>

                        <button onclick="editDoc('${doc._id}', '${doc.title || doc.originalName}')">
                            ✏️
                        </button>

                        <button onclick='shareDoc(${JSON.stringify(doc)})'>
                            🔗
                        </button>

                        <button onclick="deleteDoc('${doc._id}')">
                            🗑️
                        </button>

                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Load error:", err);
    }
}

// 👥 Load Users (ADMIN)
async function loadUsers() {
    try {
        const res = await fetch(`${API_URL}/auth/users`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await res.json();

        if (!Array.isArray(data)) {
            alert(data.error || "Unauthorized ❌");
            return;
        }

        const container = document.getElementById("user-list");

       container.innerHTML = data.map(user => {

    const history = user.loginHistory?.map(h => {

        const login = h.loginTime 
            ? new Date(h.loginTime).toLocaleString("en-IN")
            : "N/A";

        const logout = h.logoutTime 
            ? new Date(h.logoutTime).toLocaleString("en-IN")
            : "Active";

        return `
            <div style="font-size:12px; color:#555;">
                🟢 Login: ${login}<br>
                🔴 Logout: ${logout}
            </div>
        `;
    }).join('') || "No history";

    return `
        <div class="user-card">
            <div>
                <strong>${user.username} (${user.role})</strong><br>
                ${user.email}
                ${history}
            </div>
        </div>
    `;
}).join('');

    } catch (err) {
        console.error(err);
    }
}
async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
    } catch (err) {
        console.log(err);
    }

    localStorage.clear();
    window.location.href = 'login.html';
}
// 🔗 Share
function shareDoc(doc) {
    if (!doc.shareToken) return alert("No share link ❌");

    const link = `${API_URL}/documents/public/${doc.shareToken}`;
    navigator.clipboard.writeText(link);
    alert("Link copied ✅");
}

// 👁️ Preview
function previewDoc(url) {
    window.open(url, "_blank");
}

// ✏️ Edit
async function editDoc(id, oldName) {
    const newName = prompt("Enter new name:", oldName);
    if (!newName) return;

    try {
        const res = await fetch(`${API_URL}/documents/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ originalName: newName })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert("Updated ✅");
        loadDocuments();

    } catch (err) {
        alert(err.message);
    }
}

// 🗑️ Delete
async function deleteDoc(id) {
    if (!confirm("Delete?")) return;

    try {
        const res = await fetch(`${API_URL}/documents/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert("Deleted ✅");
        loadDocuments();

    } catch (err) {
        alert(err.message);
    }
}

// ✔ Select All
function selectAll(source) {
    document.querySelectorAll('.doc-checkbox')
        .forEach(cb => cb.checked = source.checked);
}

// 🚪 Logout
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// 🔄 Load
loadDocuments();