const API_URL = "/api";
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

const user = JSON.parse(localStorage.getItem('user'));
if (user) {
    const display = document.getElementById('username-display');
    if (display) {
        display.textContent = user.username;
        if (user.role === "admin") {
            display.innerHTML += ' <span style="color:red; font-size:12px;">(Admin)</span>';
            const panel = document.getElementById("admin-panel");
            if (panel) panel.style.display = "block";
        }
    }
}

const fileInput = document.getElementById('document-file');
const fileName = document.getElementById('file-name');
const titleInput = document.getElementById("doc-title");

if (fileInput) {
    fileInput.addEventListener('change', () => {
        fileName.textContent = fileInput.files[0]?.name || "";
    });
}

const uploadForm = document.getElementById('upload-form');
if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        const title = titleInput.value.trim();
        if (!file || !title) return alert("Required ❌");

        const formData = new FormData();
        formData.append("document", file);
        formData.append("title", title);

        try {
            const res = await fetch(`${API_URL}/documents/upload`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });
            if (!res.ok) throw new Error("Upload failed");
            alert("Uploaded ✅");
            fileInput.value = ""; titleInput.value = ""; fileName.textContent = "";
            loadDocuments();
        } catch (err) { alert(err.message); }
    });
}

async function loadDocuments() {
    try {
        const res = await fetch(`${API_URL}/documents`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        const search = document.getElementById("search")?.value.toLowerCase() || "";
        const filtered = data.filter(doc => (doc.title || doc.originalName).toLowerCase().includes(search));
        
        document.getElementById('total-docs').textContent = data.length;
        const container = document.getElementById('documents-grid');
        if (!filtered.length) {
            container.innerHTML = '<h3>No documents</h3>';
            return;
        }

        container.innerHTML = filtered.map(doc => {
            const date = new Date(doc.createdAt);
            // Use directUrl if available, otherwise fallback to API
            const previewUrl = doc.directUrl || doc.fileUrl;
            
            return `
                <div class="doc-card">
                    <input type="checkbox" class="doc-checkbox" data-token="${doc.shareToken}">
                    <div class="doc-info">
                        <h4>${doc.title || doc.originalName}</h4>
                        <small>${date.toLocaleDateString()}</small>
                    </div>
                    <div class="doc-actions">
                        <button onclick='previewDoc("${previewUrl}", "${doc.title}")'>👁️</button>
                        <button onclick="editDoc('${doc._id}', '${doc.title}')">✏️</button>
                        <button onclick="shareDoc('${doc.shareToken}')">🔗</button>
                        <button onclick="deleteDoc('${doc._id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) { console.error(err); }
}

function previewDoc(url, title) {
    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('document-preview');
    const modalTitle = document.getElementById('modal-title');
    
    // Convert Cloudinary http to https for iframe safety
    const secureUrl = url.replace('http://', 'https://');
    
    modalTitle.textContent = title || "Preview";
    iframe.src = secureUrl;
    modal.classList.add('active');
}

function closePreview() {
    document.getElementById('preview-modal').classList.remove('active');
    document.getElementById('document-preview').src = "";
}

function shareDoc(token) {
    if (!token) return alert("No link ❌");
    const link = `${window.location.origin}/api/auth/public/${token}`;
    navigator.clipboard.writeText(link);
    alert("Link copied ✅");
}

async function editDoc(id, old) {
    const n = prompt("New title:", old);
    if (!n) return;
    await fetch(`${API_URL}/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ title: n })
    });
    loadDocuments();
}

async function deleteDoc(id) {
    if (!confirm("Delete?")) return;
    await fetch(`${API_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    loadDocuments();
}

loadDocuments();