const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') document.body.classList.add('dark-mode');

let libdata = JSON.parse(localStorage.getItem('vaultData')) || [];
let genr = JSON.parse(localStorage.getItem('genr')) || ["Fiction", "Theory", "Prose", "Work", "Philosophy"];
let rdrgoal = Number(localStorage.getItem('rdrgoal')) || 40;
if (isNaN(rdrgoal)) rdrgoal = 40;

let edid = null;

function init() {
    renderGenreOptions();
    const goalInput = document.getElementById('goalInput');
    if (goalInput) goalInput.value = rdrgoal;
    updateUI();
}

/* --- the core utils of the prog --- */
function generateUUID() {
    return 'rec-' + crypto.randomUUID().split('-')[0] + '-' + Date.now().toString(36);
}

function save() {
    localStorage.setItem('vaultData', JSON.stringify(libdata));
    localStorage.setItem('rdrgoal', rdrgoal);
    localStorage.setItem('genr', JSON.stringify(genr));
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    edid = null;
    document.getElementById('validation-error').style.display = 'none';
    document.getElementById('add-success').style.display = 'none';
    updateUI();
}

/* --- db logic --- */
function calculateDashboard() {
    const finished = libdata.filter(b => b.status === "Finished").length;
    const progress = Math.min((finished / rdrgoal) * 100, 100);
    
    document.getElementById("progress-fill").style.width = progress + "%";
    document.getElementById("percent-text").innerText = Math.round(progress) + "%";
    document.getElementById("progress-count").innerText = `${finished} / ${rdrgoal} books finished`;

        // Set dynamic completion message
    let message = "Enter, the halls of the colossal wreck!";
    if (finished === 0) {
        message = "Lets get to it!";
    } else if (progress < 50) {
        message = "all bound on the westward train";
    } else if (progress < 100) {
        message = "Call you Ishmael?";
    } else if (progress >= 100) {
        message = "Look on my Works, ye Mighty, and despair!";
    }
    document.getElementById("completion-message").innerText = message;

    // 7day tr algo
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const trendCount = libdata.filter(b => b.status === "Finished" && b.date && new Date(b.date) >= weekAgo).length;
    document.getElementById("weekly-trend").innerText = `${trendCount} finished in last 7 days`;

    // read vel mtc
    const today = new Date();
    const eoy = new Date(today.getFullYear(), 11, 31);
    const diffDays = Math.ceil(Math.abs(eoy - today) / (1000 * 60 * 60 * 24));
    const unreadPages = libdata.filter(b => b.status !== "Finished").reduce((s, b) => s + (Number(b.amount) || 0), 0);
    document.getElementById("velocity-text").innerText = diffDays > 0 ? `${Math.ceil(unreadPages / diffDays)} pages/day to finish current list` : "Year ended.";

    // metadata stats
    const authMap = {};
    libdata.forEach(b => authMap[b.author] = (authMap[b.author] || 0) + 1);
    const repeats = Object.entries(authMap).filter(a => a[1] > 1);
    document.getElementById("repeated-authors").innerHTML = repeats.map(a => `<li>${a[0]} (${a[1]})</li>`).join('');

    const currentList = libdata.filter(b => b.status === "Reading");
    document.getElementById("current-read-log").innerHTML = currentList.length ? currentList.map(b => `• ${b.title}`).join('<br>') : "None";

    const genMap = {};
    libdata.forEach(b => genMap[b.category] = (genMap[b.category] || 0) + 1);
    const topGen = Object.entries(genMap).sort((a,b) => b[1]-a[1]).slice(0, 3);
    document.getElementById("top-genr").innerHTML = topGen.map(g => `<li>${g[0]}: ${g[1]}</li>`).join('');
}

/* --- rec mgt --- */
function addBook() {
    const title = document.getElementById("bookTitle").value.trim();
    const author = document.getElementById("bookAuthor").value.trim();
    const pages = document.getElementById("bookPages").value;
    const cat = document.getElementById("bookCategory").value;
    const finished = document.getElementById("markFinished").checked;
    const date = finished ? document.getElementById("bookDate").value : "In Progress";

    const titleRegex = /^\S(?:.*\S)?$/;
    const authorRegex = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;

    if (!titleRegex.test(title)) return showError("Title invalid format.");
    if (!authorRegex.test(author)) return showError("Author invalid format.");
    if (pages <= 0) return showError("Pages must be positive.");
    if (finished && !date) return showError("Completion date required.");

    libdata.push({
        id: generateUUID(), title, author, amount: parseFloat(pages),
        category: cat, status: finished ? "Finished" : "Reading",
        date: date, added: new Date().toLocaleDateString(),
        updatedAt: new Date().toISOString()
    });

    save();
    document.getElementById('add-success').style.display = 'block';
    setTimeout(() => showPage('home'), 1500);
}

function updateUI() {
    const body = document.getElementById("bookBody");
    if (!body) return;

    body.innerHTML = libdata.map(rec => {
        if (edid === rec.id) {
            return `<tr>
                <td>
                    <input type="text" id="edit-t-${rec.id}" class="rounded-input" value="${rec.title}">
                    <input type="text" id="edit-a-${rec.id}" class="rounded-input" value="${rec.author}">
                </td>
                <td><input type="number" id="edit-p-${rec.id}" class="rounded-input" value="${rec.amount}"></td>
                <td>
                    <select id="edit-s-${rec.id}" class="rounded-input">
                        <option value="Reading" ${rec.status === 'Reading' ? 'selected' : ''}>Reading</option>
                        <option value="Finished" ${rec.status === 'Finished' ? 'selected' : ''}>Finished</option>
                    </select>
                    <input type="date" id="edit-d-${rec.id}" class="rounded-input" style="margin-top:5px" value="${rec.date === 'In Progress' ? '' : rec.date}">
                </td>
                <td>${rec.added}</td>
                <td><button onclick="saveEdit('${rec.id}')">✔️</button> <button onclick="edid=null;updateUI()">❌</button></td>
            </tr>`;
        }
        return `<tr>
            <td><strong>${rec.title}</strong><br><small>${rec.author}</small></td>
            <td>${rec.amount}</td>
            <td>${rec.status}<br><small>${rec.category}</small></td>
            <td>${rec.added}</td>
            <td><button onclick="edid='${rec.id}';updateUI()">✏️</button> <button onclick="deleteRecord('${rec.id}')">🗑️</button></td>
        </tr>`;
    }).join('');
    calculateDashboard();
}

function saveEdit(id) {
    const idx = libdata.findIndex(r => r.id === id);
    libdata[idx].title = document.getElementById(`edit-t-${id}`).value;
    libdata[idx].author = document.getElementById(`edit-a-${id}`).value;
    libdata[idx].amount = parseFloat(document.getElementById(`edit-p-${id}`).value);
    libdata[idx].status = document.getElementById(`edit-s-${id}`).value;
    libdata[idx].date = libdata[idx].status === "Finished" ? (document.getElementById(`edit-d-${id}`).value || new Date().toISOString().split('T')[0]) : "In Progress";
    
    edid = null;
    save();
    updateUI();
}

/* --- sys util --- */
function toggleDarkMode() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function updateGoal() {
    rdrgoal = Number(document.getElementById('goalInput').value);
    save();
    updateUI();
    alert("Goal Updated.");
}

function importData() {
    const file = document.getElementById('importFile').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const schema = ['id', 'title', 'author', 'amount', 'category', 'status', 'date', 'added'];
            if (Array.isArray(data) && data.every(i => schema.every(k => i.hasOwnProperty(k)))) {
                libdata = data;
                save();
                updateUI();
                alert("Archive Restored.");
            } else { alert("Schema mismatch."); }
        } catch(e) { alert("Parse error."); }
    };
    reader.readAsText(file);
}

function deleteRecord(id) { if(confirm("Purge record?")) { libdata = libdata.filter(b => b.id !== id); save(); updateUI(); } }
function sortVault(k) { libdata.sort((a,b) => a[k] < b[k] ? -1 : 1); updateUI(); }
function searchBooks() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const rows = document.getElementById("bookBody").getElementsByTagName("tr");
    for (let r of rows) r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none";
}
function addNewGenre() {
    const v = document.getElementById('newGenreInput').value.trim();
    if(v && !genr.includes(v)) { genr.push(v); save(); renderGenreOptions(); }
}
function renderGenreOptions() { 
    const sel = document.getElementById('bookCategory');
    if(sel) sel.innerHTML = genr.map(g => `<option value="${g}">${g}</option>`).join('');
}
function showError(m) { const e = document.getElementById('validation-error'); e.innerText = "⚠️ "+m; e.style.display = 'block'; }
function toggleDateField(f) { document.getElementById('dateField').style.display = f ? 'block' : 'none'; }
function clearAllData() { if(confirm("Wipe storage?")) { localStorage.clear(); location.reload(); } }
function exportData() {
    const blob = new Blob([JSON.stringify(libdata)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "vaultr_archive.json"; a.click();
}

init();