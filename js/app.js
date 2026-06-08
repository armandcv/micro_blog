// Theme management
const THEME_KEY = "blog-theme";

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY);
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  updateToggleButton(theme);
}

function updateToggleButton(theme) {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const icon = btn.querySelector(".icon");
  const label = btn.querySelector(".label");
  if (theme === "dark") {
    icon.textContent = "☀️";
    label.textContent = "Light";
    btn.setAttribute("aria-label", "Switch to light mode");
  } else {
    icon.textContent = "🌙";
    label.textContent = "Dark";
    btn.setAttribute("aria-label", "Switch to dark mode");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

function initTheme() {
  const theme = getStoredTheme() || getSystemTheme();
  applyTheme(theme);
}

// Format date from YYYY-MM-DD
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Post list page
async function loadPostList() {
  const container = document.getElementById("post-list");
  if (!container) return;

  try {
    const res = await fetch("posts/posts.json");
    if (!res.ok) throw new Error("No se pudo cargar la lista de posts.");
    const posts = await res.json();

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Aún no hay posts publicados.</p>
          <p>Agrega archivos <code>.md</code> en la carpeta <code>posts/</code> y actualiza <code>posts.json</code>.</p>
        </div>`;
      return;
    }

    // Sort by date descending
    posts.sort((a, b) => b.date.localeCompare(a.date));

    container.innerHTML = posts.map(post => `
      <article class="post-card">
        <div class="post-card-meta">
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          ${post.tags ? post.tags.map(t => `<span>#${t}</span>`).join("") : ""}
        </div>
        <h2 class="post-card-title">
          <a href="post.html?slug=${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a>
        </h2>
        ${post.excerpt ? `<p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>` : ""}
        <a class="read-more" href="post.html?slug=${encodeURIComponent(post.slug)}">Leer más →</a>
      </article>
    `).join("");
  } catch (err) {
    container.innerHTML = `<div class="error-msg">Error: ${escapeHtml(err.message)}</div>`;
  }
}

// Post page
async function loadPost() {
  const body = document.getElementById("post-body");
  const headerEl = document.getElementById("post-header");
  if (!body) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    body.innerHTML = `<div class="error-msg">No se especificó ningún post.</div>`;
    return;
  }

  try {
    const res = await fetch(`posts/${encodeURIComponent(slug)}.md`);
    if (!res.ok) throw new Error(`Post "${slug}" no encontrado.`);
    const markdown = await res.text();

    // Parse frontmatter (--- key: value ---)
    const { meta, content } = parseFrontmatter(markdown);

    // Update page title
    if (meta.title) {
      document.title = `${meta.title} — Mi Blog`;
    }

    // Render header
    if (headerEl) {
      headerEl.innerHTML = `
        <h1>${escapeHtml(meta.title || slug)}</h1>
        <div class="post-meta">
          ${meta.date ? `<time datetime="${meta.date}">${formatDate(meta.date)}</time>` : ""}
          ${meta.author ? `<span>por ${escapeHtml(meta.author)}</span>` : ""}
          ${meta.tags ? meta.tags.map(t => `<span>#${t}</span>`).join("") : ""}
        </div>
      `;
    }

    // Render markdown
    body.innerHTML = marked.parse(content);
  } catch (err) {
    body.innerHTML = `<div class="error-msg">Error: ${escapeHtml(err.message)}</div>`;
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, content: text };

  const meta = {};
  const rawMeta = match[1];
  const content = match[2];

  rawMeta.split("\n").forEach(line => {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Handle arrays: [a, b, c]
    if (value.startsWith("[") && value.endsWith("]")) {
      meta[key] = value.slice(1, -1).split(",").map(v => v.trim());
    } else {
      // Remove surrounding quotes
      meta[key] = value.replace(/^["']|["']$/g, "");
    }
  });

  return { meta, content };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleTheme);
  }

  // Also react to system preference changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    if (!getStoredTheme()) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });

  loadPostList();
  loadPost();
});
