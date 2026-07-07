// ---------- Lock zoom/scroll (feel like a native app) ----------
document.addEventListener("gesturestart", (e) => e.preventDefault());
let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

// ---------- Helpers ----------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function api(path, options = {}) {
  const token = localStorage.getItem("mm_token");
  const res = await fetch("/api" + path, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    logout();
  }
  if (!res.ok) throw new Error(data.error || "Etwas ist schiefgelaufen.");
  return data;
}

function resizeImageToBase64(file, maxSize = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality).split(",")[1]);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadPhoto(file) {
  const dataBase64 = await resizeImageToBase64(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const { url } = await api("/upload", {
    method: "POST",
    body: { filename: safeName, contentType: "image/jpeg", dataBase64 },
  });
  return url;
}

// ---------- Auth state ----------
let me = JSON.parse(localStorage.getItem("mm_me") || "null");

const NAV_SCREEN_KEY = "mm_active_screen";
let queue = [];
let matches = [];
let activeChatId = null;
let chatPollTimer = null;

function stopChatPolling() {
  if (chatPollTimer) {
    clearInterval(chatPollTimer);
    chatPollTimer = null;
  }
}

const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");

function showAuth() {
  appView.hidden = true;
  authView.hidden = false;
}

async function accountStillExists() {
  try {
    const { profile } = await api("/me");
    me = profile;
    localStorage.setItem("mm_me", JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

async function showApp() {
  authView.hidden = true;
  appView.hidden = false;
  renderProfile();
  await loadProfiles();
  await loadMatches();
  const screen = sessionStorage.getItem(NAV_SCREEN_KEY) || "discover";
  sessionStorage.setItem(NAV_SCREEN_KEY, screen);
  showScreen(screen);
}

function onAuthSuccess(token, profile) {
  localStorage.setItem("mm_token", token);
  localStorage.setItem("mm_me", JSON.stringify(profile));
  me = profile;
  showApp();
}

function logout() {
  stopChatPolling();
  localStorage.removeItem("mm_token");
  localStorage.removeItem("mm_me");
  sessionStorage.removeItem(NAV_SCREEN_KEY);
  me = null;
  queue = [];
  showAuth();
}

document.getElementById("btn-logout").addEventListener("click", logout);

// ---------- Auth tabs ----------
document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.getElementById("login-form").hidden = tab.dataset.tab !== "login";
    document.getElementById("register-form").hidden = tab.dataset.tab !== "register";
  });
});

// ---------- Photo preview (registration) ----------
["1", "2", "3"].forEach((n) => {
  const input = document.getElementById(`reg-photo-${n}`);
  const preview = document.getElementById(`reg-photo-${n}-preview`);
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    preview.classList.add("has-image");
    preview.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
    preview.textContent = "";
  });
});

// ---------- Login ----------
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("login-error");
  errEl.hidden = true;
  try {
    const name = document.getElementById("login-name").value.trim();
    const password = document.getElementById("login-password").value;
    const { token, profile } = await api("/login", { method: "POST", body: { name, password } });
    onAuthSuccess(token, profile);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
});

// ---------- Register ----------
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("register-error");
  errEl.hidden = true;
  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    const files = ["1", "2", "3"].map((n) => document.getElementById(`reg-photo-${n}`).files[0]);
    if (files.some((f) => !f)) throw new Error("Bitte alle drei Fotos auswählen.");
    const [bild_vor_name, bild_nach_department, bild_nach_jahre] = await Promise.all(files.map(uploadPhoto));
    const body = {
      name: document.getElementById("reg-name").value.trim(),
      alter: Number(document.getElementById("reg-alter").value),
      department: document.getElementById("reg-department").value.trim(),
      jahre_auf_xjam: Number(document.getElementById("reg-jahre").value),
      password: document.getElementById("reg-password").value,
      bild_vor_name,
      bild_nach_department,
      bild_nach_jahre,
    };
    const { token, profile } = await api("/register", { method: "POST", body });
    onAuthSuccess(token, profile);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Screen navigation ----------
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");
  document.querySelectorAll("nav.bottom .item").forEach((b) => b.classList.toggle("active", b.dataset.screen === name));
}

document.querySelectorAll("nav.bottom .item").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const screen = btn.dataset.screen;
    if (screen === sessionStorage.getItem(NAV_SCREEN_KEY)) return;

    if (!(await accountStillExists())) return logout();

    if (screen === "discover") await loadProfiles();
    else if (screen === "matches") await loadMatches();
    else if (screen === "profile") renderProfile();

    sessionStorage.setItem(NAV_SCREEN_KEY, screen);
    showScreen(screen);
  });
});

// ---------- Card stack / swipe ----------
const stackEl = document.getElementById("card-stack");
const emptyEl = document.getElementById("empty-state");

async function loadProfiles() {
  try {
    const { profiles } = await api("/profiles");
    queue = profiles;
  } catch {
    queue = [];
  }
  renderStack();
}

function buildCard(profile, isTop) {
  const photos = [profile.bild_vor_name, profile.bild_nach_department, profile.bild_nach_jahre];
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = profile.id;
  card.innerHTML = `
    <div class="img-block">
      <div class="img-dots">${photos.map((_, i) => `<span class="${i === 0 ? "active" : ""}"></span>`).join("")}</div>
      ${photos.map((src, i) => `<img src="${escapeHtml(src)}" class="${i === 0 ? "active" : ""}">`).join("")}
      <div class="img-tap-zone left" data-dir="-1"></div>
      <div class="img-tap-zone right" data-dir="1"></div>
      <div class="stamp like">LIKE</div>
      <div class="stamp nope">NOPE</div>
    </div>
    <div class="text-block">
      <div class="name-age">${escapeHtml(profile.name)}, ${profile.alter}</div>
      <div class="bio">${escapeHtml(profile.department)}</div>
      <div class="tags"><span class="tag">${profile.jahre_auf_xjam} Jahre auf xjam</span></div>
    </div>
  `;

  let photoIndex = 0;
  const imgs = card.querySelectorAll(".img-block img");
  const dots = card.querySelectorAll(".img-dots span");
  card.querySelectorAll(".img-tap-zone").forEach((zone) => {
    zone.addEventListener("click", () => {
      photoIndex = (photoIndex + Number(zone.dataset.dir) + photos.length) % photos.length;
      imgs.forEach((img, i) => img.classList.toggle("active", i === photoIndex));
      dots.forEach((dot, i) => dot.classList.toggle("active", i === photoIndex));
    });
  });

  if (!isTop) {
    card.style.transform = "scale(0.95) translateY(10px)";
    card.style.zIndex = 1;
  } else {
    card.style.zIndex = 2;
    enableDrag(card, profile);
  }
  return card;
}

function renderStack() {
  stackEl.innerHTML = "";
  if (queue.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  const visible = queue.slice(0, 2);
  visible.reverse().forEach((p, i) => {
    const isTop = i === visible.length - 1;
    stackEl.appendChild(buildCard(p, isTop));
  });
}

function enableDrag(card, profile) {
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
  const likeStamp = card.querySelector(".stamp.like");
  const nopeStamp = card.querySelector(".stamp.nope");

  function pointerDown(e) {
    dragging = true;
    card.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
  }
  function pointerMove(e) {
    if (!dragging) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    const rotate = dx / 12;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`;
    likeStamp.style.opacity = Math.min(Math.max(dx / 80, 0), 1);
    nopeStamp.style.opacity = Math.min(Math.max(-dx / 80, 0), 1);
  }
  function pointerUp() {
    if (!dragging) return;
    dragging = false;
    const threshold = 100;
    if (dx > threshold) {
      swipeAway(card, profile, "right");
    } else if (dx < -threshold) {
      swipeAway(card, profile, "left");
    } else {
      card.style.transition = "transform 0.3s ease";
      card.style.transform = "translate(0,0) rotate(0)";
      likeStamp.style.opacity = 0;
      nopeStamp.style.opacity = 0;
      setTimeout(() => { card.style.transition = ""; }, 300);
    }
    dx = 0; dy = 0;
  }

  card.addEventListener("pointerdown", pointerDown);
  card.addEventListener("pointermove", pointerMove);
  card.addEventListener("pointerup", pointerUp);
  card.addEventListener("pointercancel", pointerUp);
}

function swipeAway(card, profile, direction) {
  const flyX = direction === "right" ? 600 : -600;
  card.style.transition = "transform 0.4s ease, opacity 0.4s ease";
  card.style.transform = `translate(${flyX}px, -40px) rotate(${direction === "right" ? 30 : -30}deg)`;
  card.style.opacity = "0";
  setTimeout(async () => {
    queue = queue.filter((p) => p.id !== profile.id);
    const entscheidung = direction === "right" ? "like" : "dislike";
    try {
      const result = await api("/swipe", { method: "POST", body: { swiped_id: profile.id, entscheidung } });
      if (result.matched) handleMatch(result.profile);
    } catch {}
    renderStack();
  }, 320);
}

function handleMatch(matchProfile) {
  if (!matches.find((m) => m.id === matchProfile.id)) {
    matches.push(matchProfile);
  }
  renderMatches();
  showMatchPopup(matchProfile);
}

function showMatchPopup(profile) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.55);z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;gap:10px;";
  overlay.innerHTML = `
    <div style="font-size:38px;">🎉 It's a Match!</div>
    <img src="${escapeHtml(profile.bild_vor_name)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #fff;">
    <div style="font-size:16px;">Du und ${escapeHtml(profile.name)} habt gematcht</div>
    <button id="popup-chat" style="margin-top:14px;background:linear-gradient(135deg,#ff6a88,#ff9a5a);color:#fff;border:none;padding:10px 24px;border-radius:20px;font-weight:700;cursor:pointer;">Chat öffnen</button>
    <button id="popup-close" style="background:none;border:none;color:#fff;margin-top:6px;cursor:pointer;text-decoration:underline;">Weiterswipen</button>
  `;
  document.querySelector(".site").appendChild(overlay);
  overlay.querySelector("#popup-close").onclick = () => overlay.remove();
  overlay.querySelector("#popup-chat").onclick = () => {
    overlay.remove();
    openChat(profile.id);
  };
}

document.getElementById("btn-like").addEventListener("click", () => {
  const top = stackEl.querySelector('.card[style*="z-index: 2"]') || stackEl.lastElementChild;
  if (top) {
    const profile = queue.find((p) => p.id == top.dataset.id);
    if (profile) swipeAway(top, profile, "right");
  }
});
document.getElementById("btn-nope").addEventListener("click", () => {
  const top = stackEl.lastElementChild;
  if (top) {
    const profile = queue.find((p) => p.id == top.dataset.id);
    if (profile) swipeAway(top, profile, "left");
  }
});

// ---------- Matches ----------
const matchListEl = document.getElementById("match-list");
const matchesHint = document.getElementById("matches-hint");

async function loadMatches() {
  try {
    const { matches: serverMatches } = await api("/matches");
    matches = serverMatches;
  } catch {
    matches = [];
  }
  renderMatches();
}

function renderMatches() {
  matchListEl.innerHTML = "";
  matchesHint.hidden = matches.length > 0;
  matches.forEach((m) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <img class="match-avatar" src="${escapeHtml(m.bild_vor_name)}">
      <div class="match-info">
        <b>${escapeHtml(m.name)}</b>
        <span>${escapeHtml(m.last_message || "Sag Hallo!")}</span>
      </div>
    `;
    li.addEventListener("click", () => openChat(m.id));
    matchListEl.appendChild(li);
  });
}

// ---------- Chat ----------
const chatMessagesEl = document.getElementById("chat-messages");
const chatNameEl = document.getElementById("chat-name");

async function loadMessages(partnerId) {
  try {
    const { messages } = await api(`/messages?with=${partnerId}`);
    renderChatMessages(messages);
  } catch {}
}

async function openChat(id) {
  activeChatId = id;
  const match = matches.find((m) => m.id === id);
  chatNameEl.textContent = match ? match.name : "Chat";
  await loadMessages(id);
  stopChatPolling();
  chatPollTimer = setInterval(() => loadMessages(id), 3000);
  showScreen("chat");
}

function renderChatMessages(messages) {
  chatMessagesEl.innerHTML = "";
  messages.forEach((msg) => {
    const b = document.createElement("div");
    b.className = "bubble " + (msg.sender_id === me.id ? "me" : "them");
    b.textContent = msg.text;
    chatMessagesEl.appendChild(b);
  });
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

document.getElementById("chat-back").addEventListener("click", () => {
  stopChatPolling();
  showScreen("matches");
});

function openPartnerProfile(match) {
  document.getElementById("partner-profile-name").textContent = match.name;
  document.getElementById("partner-photo-1").src = match.bild_vor_name;
  document.getElementById("partner-photo-2").src = match.bild_nach_department;
  document.getElementById("partner-photo-3").src = match.bild_nach_jahre;
  document.getElementById("partner-name").textContent = match.name;
  document.getElementById("partner-alter").textContent = `${match.alter} Jahre`;
  document.getElementById("partner-department").textContent = match.department;
  document.getElementById("partner-jahre").textContent = `${match.jahre_auf_xjam} Jahre auf xjam`;
  showScreen("partner-profile");
}

document.getElementById("chat-view-profile").addEventListener("click", () => {
  const match = matches.find((m) => m.id === activeChatId);
  if (match) openPartnerProfile(match);
});

document.getElementById("partner-profile-back").addEventListener("click", () => showScreen("chat"));

document.getElementById("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-text");
  const text = input.value.trim();
  if (!text || activeChatId == null) return;
  input.value = "";
  try {
    await api("/messages", { method: "POST", body: { to: activeChatId, text } });
    await loadMessages(activeChatId);
  } catch {
    input.value = text;
  }
});

// ---------- Profile ----------
function renderProfile() {
  if (!me) return;
  document.getElementById("profile-photo-1").src = me.bild_vor_name;
  document.getElementById("profile-photo-2").src = me.bild_nach_department;
  document.getElementById("profile-photo-3").src = me.bild_nach_jahre;
  document.getElementById("profile-name").textContent = me.name;
  document.getElementById("profile-alter").textContent = `${me.alter} Jahre`;
  document.getElementById("profile-department").textContent = me.department;
  document.getElementById("profile-jahre").textContent = `${me.jahre_auf_xjam} Jahre auf xjam`;
}

// ---------- Init ----------
async function init() {
  if (localStorage.getItem("mm_token") && me) {
    if (await accountStillExists()) {
      showApp();
    } else {
      logout();
    }
  } else {
    showAuth();
  }
}
init();
