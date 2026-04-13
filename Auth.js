import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  // apiKey: "AIzaSyD1Oi2atEUsuLsxSLAIWNuiv9HciT8v9t8",
  // authDomain: "login-example-528b8.firebaseapp.com",
  // projectId: "login-example-528b8",
  // storageBucket: "login-example-528b8.firebasestorage.app",
  // messagingSenderId: "157271016616",
  // appId: "1:157271016616:web:1d61c87741c1263c0b2e9d",

  apiKey: "AIzaSyDFGBPp0t6jmgPJhiqlHsgvh1MAH7I8NLQ",
  authDomain: "bantaymanila-main--database.firebaseapp.com",
  projectId: "bantaymanila-main--database",
  storageBucket: "bantaymanila-main--database.firebasestorage.app",
  messagingSenderId: "627259915945",
  appId: "1:627259915945:web:f812f1b4b44629c091b3b8",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ── Update navbar based on auth state (shared across all pages) ──
export function initNavAuth() {
  onAuthStateChanged(auth, (user) => {
    const navButtons = document.querySelector(".nav-buttons");
    if (!navButtons) return;

    if (user) {
      navButtons.innerHTML = `
        <a class="nav-account-link" href="./myaccount.html">👤 ${
          user.displayName || user.email
        }</a>
        <button class="btn-logout" id="logoutBtn">LOG OUT</button>
      `;
      document.getElementById("logoutBtn").addEventListener("click", () => {
        signOut(auth).then(() => {
          window.location.href = "./index.html";
        });
      });
    } else {
      navButtons.innerHTML = `
        <button class="btn-login" id="navLoginBtn">LOGIN</button>
        <button class="btn-signup" id="navSignupBtn">SIGN UP</button>
      `;
      document.getElementById("navLoginBtn")?.addEventListener("click", () => {
        window.location.href = "./SignIn.html";
      });
      document.getElementById("navSignupBtn")?.addEventListener("click", () => {
        window.location.href = "./SignIn.html?mode=signup";
      });
    }
  });
}

// ── Auth form logic (only used on SignIn.html) ──
export function initAuthForms() {
  const container = document.getElementById("S-container");
  if (!container) return;

  // Check if redirected with ?mode=signup
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "signup") container.classList.add("active");

  document.getElementById("signUp").onclick = () =>
    container.classList.add("active");
  document.getElementById("signIn").onclick = () =>
    container.classList.remove("active");

  // SIGN UP
  document
    .getElementById("signupForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("su-name").value;
      const email = document.getElementById("su-email").value;
      const password = document.getElementById("su-pass").value;
      const error = document.getElementById("signupError");

      if (!name || !email || !password) {
        error.textContent = "Please complete all fields.";
        return;
      }

      try {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await updateProfile(cred.user, { displayName: name });
        error.textContent = "";
        window.location.href = "./report.html";
      } catch (err) {
        error.textContent = err.message;
      }
    });

  // SIGN IN
  document.getElementById("signinForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("si-email").value;
    const password = document.getElementById("si-pass").value;
    const error = document.getElementById("signinError");

    if (!email || !password) {
      error.textContent = "Please complete all fields.";
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        window.location.href = "./report.html";
      })
      .catch(() => {
        error.textContent = "Wrong email or password.";
      });
  });

  // If already logged in, redirect
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "./report.html";
  });
}

// ── Posts CRUD ──
export async function loadPosts(feedEl, currentUser) {
  feedEl.innerHTML = `<div class="loading-posts">Loading posts...</div>`;
  try {
    const q = query(collection(db, "posts"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      feedEl.innerHTML = `<div class="empty-feed">No posts yet. Be the first to share!</div>`;
      return;
    }

    const posts = [];
    snapshot.forEach((d) => posts.push({ id: d.id, ...d.data() }));
    posts.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });

    feedEl.innerHTML = "";
    posts.forEach((post) =>
      feedEl.appendChild(renderPost(post.id, post, currentUser))
    );
  } catch (err) {
    feedEl.innerHTML = `<div class="loading-posts">Error: ${err.message}</div>`;
    console.error(err);
  }
}

export function renderPost(id, post, currentUser) {
  const isOwner = currentUser && currentUser.uid === post.authorId;
  const card = document.createElement("div");
  card.className = "post-card";
  card.dataset.id = id;

  card.innerHTML = `
    <div class="post-header">
      <div class="post-author">
        <div class="p-avatar">${getInitials(post.authorName)}</div>
        <div class="author-info">
          <span class="author-name">${post.authorName}</span>
          <span class="post-time">${formatTime(post.createdAt)}</span>
        </div>
      </div>
      ${
        isOwner
          ? `
      <div class="post-menu-wrap">
        <button class="menu-btn" onclick="window._toggleMenu('${id}')">&#8942;</button>
        <div class="post-menu" id="menu-${id}">
          <button onclick="window._editPost('${id}')">✏️ Edit Post</button>
          <button class="danger" onclick="window._deletePost('${id}')">🗑️ Delete Post</button>
        </div>
      </div>`
          : ""
      }
    </div>
   <div class="post-body">
      <span class="status-badge status-${
        post.status || "pending"
      }">${statusLabel(post.status)}</span>
      <h3 class="post-title" style="margin-top:8px;">${post.title}</h3>
      <p class="post-desc">${post.description}</p>
      ${post.location ? `<p class="post-location">📍 ${post.location}</p>` : ""}
      ${
        post.imageUrl
          ? `<div class="post-image-wrap"><img src="${post.imageUrl}" alt="Post image" /></div>`
          : ""
      }
    </div>
  `;
  return card;
}

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

function getInitials(name) {
  return name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
}

export {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onAuthStateChanged,
  signOut,
};
