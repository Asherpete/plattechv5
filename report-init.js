import {
  auth,
  db,
  initNavAuth,
  loadPosts,
  onAuthStateChanged,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "./auth.js";

import { getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

initNavAuth();

let currentUser = null;
let editingPostId = null;
let selectedImageFile = null;

const feed = document.getElementById("postFeed");
const postModal = document.getElementById("postModal");
const postModalOverlay = document.getElementById("postModalOverlay");

// ── Auth state ──
// IMPORTANT: makePostBtn listener is inside here so currentUser is already
// set by the time the user clicks the button.
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  window._toggleMenu = toggleMenu;
  window._editPost = editPost;
  window._deletePost = deletePost;
  loadPosts(feed, currentUser);

  // Attach button listener after auth resolves
  const makePostBtn = document.getElementById("makePostBtn");
  if (makePostBtn) {
    // Use onclick to avoid stacking duplicate listeners on re-auth
    makePostBtn.onclick = () => openModal(false);
  }
});

// ── Open modal ──
function openModal(prefill) {
  if (!currentUser) {
    window.location.href = "./SignIn.html";
    return;
  }
  if (!prefill) {
    editingPostId = null;
    document.getElementById("postModalTitle").textContent = "Create Report";
    document.getElementById("postTitle").value = "";
    document.getElementById("postDescription").value = "";
    document.getElementById("postLocation").value = "";
    document.getElementById("imagePreview").innerHTML = "";
    selectedImageFile = null;
  }
  postModal.classList.add("active");
  postModalOverlay.classList.add("active");
}

document
  .getElementById("closePostModal")
  ?.addEventListener("click", closeModal);
postModalOverlay?.addEventListener("click", closeModal);

function closeModal() {
  postModal.classList.remove("active");
  postModalOverlay.classList.remove("active");
  editingPostId = null;
  selectedImageFile = null;
}

// ── Image drop zone ──
const dropZone = document.getElementById("dropZone");
const imageInput = document.getElementById("imageInput");

dropZone?.addEventListener("click", () => imageInput.click());
dropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone?.addEventListener("dragleave", () =>
  dropZone.classList.remove("dragover")
);
dropZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith("image/")) {
    selectedImageFile = file;
    previewImage(file);
  }
});
imageInput?.addEventListener("change", () => {
  if (imageInput.files[0]) {
    selectedImageFile = imageInput.files[0];
    previewImage(selectedImageFile);
  }
});

function previewImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("imagePreview").innerHTML = `
      <div class="preview-wrap">
        <img src="${e.target.result}" alt="Preview" />
        <button class="remove-img" onclick="window._clearImage()">✕</button>
      </div>`;
  };
  reader.readAsDataURL(file);
}
window._clearImage = () => {
  selectedImageFile = null;
  imageInput.value = "";
  document.getElementById("imagePreview").innerHTML = "";
};

// ── Submit post ──
document.getElementById("postForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const title = document.getElementById("postTitle").value.trim();
  const description = document.getElementById("postDescription").value.trim();
  const location = document.getElementById("postLocation").value.trim();
  const submitBtn = document.getElementById("submitPostBtn");

  if (!title || !description) {
    alert("Title and description are required.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = editingPostId ? "Saving..." : "Submitting...";

  try {
    let imageUrl = null;
    if (selectedImageFile) {
      imageUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(selectedImageFile);
      });
    }

    if (editingPostId) {
      const updates = {
        title,
        description,
        location,
        updatedAt: serverTimestamp(),
      };
      if (imageUrl) updates.imageUrl = imageUrl;
      await updateDoc(doc(db, "posts", editingPostId), updates);
    } else {
      await addDoc(collection(db, "posts"), {
        title,
        description,
        location,
        imageUrl: imageUrl || null,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
      });
    }

    closeModal();
    loadPosts(feed, currentUser);
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  }
});

// ── Menu toggle ──
function toggleMenu(id) {
  document.querySelectorAll(".post-menu").forEach((m) => {
    if (m.id !== `menu-${id}`) m.classList.remove("open");
  });
  document.getElementById(`menu-${id}`)?.classList.toggle("open");
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".post-menu-wrap"))
    document
      .querySelectorAll(".post-menu")
      .forEach((m) => m.classList.remove("open"));
});

// ── Edit post ──
async function editPost(id) {
  try {
    const snapshot = await getDocs(collection(db, "posts"));
    let postData = null;
    snapshot.forEach((d) => {
      if (d.id === id) postData = d.data();
    });
    if (!postData) return;

    editingPostId = id;
    document.getElementById("postModalTitle").textContent = "Edit Report";
    document.getElementById("postTitle").value = postData.title;
    document.getElementById("postDescription").value = postData.description;
    document.getElementById("postLocation").value = postData.location || "";
    document.getElementById("imagePreview").innerHTML = postData.imageUrl
      ? `<div class="preview-wrap"><img src="${postData.imageUrl}" /></div>`
      : "";

    openModal(true);
    document.querySelector(".post-menu.open")?.classList.remove("open");
  } catch (err) {
    alert("Failed to load post: " + err.message);
  }
}

// ── Delete post ──
async function deletePost(id) {
  if (!confirm("Delete this report?")) return;
  try {
    await deleteDoc(doc(db, "posts", id));
    loadPosts(feed, currentUser);
  } catch (err) {
    alert("Failed to delete: " + err.message);
  }
}
