import {
  auth,
  db,
  initNavAuth,
  onAuthStateChanged,
  collection,
  getDocs,
} from "./Auth.js";

initNavAuth();

const accountContent = document.getElementById("accountContent");
const notLoggedIn    = document.getElementById("notLoggedIn");
const accountFeed    = document.getElementById("accountFeed");
const accountStats   = document.getElementById("accountStats");

let myPosts = [];
let currentFilter = "all";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    notLoggedIn.style.display = "block";
    accountContent.style.display = "none";
    return;
  }

  // Fill profile header
  accountContent.style.display = "block";
  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();
  document.getElementById("accountAvatar").textContent = initials;
  document.getElementById("accountName").textContent = user.displayName || "My Account";
  document.getElementById("accountEmail").textContent = user.email;

  await loadMyPosts(user.uid);
});

// ── Load posts belonging to current user ────────────────────────
async function loadMyPosts(uid) {
  accountFeed.innerHTML = `<div class="loading-posts">Loading your reports...</div>`;
  try {
    const snapshot = await getDocs(collection(db, "posts"));
    myPosts = [];
    snapshot.forEach((d) => {
      const data = d.data();
      if (data.authorId === uid) myPosts.push({ id: d.id, ...data });
    });
    myPosts.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
    renderStats();
    renderFeed();
  } catch (err) {
    accountFeed.innerHTML = `<div class="loading-posts">Error: ${err.message}</div>`;
  }
}

// ── Render stat counters ────────────────────────────────────────
function renderStats() {
  const counts = { pending: 0, "in-progress": 0, finished: 0 };
  myPosts.forEach((p) => {
    const s = p.status || "pending";
    if (counts[s] !== undefined) counts[s]++;
  });
  accountStats.innerHTML = `
    <div class="stat-card stat-total">
      <span class="stat-num">${myPosts.length}</span>
      <span class="stat-label">Total</span>
    </div>
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
  `;
}

// ── Render feed with current filter ────────────────────────────
function renderFeed() {
  const filtered = currentFilter === "all"
    ? myPosts
    : myPosts.filter((p) => (p.status || "pending") === currentFilter);

  if (filtered.length === 0) {
    accountFeed.innerHTML = myPosts.length === 0
      ? `<div class="empty-feed">You haven't submitted any reports yet.</div>`
      : `<div class="empty-feed">No reports with this status.</div>`;
    return;
  }

  accountFeed.innerHTML = "";
  filtered.forEach((post) => accountFeed.appendChild(renderPostCard(post)));
}

// ── Render a single post card (read-only for user) ──────────────
function renderPostCard(post) {
  const status = post.status || "pending";
  const card = document.createElement("div");
  card.className = "post-card";

  const initials = post.authorName
    ? post.authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const timeStr = formatTime(post.createdAt);

  card.innerHTML = `
    <div class="post-header">
      <div class="post-author">
        <div class="p-avatar">${initials}</div>
        <div class="author-info">
          <span class="author-name">${post.authorName || "You"}</span>
          <span class="post-time">${timeStr}</span>
        </div>
      </div>
      <span class="status-badge status-${status}">${statusLabel(status)}</span>
    </div>
    <div class="post-body">
      <h3 class="post-title">${post.title}</h3>
      <p class="post-desc">${post.description}</p>
      ${post.location ? `<p class="post-location">📍 ${post.location}</p>` : ""}
      ${post.imageUrl ? `<div class="post-image-wrap"><img src="${post.imageUrl}" alt="Post image" /></div>` : ""}
    </div>
  `;
  return card;
}

// ── Filter tabs ─────────────────────────────────────────────────
document.querySelectorAll(".admin-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderFeed();
  });
});

// ── Helpers ─────────────────────────────────────────────────────
function statusLabel(status) {
  return { pending: "🕐 Pending", "in-progress": "🔧 In Progress", finished: "✅ Finished" }[status] || "🕐 Pending";
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
