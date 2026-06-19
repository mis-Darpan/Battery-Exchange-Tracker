const API_URL = "https://script.google.com/macros/s/AKfycbx1NMTtX8mOPOShzs7ku3ccxcdP01PrVN5LsS5rkrB_HPWO0WeLAHla-uYuVVrkzxZlDQ/exec";

let allData = [];
let currentUser = null;
let currentRole = null;
let currentFilter = "All";
let searchQuery = "";
let pendingUpdate = null;

// ---- LOGIN ----
function login(name, role) {
  currentUser = name;
  currentRole = role;
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app-screen").style.display = "block";
  document.getElementById("user-label").textContent = `${name} · ${role}`;

  const wrap = document.getElementById("new-btn-wrap");
  if (name === "Sukhpal" || name === "Admin") {
    wrap.innerHTML = `<button class="btn-primary" onclick="openNewModal()">+ New Complaint</button>`;
  } else {
    wrap.innerHTML = "";
  }

  loadData();
  loadStats();
}

function logout() {
  currentUser = null;
  currentRole = null;
  allData = [];
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app-screen").style.display = "none";
}

// ---- DATA ----
async function loadData() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("main-table").style.display = "none";
  try {
    const res = await fetch(`${API_URL}?action=getAll`);
    const json = await res.json();
    allData = json.data || [];
    renderTable();
  } catch (e) {
    showToast("Error loading data", "error");
  } finally {
    document.getElementById("loading").style.display = "none";
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_URL}?action=getStats`);
    const json = await res.json();
    const s = json.stats;
    document.getElementById("s-total").textContent = s.total;
    document.getElementById("s-open").textContent = s.open;
    document.getElementById("s-dispatched").textContent = s.dispatched;
    document.getElementById("s-pickup").textContent = s.pickupArranged;
    document.getElementById("s-confirmed").textContent = s.pickupConfirmed;
    document.getElementById("s-closed").textContent = s.closed;
  } catch (e) {}
}

// ---- RENDER TABLE ----
function renderTable() {
  let data = allData;

  // Role-based filter
  if (currentUser === "Mandeep") {
    data = data.filter(r => ["Open", "Dispatched by Repair", "Forwarded to Production", "Pickup Confirmed"].includes(r["Status"]));
  } else if (currentUser === "Production") {
    data = data.filter(r => ["Forwarded to Production", "Dispatched by Production"].includes(r["Status"]));
  }

  // Status filter
  if (currentFilter !== "All") {
    if (currentFilter === "Open") data = data.filter(r => r["Status"] === "Open");
    if (currentFilter === "Dispatched") data = data.filter(r => ["Dispatched by Repair", "Dispatched by Production", "Forwarded to Production"].includes(r["Status"]));
    if (currentFilter === "Pickup") data = data.filter(r => ["Pickup Arranged", "Pickup Confirmed"].includes(r["Status"]));
    if (currentFilter === "Closed") data = data.filter(r => r["Status"] === "Closed");
  }

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    data = data.filter(r =>
      (r["Customer Name"] || "").toLowerCase().includes(q) ||
      (r["Serial No"] || "").toLowerCase().includes(q) ||
      (r["Battery Model"] || "").toLowerCase().includes(q) ||
      (r["ID"] || "").toLowerCase().includes(q) ||
      (r["Phone"] || "").toLowerCase().includes(q)
    );
  }

  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  if (!data.length) {
    document.getElementById("empty-state").style.display = "block";
    document.getElementById("main-table").style.display = "none";
    return;
  }

  document.getElementById("empty-state").style.display = "none";
  document.getElementById("main-table").style.display = "table";

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="cid">${row["ID"] || ""}</span></td>
      <td>${row["Date"] || ""}</td>
      <td>
        <div class="cname">${row["Customer Name"] || "—"}</div>
        <div class="cphone">${row["Phone"] || ""} ${row["City"] ? "· " + row["City"] : ""}</div>
      </td>
      <td>
        <div class="bmodel">${row["Battery Model"] || "—"}</div>
        <div class="bserial">${row["Battery Category"] || ""} ${row["Serial No"] ? "· " + row["Serial No"] : ""}</div>
      </td>
      <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${row["Complaint"] || "—"}</td>
      <td>${getStatusBadge(row["Status"])}</td>
      <td>${getActions(row)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function getStatusBadge(s) {
  const map = {
    "Open": "b-open",
    "Dispatched by Repair": "b-repair",
    "Forwarded to Production": "b-forwarded",
    "Dispatched by Production": "b-production",
    "Pickup Arranged": "b-pickup",
    "Pickup Confirmed": "b-confirmed",
    "Closed": "b-closed"
  };
  return `<span class="badge ${map[s] || "b-open"}">${s || "Open"}</span>`;
}

function getActions(row) {
  const s = row["Status"];
  const id = row["ID"];
  let btns = `<button class="action-btn ab-view" onclick='openDetail("${id}")'>View</button>`;

  if (currentUser === "Mandeep" || currentUser === "Admin") {
    if (s === "Open") {
      btns += ` <button class="action-btn ab-dispatch" onclick='openUpdate("${id}","Dispatched by Repair")'>Dispatch</button>`;
      btns += ` <button class="action-btn ab-forward" onclick='openUpdate("${id}","Forwarded to Production")'>Stock Nahi →</button>`;
    }
    if (s === "Pickup Confirmed") {
      btns += ` <button class="action-btn ab-received" onclick='openUpdate("${id}","Closed")'>Mark Received</button>`;
    }
  }

  if (currentUser === "Production" || currentUser === "Admin") {
    if (s === "Forwarded to Production") {
      btns += ` <button class="action-btn ab-prodispatch" onclick='openUpdate("${id}","Dispatched by Production")'>Dispatch</button>`;
    }
  }

  if (currentUser === "Sukhpal" || currentUser === "Admin") {
    if (s === "Dispatched by Repair" || s === "Dispatched by Production") {
      btns += ` <button class="action-btn ab-arrange" onclick='openUpdate("${id}","Pickup Arranged")'>Arrange Pickup</button>`;
    }
    if (s === "Pickup Arranged") {
      btns += ` <button class="action-btn ab-confirm" onclick='openUpdate("${id}","Pickup Confirmed")'>Pickup Done ✓</button>`;
    }
  }

  return btns;
}

// ---- FILTERS ----
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.textContent.trim() === f));
  renderTable();
}

function onSearch(v) {
  searchQuery = v;
  renderTable();
}

// ---- NEW COMPLAINT ----
function openNewModal() {
  ["f-name", "f-phone", "f-city", "f-model", "f-serial", "f-complaint", "f-remarks"].forEach(i => {
    document.getElementById(i).value = "";
  });
  document.getElementById("f-cat").value = "";
  openModal("new-modal");
}

async function submitNew() {
  const name = document.getElementById("f-name").value.trim();
  const phone = document.getElementById("f-phone").value.trim();
  const cat = document.getElementById("f-cat").value;
  const model = document.getElementById("f-model").value.trim();
  const complaint = document.getElementById("f-complaint").value.trim();

  if (!name || !phone || !cat || !model || !complaint) {
    showToast("Saare required fields bharo", "error");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addEntry",
        customerName: name,
        customerPhone: phone,
        city: document.getElementById("f-city").value.trim(),
        batteryCategory: cat,
        batteryModel: model,
        serialNo: document.getElementById("f-serial").value.trim(),
        complaint,
        remarks: document.getElementById("f-remarks").value.trim()
      })
    });
    const json = await res.json();
    if (json.success) {
      closeModal("new-modal");
      showToast(`${json.id} complaint log ho gayi`, "success");
      await loadData();
      await loadStats();
    } else {
      showToast("Error saving", "error");
    }
  } catch (e) {
    showToast("Network error", "error");
  }
}

// ---- UPDATE STATUS ----
function openUpdate(id, newStatus) {
  const row = allData.find(r => r["ID"] === id);
  if (!row) return;
  pendingUpdate = { id, newStatus };

  const titles = {
    "Dispatched by Repair": "Mark Dispatched (Repair)",
    "Forwarded to Production": "Forward to Production",
    "Dispatched by Production": "Mark Dispatched (Production)",
    "Pickup Arranged": "Arrange Pickup",
    "Pickup Confirmed": "Confirm Pickup Done",
    "Closed": "Mark Defective Battery Received"
  };

  document.getElementById("u-title").textContent = titles[newStatus] || "Update";
  document.getElementById("u-info").innerHTML = `
    <strong>${row["ID"]}</strong> — ${row["Customer Name"] || ""}<br>
    Battery: <strong>${row["Battery Model"] || ""}</strong> ${row["Serial No"] ? "(" + row["Serial No"] + ")" : ""}<br>
    Current Status: ${getStatusBadge(row["Status"])}
  `;

  let fields = "";

  if (newStatus === "Forwarded to Production") {
    fields = `<p style="font-size:13px;color:var(--muted);margin-bottom:12px">Yeh complaint Production Executive ko forward ho jaegi.</p>`;
  }

  if (newStatus === "Pickup Arranged") {
    fields = `
      <div class="form-group" style="margin-bottom:12px">
        <label>Pickup Mode *</label>
        <select id="u-mode">
          <option value="">Select</option>
          <option>Courier</option>
          <option>Transport</option>
          <option>Self Pickup</option>
          <option>Service Engineer</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:12px">
        <label>Expected Date</label>
        <input type="date" id="u-expdate"/>
      </div>
    `;
  }

  if (newStatus === "Closed") {
    fields = `
      <div class="form-group" style="margin-bottom:12px">
        <label>Battery Received Kahan? *</label>
        <select id="u-received">
          <option value="">Select</option>
          <option>Repair (Mandeep ke paas)</option>
          <option>Production ko di</option>
        </select>
      </div>
    `;
  }

  fields += `
    <div class="form-group">
      <label>Remarks (optional)</label>
      <input id="u-remarks" placeholder="Koi note..."/>
    </div>
  `;

  document.getElementById("u-fields").innerHTML = fields;
  document.getElementById("u-confirm").onclick = confirmUpdate;
  openModal("update-modal");
}

async function confirmUpdate() {
  if (!pendingUpdate) return;
  const payload = {
    action: "updateStatus",
    id: pendingUpdate.id,
    newStatus: pendingUpdate.newStatus
  };

  if (pendingUpdate.newStatus === "Dispatched by Repair") payload.dispatchedBy = "Mandeep";
  if (pendingUpdate.newStatus === "Dispatched by Production") payload.dispatchedBy = "Production";

  if (pendingUpdate.newStatus === "Pickup Arranged") {
    const mode = document.getElementById("u-mode")?.value;
    if (!mode) { showToast("Pickup mode select karo", "error"); return; }
    payload.pickupMode = mode;
    payload.expectedDate = document.getElementById("u-expdate")?.value || "";
  }

  if (pendingUpdate.newStatus === "Closed") {
    const rec = document.getElementById("u-received")?.value;
    if (!rec) { showToast("Select karo battery kahan receive hui", "error"); return; }
    payload.receivedLocation = rec;
  }

  payload.remarks = document.getElementById("u-remarks")?.value || "";

  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(payload) });
    const json = await res.json();
    if (json.success) {
      closeModal("update-modal");
      showToast("Status update ho gaya!", "success");
      await loadData();
      await loadStats();
    } else {
      showToast("Error updating", "error");
    }
  } catch (e) {
    showToast("Network error", "error");
  }
}

// ---- DETAIL VIEW ----
function openDetail(id) {
  const row = allData.find(r => r["ID"] === id);
  if (!row) return;
  document.getElementById("d-title").textContent = `${row["ID"]} — Details`;
  document.getElementById("d-body").innerHTML = `
    <div class="detail-grid">
      <div class="di"><label>Date</label><span>${row["Date"] || "—"}</span></div>
      <div class="di"><label>Status</label><span>${getStatusBadge(row["Status"])}</span></div>
      <div class="di"><label>Customer</label><span>${row["Customer Name"] || "—"}</span></div>
      <div class="di"><label>Phone</label><span>${row["Phone"] || "—"}</span></div>
      <div class="di"><label>City</label><span>${row["City"] || "—"}</span></div>
    </div>
    <div class="detail-section">
      <h3>Battery Info</h3>
      <div class="detail-grid">
        <div class="di"><label>Category</label><span>${row["Battery Category"] || "—"}</span></div>
        <div class="di"><label>Model</label><span>${row["Battery Model"] || "—"}</span></div>
        <div class="di"><label>Serial No</label><span>${row["Serial No"] || "—"}</span></div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Complaint</h3>
      <p style="font-size:13px;line-height:1.6">${row["Complaint"] || "—"}</p>
    </div>
    <div class="detail-section">
      <h3>Replacement & Pickup</h3>
      <div class="detail-grid">
        <div class="di"><label>Dispatched By</label><span>${row["Dispatched By"] || "—"}</span></div>
        <div class="di"><label>Dispatch Date</label><span>${row["Dispatch Date"] || "—"}</span></div>
        <div class="di"><label>Pickup Mode</label><span>${row["Pickup Mode"] || "—"}</span></div>
        <div class="di"><label>Expected Pickup</label><span>${row["Expected Pickup Date"] || "—"}</span></div>
        <div class="di"><label>Pickup Confirmed</label><span>${row["Pickup Confirmed Date"] || "—"}</span></div>
        <div class="di"><label>Received At</label><span>${row["Received Location"] || "—"}</span></div>
      </div>
    </div>
    ${row["Remarks"] ? `<div class="detail-section"><h3>Remarks</h3><p style="font-size:13px">${row["Remarks"]}</p></div>` : ""}
  `;
  openModal("detail-modal");
}

// ---- MODAL HELPERS ----
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".modal-overlay").forEach(el => {
    el.addEventListener("click", e => { if (e.target === el) el.classList.remove("open"); });
  });
});

// ---- TOAST ----
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove("show"), 3000);
}
