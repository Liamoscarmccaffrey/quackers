const generateBtn = document.getElementById("generate-btn");
const result = document.getElementById("result");
const duckName = document.getElementById("duck-name");
const duckImage = document.getElementById("duck-image");
const duckDescription = document.getElementById("duck-description");
const statusEl = document.getElementById("status");

const dockCullBtn = document.getElementById("dock-cull");
const dockMarryBtn = document.getElementById("dock-marry");
const dockOrganizeBtn = document.getElementById("dock-organize");
const dockAdviceBtn = document.getElementById("dock-advice");

const adviceModal = document.getElementById("advice-modal");
const adviceCloseBtn = document.getElementById("advice-close");

const fallbackDuckNames = [
  "Captain Waddle",
  "Lady Pondington",
  "Sir Quacksworth",
  "Mallory Mallard",
  "Puddle Duke",
  "Beaky Blinders"
];

function pickFallbackDuckName() {
  const index = Math.floor(Math.random() * fallbackDuckNames.length);
  return fallbackDuckNames[index];
}

async function getRandomDuckName() {
  try {
    const response = await fetch("/api/duck-name");
    if (response.ok) {
      const data = await response.json();
      if (typeof data?.name === "string" && data.name.trim().length > 0) {
        return data.name.trim();
      }
    }
  } catch (_error) {
    // Fall back to local names if API call fails.
  }

  return pickFallbackDuckName();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadCertificate(humanName, duckPartner) {
  const issuedOn = new Date().toLocaleString();
  const safeHumanName = escapeHtml(humanName);
  const safeDuckName = escapeHtml(duckPartner);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Duck Marriage Certificate</title>
  <style>
    body { font-family: Georgia, serif; padding: 2rem; background: #fffbe8; color: #1f2937; }
    .frame { border: 7px double #7c3aed; padding: 2rem; max-width: 800px; margin: 0 auto; background: #ffffff; }
    h1 { text-align: center; margin: 0 0 1rem; text-transform: uppercase; letter-spacing: 0.08em; }
    p { font-size: 1.1rem; line-height: 1.6; }
    .big { font-size: 1.35rem; font-weight: 700; }
    .sig { margin-top: 2rem; display: flex; justify-content: space-between; gap: 1rem; }
    .line { border-top: 2px solid #1f2937; padding-top: 0.3rem; width: 45%; text-align: center; font-weight: 700; }
  </style>
</head>
<body>
  <div class="frame">
    <h1>Marriage Certificate</h1>
    <p>This certifies that <span class="big">${safeHumanName}</span> and <span class="big">${safeDuckName}</span> have entered into a completely serious and legally questionable duck marriage.</p>
    <p>Issued on: ${escapeHtml(issuedOn)}</p>
    <p>May your pond be peaceful, your breadcrumbs plentiful, and your arguments mostly limited to honking volume.</p>
    <div class="sig">
      <div class="line">Human Signature</div>
      <div class="line">Duck Footprint</div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `duck-marriage-certificate-${duckPartner
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function openModal(modal) {
  if (modal instanceof HTMLElement) {
    modal.classList.remove("hidden");
  }
}

function closeModal(modal) {
  if (modal instanceof HTMLElement) {
    modal.classList.add("hidden");
  }
}

async function generateDuck() {
  if (!(statusEl instanceof HTMLElement)) {
    return;
  }

  statusEl.textContent = "Generating duck...";
  if (generateBtn instanceof HTMLButtonElement) {
    generateBtn.disabled = true;
  }

  try {
    const response = await fetch("/api/duck");

    if (!response.ok) {
      let message = "Could not generate duck.";
      try {
        const errorData = await response.json();
        if (typeof errorData?.error === "string" && errorData.error.trim()) {
          message = errorData.error;
        }
      } catch (_error) {
        // Ignore JSON parsing failures and keep fallback message.
      }
      throw new Error(message);
    }

    const data = await response.json();

    if (duckName instanceof HTMLElement) {
      duckName.textContent = data.name;
    }
    if (duckImage instanceof HTMLImageElement) {
      duckImage.src = data.imageUrl;
    }
    if (duckDescription instanceof HTMLElement) {
      duckDescription.textContent = data.description;
    }

    if (result instanceof HTMLElement) {
      result.classList.remove("hidden");
    }

    if (Array.isArray(data.warnings) && data.warnings.length > 0) {
      statusEl.textContent = `Generated with fallback: ${data.warnings[0]}`;
    } else {
      statusEl.textContent = "";
    }
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "Unknown error";
  } finally {
    if (generateBtn instanceof HTMLButtonElement) {
      generateBtn.disabled = false;
    }
  }
}

if (generateBtn instanceof HTMLButtonElement) {
  generateBtn.addEventListener("click", generateDuck);
}

if (dockCullBtn instanceof HTMLButtonElement) {
  dockCullBtn.addEventListener("click", () => {
    if (!(statusEl instanceof HTMLElement)) {
      return;
    }

    statusEl.textContent = "Cull sequence running...";

    const onCullComplete = () => {
      window.removeEventListener("duck:cull-complete", onCullComplete);

      const rspbTab = window.open("https://www.rspb.org.uk/", "_blank", "noopener,noreferrer");
      if (rspbTab) {
        window.focus();
        statusEl.textContent = "Pond cleared. RSPB opened in a new tab.";
      } else {
        statusEl.textContent = "Pond cleared. Allow pop-ups to open RSPB automatically.";
      }
    };

    window.addEventListener("duck:cull-complete", onCullComplete);
    window.dispatchEvent(new CustomEvent("duck:cull"));
  });
}

if (dockMarryBtn instanceof HTMLButtonElement) {
  dockMarryBtn.addEventListener("click", async () => {
    if (!(statusEl instanceof HTMLElement)) {
      return;
    }

    const humanNameInput = window.prompt(
      "Enter your name for the duck marriage certificate:",
      "Mysterious Human"
    );

    if (humanNameInput === null) {
      statusEl.textContent = "Duck wedding cancelled.";
      return;
    }

    const humanName = humanNameInput.trim() || "Mysterious Human";
    const duckPartner = await getRandomDuckName();
    downloadCertificate(humanName, duckPartner);
    statusEl.textContent = `${humanName} is now officially married to ${duckPartner}. Certificate downloaded.`;
  });
}

if (dockOrganizeBtn instanceof HTMLButtonElement) {
  dockOrganizeBtn.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("duck:organize"));
    if (statusEl instanceof HTMLElement) {
      statusEl.textContent = "Ducks organized into formation. Excess ducks removed.";
    }
  });
}

if (dockAdviceBtn instanceof HTMLButtonElement) {
  dockAdviceBtn.addEventListener("click", () => {
    openModal(adviceModal);
  });
}

if (adviceCloseBtn instanceof HTMLButtonElement) {
  adviceCloseBtn.addEventListener("click", () => {
    closeModal(adviceModal);
  });
}

if (adviceModal instanceof HTMLElement) {
  adviceModal.addEventListener("click", (event) => {
    if (event.target === adviceModal) {
      closeModal(adviceModal);
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal(adviceModal);
  }
});
