// ---------- Data ----------
const PROFILES = [
  { id: 1, name: "Lisa", age: 18, emoji: "🏖️", gradient: "g1", distance: "3 Betten entfernt",
    bio: "Sucht Partner fürs Bananaboat 🚤 – Party bis 4 Uhr garantiert. Wer hält mit?",
    tags: ["Strand", "Party", "Volleyball"] },
  { id: 2, name: "Jonas", age: 19, emoji: "🎉", gradient: "g2", distance: "Zimmer 214",
    bio: "Bringt die Boxen mit. Wer plant die nächste Aftershowparty mit mir?",
    tags: ["Musik", "Karten spielen"] },
  { id: 3, name: "Mia", age: 18, emoji: "🍹", gradient: "g3", distance: "Am Pool",
    bio: "Cocktail-Ranking-Challenge – wer testet mit mir alle Drinks der Bar durch?",
    tags: ["Chillen", "Fotos", "Sonnenuntergang"] },
  { id: 4, name: "Tom", age: 19, emoji: "🏄", gradient: "g4", distance: "Strandbar",
    bio: "Erster Surfversuch am Mittwoch – Zuschauer und Lacher willkommen 😅",
    tags: ["Sport", "Abenteuer"] },
  { id: 5, name: "Nina", age: 18, emoji: "🌅", gradient: "g5", distance: "Rooftop",
    bio: "Sonnenaufgang gucken statt schlafen gehen – wer ist verrückt genug?",
    tags: ["Nachtschwärmer", "Musik"] },
  { id: 6, name: "Ben", age: 19, emoji: "🎮", gradient: "g6", distance: "Lobby",
    bio: "Pokerrunde am Abend? Ich bring die Chips, du das Glück.",
    tags: ["Spiele", "Chillen"] }
];

const OPENERS = ["Heeey 👋", "Na, schon am Pool gesehen?", "Bananaboat morgen dabei?", "Freu mich aufs Matchen 🎉"];

let queue = [...PROFILES];
let matches = JSON.parse(localStorage.getItem("mm_matches") || "[]");
let chats = JSON.parse(localStorage.getItem("mm_chats") || "{}");
let activeChatId = null;

// ---------- Screen navigation ----------
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");
  document.querySelectorAll("nav.bottom .item").forEach(b => b.classList.toggle("active", b.dataset.screen === name));
}

document.querySelectorAll("nav.bottom .item").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.screen));
});

// ---------- Card stack / swipe ----------
const stackEl = document.getElementById("card-stack");
const emptyEl = document.getElementById("empty-state");

function buildCard(profile, isTop) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = profile.id;
  card.innerHTML = `
    <div class="img-block ${profile.gradient}">
      ${profile.emoji}
      <div class="distance">${profile.distance}</div>
      <div class="stamp like">LIKE</div>
      <div class="stamp nope">NOPE</div>
    </div>
    <div class="text-block">
      <div class="name-age">${profile.name}, ${profile.age}</div>
      <div class="bio">${profile.bio}</div>
      <div class="tags">${profile.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
    </div>
  `;
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
  setTimeout(() => {
    queue = queue.filter(p => p.id !== profile.id);
    if (direction === "right") handleLike(profile);
    renderStack();
  }, 320);
}

function handleLike(profile) {
  const alreadyMatched = matches.find(m => m.id === profile.id);
  if (alreadyMatched) return;
  // simulate: every liked profile matches (fun for a small friend-group app)
  matches.push({ id: profile.id, name: profile.name, emoji: profile.emoji, gradient: profile.gradient });
  localStorage.setItem("mm_matches", JSON.stringify(matches));
  if (!chats[profile.id]) {
    chats[profile.id] = [{ from: "them", text: OPENERS[Math.floor(Math.random() * OPENERS.length)] }];
    localStorage.setItem("mm_chats", JSON.stringify(chats));
  }
  renderMatches();
  showMatchPopup(profile);
}

function showMatchPopup(profile) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.55);z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;gap:10px;";
  overlay.innerHTML = `
    <div style="font-size:38px;">🎉 It's a Match!</div>
    <div style="font-size:60px;">${profile.emoji}</div>
    <div style="font-size:16px;">Du und ${profile.name} habt gematcht</div>
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
    const profile = queue.find(p => p.id == top.dataset.id);
    if (profile) swipeAway(top, profile, "right");
  }
});
document.getElementById("btn-nope").addEventListener("click", () => {
  const top = stackEl.lastElementChild;
  if (top) {
    const profile = queue.find(p => p.id == top.dataset.id);
    if (profile) swipeAway(top, profile, "left");
  }
});
document.getElementById("btn-super").addEventListener("click", () => {
  const top = stackEl.lastElementChild;
  if (top) {
    const profile = queue.find(p => p.id == top.dataset.id);
    if (profile) swipeAway(top, profile, "right");
  }
});

// ---------- Matches ----------
const matchListEl = document.getElementById("match-list");
const matchesHint = document.getElementById("matches-hint");

function renderMatches() {
  matchListEl.innerHTML = "";
  matchesHint.hidden = matches.length > 0;
  matches.forEach(m => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="match-avatar ${m.gradient}">${m.emoji}</div>
      <div class="match-info">
        <b>${m.name}</b>
        <span>${(chats[m.id] || []).slice(-1)[0]?.text || "Sag Hallo!"}</span>
      </div>
    `;
    li.addEventListener("click", () => openChat(m.id));
    matchListEl.appendChild(li);
  });
}

// ---------- Chat ----------
const chatMessagesEl = document.getElementById("chat-messages");
const chatNameEl = document.getElementById("chat-name");

function openChat(id) {
  activeChatId = id;
  const match = matches.find(m => m.id === id);
  chatNameEl.textContent = match ? `${match.emoji} ${match.name}` : "Chat";
  renderChatMessages();
  showScreen("chat");
}

function renderChatMessages() {
  chatMessagesEl.innerHTML = "";
  (chats[activeChatId] || []).forEach(msg => {
    const b = document.createElement("div");
    b.className = "bubble " + (msg.from === "me" ? "me" : "them");
    b.textContent = msg.text;
    chatMessagesEl.appendChild(b);
  });
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

document.getElementById("chat-back").addEventListener("click", () => showScreen("matches"));

document.getElementById("chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-text");
  const text = input.value.trim();
  if (!text || activeChatId == null) return;
  chats[activeChatId] = chats[activeChatId] || [];
  chats[activeChatId].push({ from: "me", text });
  localStorage.setItem("mm_chats", JSON.stringify(chats));
  input.value = "";
  renderChatMessages();
  renderMatches();
});

// ---------- Profile ----------
const myName = document.getElementById("my-name");
const myBio = document.getElementById("my-bio");
const savedMsg = document.getElementById("saved-msg");

const savedProfile = JSON.parse(localStorage.getItem("mm_profile") || "null");
if (savedProfile) {
  myName.value = savedProfile.name;
  myBio.value = savedProfile.bio;
}

document.getElementById("save-profile").addEventListener("click", () => {
  localStorage.setItem("mm_profile", JSON.stringify({ name: myName.value, bio: myBio.value }));
  savedMsg.hidden = false;
  setTimeout(() => savedMsg.hidden = true, 1800);
});

// ---------- Init ----------
renderStack();
renderMatches();
