import {
  auth,
  db,
  initNavAuth,
  onAuthStateChanged,
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "./auth.js";

// ─── ADMIN EMAILS ───────────────────────────────────────────────
// Add admin email addresses here
const ADMIN_EMAILS = [
  "admin@bantaymanila.com",
  // "another@admin.com",
  "adminbantaymanila@gmail.com",
];

initNavAuth();

const adminContent = document.getElementById("adminContent");
const accessDenied = document.getElementById("accessDenied");
const adminFeed = document.getElementById("adminFeed");
const adminStats = document.getElementById("adminStats");

let allPosts = [];
let currentFilter = "all";

onAuthStateChanged(auth, async (user) => {
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    accessDenied.style.display = "block";
    adminContent.style.display = "none";
    return;
  }
  adminContent.style.display = "block";
  await loadAllPosts();
});

// ── Load all posts ──────────────────────────────────────────────
async function loadAllPosts() {
  adminFeed.innerHTML = `<div class="loading-posts">Loading reports...</div>`;
  try {
    const snapshot = await getDocs(collection(db, "posts"));
    allPosts = [];
    snapshot.forEach((d) => allPosts.push({ id: d.id, ...d.data() }));
    allPosts.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
    renderStats();
    renderFeed();
  } catch (err) {
    adminFeed.innerHTML = `<div class="loading-posts">Error: ${err.message}</div>`;
  }
}

// ── Render stat counters ────────────────────────────────────────
function renderStats() {
  const counts = { pending: 0, "in-progress": 0, finished: 0 };
  allPosts.forEach((p) => {
    const s = p.status || "pending";
    if (counts[s] !== undefined) counts[s]++;
  });
  adminStats.innerHTML = `
    <div class="stat-card stat-pending">
      <span class="stat-num">${counts.pending}</span>
      <span class="stat-label">Pending</span>
    </div>
    <div class="stat-card stat-progress">
      <span class="stat-num">${counts["in-progress"]}</span>
      <span class="stat-label">In Progress</span>
    </div>
    <div class="stat-card stat-finished">
      <span class="stat-num">${counts.finished}</span>
      <span class="stat-label">Finished</span>
    </div>
    <div class="stat-card stat-total">
      <span class="stat-num">${allPosts.length}</span>
      <span class="stat-label">Total Reports</span>
    </div>
  `;
}

// ── Render feed with current filter ────────────────────────────
function renderFeed() {
  const filtered =
    currentFilter === "all"
      ? allPosts
      : allPosts.filter((p) => (p.status || "pending") === currentFilter);

  if (filtered.length === 0) {
    adminFeed.innerHTML = `<div class="empty-feed">No reports found.</div>`;
    return;
  }

  adminFeed.innerHTML = "";
  filtered.forEach((post) => adminFeed.appendChild(renderAdminCard(post)));
}

// ── Render a single admin post card ────────────────────────────
function renderAdminCard(post) {
  const status = post.status || "pending";
  const card = document.createElement("div");
  card.className = "post-card";
  card.dataset.id = post.id;

  const initials = post.authorName
    ? post.authorName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const timeStr = formatTime(post.createdAt);

  card.innerHTML = `
    <div class="post-header">
      <div class="post-author">
        <div class="p-avatar">${initials}</div>
        <div class="author-info">
          <span class="author-name">${post.authorName || "Unknown"}</span>
          <span class="post-time">${timeStr}</span>
        </div>
      </div>
      <span class="status-badge status-${status}">${statusLabel(status)}</span>
    </div>
    <div class="post-body">
      <h3 class="post-title">${post.title}</h3>
      <p class="post-desc">${post.description}</p>
      ${post.location ? `<p class="post-location">📍 ${post.location}</p>` : ""}
      ${
        post.imageUrl
          ? `<div class="post-image-wrap"><img src="${post.imageUrl}" alt="Post image" /></div>`
          : ""
      }
    </div>
    <div class="admin-actions">
      <span style="font-size:13px;color:#6b7280;font-family:'Actor',sans-serif;">Set Status:</span>
      <button class="status-btn btn-pending ${
        status === "pending" ? "active" : ""
      }"
        onclick="window._setStatus('${post.id}', 'pending')">🕐 Pending</button>
      <button class="status-btn btn-progress ${
        status === "in-progress" ? "active" : ""
      }"
        onclick="window._setStatus('${
          post.id
        }', 'in-progress')">🔧 In Progress</button>
      <button class="status-btn btn-finished ${
        status === "finished" ? "active" : ""
      }"
        onclick="window._setStatus('${
          post.id
        }', 'finished')">✅ Finished</button>
    </div>
  `;
  return card;
}

// ── Update status in Firestore ──────────────────────────────────
window._setStatus = async (id, newStatus) => {
  try {
    await updateDoc(doc(db, "posts", id), {
      status: newStatus,
      statusUpdatedAt: serverTimestamp(),
    });
    // Update local cache
    const idx = allPosts.findIndex((p) => p.id === id);
    if (idx !== -1) allPosts[idx].status = newStatus;
    renderStats();
    renderFeed();
  } catch (err) {
    alert("Failed to update status: " + err.message);
  }
};

// ── Filter tabs ─────────────────────────────────────────────────
document.querySelectorAll(".admin-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".admin-tab")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderFeed();
  });
});

// ── Helpers ─────────────────────────────────────────────────────
function statusLabel(status) {
  return (
    {
      pending: "🕐 Pending",
      "in-progress": "🔧 In Progress",
      finished: "✅ Finished",
    }[status] || "🕐 Pending"
  );
}

function formatTime(timestamp) {
  if (!timestamp) return "Just now";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}
