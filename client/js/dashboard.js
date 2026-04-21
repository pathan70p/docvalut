const API_URL = "/api";

// 🔐 Check login
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

// 👤 User
const user = JSON.parse(localStorage.getItem('user'));

if (user) {
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = user.username;
        if (user.role === "admin") {
            usernameDisplay.innerHTML += ' <span style="color:red; font-size:12px;">(Admin)</span>';
            const adminPanel = document.getElementById("admin-panel");
            if (adminPanel) adminPanel.style.display = "block";
        }
    }
}

// 📂 Inputs
const fileInput = document.getElementById('document-file');
const fileName = document.getElementById('file-name');
const titleInput = document.getElementById("doc-title");

if (fileInput) {
    fileInput.addEventListener('change', () => {
        fileName.textContent = fileInput.files[0]?.name || "";
    });
}

// 📤 Upload
const uploadForm = document.getElementById('upload-form');
if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        const title = titleInput.value.trim();
        const expiry = document.getElementById('link-expiry').value;

        if (!file || !title) return alert("File & title required ❌");

        const formData = new FormData();
        formData.append("document", file);
        formData.append("title", title);
        formData.append("expiry", expiry);

        try {
            const res = await fetch(`${API_URL}/documents/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                body: formData
            });

            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                const text = await res.text();
                throw new Error("Server Error: " + res.status);
            }

            if (!res.ok) throw new Error(data.error || "Upload failed");

            alert("Uploaded ✅");

            fileInput.value = "";
            titleInput.value = "";
            fileName.textContent = "";

            loadDocuments();

        } catch (err) {
            alert(err.message);
        }
    });
}

let usersVisible = false;
function toggleUsers() {
    const container = document.getElementById("user-list");
    if (!container) return;

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

        if (!Array.isArray(data)) {
            console.error("Docs error:", data);
            return;
        }

        const search = document.getElementById("search")?.value.toLowerCase() || "";
        const filteredDocs = data.filter(doc =>
            (doc.title || doc.originalName).toLowerCase().includes(search)
        );

        document.getElementById('total-docs').textContent = data.length;
        const container = document.getElementById('documents-grid');

        if (!filteredDocs.length) {
            container.innerHTML = '<div class="empty-state"><h3>No documents found</h3></div>';
            return;
        }

        container.innerHTML = filteredDocs.map(doc => {
            const date = new Date(doc.createdAt);
            // Fallback for missing shareToken
            const displayToken = doc.shareToken || "no-token";
            
            return `
                <div class="doc-card">
                    <input type="checkbox" class="doc-checkbox" data-token="${displayToken}" value="${doc.fileUrl}">
                    <div class="doc-info">
                        <h4>${doc.title || doc.originalName}</h4>
                        <small>${date.toLocaleDateString()} | ${date.toLocaleTimeString()}</small>
                    </div>
                    <div class="doc-actions">
                        <button onclick='previewDoc("${doc.fileUrl}")' title="Preview">👁️</button>
                        <button onclick="editDoc('${doc._id}', '${doc.title || doc.originalName}')" title="Edit Name">✏️</button>
                        <button onclick='shareDoc(${JSON.stringify(doc)})' title="Copy Share Link">🔗</button>
                        <button onclick="deleteDoc('${doc._id}')" title="Delete">🗑️</button>
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
        if (!Array.isArray(data)) return alert(data.error || "Unauthorized ❌");

        const container = document.getElementById("user-list");
        container.innerHTML = data.map(user => {
            const history = user.loginHistory?.map(h => {
                const login = h.loginTime ? new Date(h.loginTime).toLocaleString("en-IN") : "N/A";
                const logout = h.logoutTime ? new Date(h.logoutTime).toLocaleString("en-IN") : "Active";
                return `<div style="font-size:12px; color:#555;">🟢 Login: ${login}<br>🔴 Logout: ${logout}</div>`;
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

// 🔗 Share Selected
function shareSelected() {
    const selected = document.querySelectorAll('.doc-checkbox:checked');
    if (selected.length === 0) return alert("Select documents to share ❌");

    const links = Array.from(selected).map(cb => {
        const token = cb.getAttribute('data-token');
        return token ? `${window.location.origin}/api/auth/public/${token}` : null;
    }).filter(link => link !== null);

    if (links.length === 0) return alert("No shareable links found ❌");

    navigator.clipboard.writeText(links.join('\n'));
    alert(`${links.length} Links copied to clipboard ✅`);
}

// 🚪 Logout
async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
    } catch (err) {
        console.error("Logout error:", err);
    }
    localStorage.clear();
    window.location.href = 'login.html';
}

// 🔗 Share Individual
function shareDoc(doc) {
    if (!doc.shareToken) return alert("No share link ❌");
    const link = `${window.location.origin}/api/auth/public/${doc.shareToken}`;
    navigator.clipboard.writeText(link);
    alert("Link copied ✅");
}

// 👁️ Preview
function previewDoc(url) {
    window.open(url, "_blank");
}

// ✏️ Edit
async function editDoc(id, oldTitle) {
    const newTitle = prompt("Enter new document title:", oldTitle);
    if (!newTitle || newTitle === oldTitle) return;

    try {
        const res = await fetch(`${API_URL}/documents/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ title: newTitle })
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

// 🔄 Initial Load
loadDocuments();
