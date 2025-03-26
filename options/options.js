document.addEventListener("DOMContentLoaded", () => {
  // Tab switching
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");

      // Update active tab button
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Show corresponding content
      tabContents.forEach((content) => content.classList.remove("active"));
      document.getElementById(`${tabId}-tab`).classList.add("active");
    });
  });

  // Load saved settings
  loadSettings();

  // Form submission handlers
  document
    .getElementById("aiSettingsForm")
    .addEventListener("submit", saveAiSettings);
  document
    .getElementById("kbSettingsForm")
    .addEventListener("submit", saveKbSettings);

  // Connection test buttons
  document
    .getElementById("testAiConnection")
    .addEventListener("click", testAiConnection);
  document
    .getElementById("testKbConnection")
    .addEventListener("click", testKbConnection);

  // Populate models when provider changes
  document.getElementById("aiProvider");
});

async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    "aiProvider",
    "baseUrl",
    "apiKey",
    "model",
    "models",
    "emotionPrompt",
    "summaryPrompt",
    "composePrompt",
    "optimizePrompt",
    "kbProvider",
    "kbBaseUrl",
    "kbApiKey",
    "kbKnID",
  ]);
  if (settings.models)
    settings.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      document.getElementById("model").appendChild(option);
    });

  // AI Settings
  if (settings.aiProvider) {
    document.getElementById("aiProvider").value = settings.aiProvider;
  }
  if (settings.baseUrl)
    document.getElementById("baseUrl").value = settings.baseUrl;
  if (settings.apiKey)
    document.getElementById("apiKey").value = settings.apiKey;
  // if (settings.model) document.getElementById("model").value = settings.model;
  // Prompt templates
  if (settings.emotionPrompt)
    document.getElementById("emotionPrompt").value = settings.emotionPrompt;
  if (settings.summaryPrompt)
    document.getElementById("summaryPrompt").value = settings.summaryPrompt;
  if (settings.composePrompt)
    document.getElementById("composePrompt").value = settings.composePrompt;
  if (settings.optimizePrompt)
    document.getElementById("optimizePrompt").value = settings.optimizePrompt;

  // KB Settings
  if (settings.kbProvider)
    document.getElementById("kbProvider").value = settings.kbProvider;
  if (settings.kbBaseUrl)
    document.getElementById("kbBaseUrl").value = settings.kbBaseUrl;
  if (settings.kbApiKey)
    document.getElementById("kbApiKey").value = settings.kbApiKey;
  if (settings.kbKnID)
    document.getElementById("kbKnID").value = settings.kbKnID;
}

async function saveAiSettings(e) {
  e.preventDefault();

  const settings = {
    aiProvider: document.getElementById("aiProvider").value,
    baseUrl: document.getElementById("baseUrl").value,
    apiKey: document.getElementById("apiKey").value,
    model: document.getElementById("model").value,
    emotionPrompt: document.getElementById("emotionPrompt").value,
    summaryPrompt: document.getElementById("summaryPrompt").value,
    composePrompt: document.getElementById("composePrompt").value,
    optimizePrompt: document.getElementById("optimizePrompt").value,
  };

  await chrome.storage.sync.set(settings);
  showSaveSuccess("AI settings saved successfully");
}

async function saveKbSettings(e) {
  e.preventDefault();

  const settings = {
    kbProvider: document.getElementById("kbProvider").value,
    kbBaseUrl: document.getElementById("kbBaseUrl").value,
    kbApiKey: document.getElementById("kbApiKey").value,
    kbKnID: document.getElementById("kbKnID").value,
  };

  await chrome.storage.sync.set(settings);
  showSaveSuccess("Knowledge Base settings saved successfully");
}

async function testAiConnection() {
  const testResult = document.getElementById("aiTestResult");
  testResult.textContent = "Testing...";

  const modelSelect = document.getElementById("model");
  modelSelect.disabled = true;
  modelSelect.innerHTML = '<option value="">Loading models...</option>';

  try {
    const baseUrl = document.getElementById("baseUrl").value;
    if (!baseUrl) {
      throw new Error("Please enter a Base URL");
    }

    // Ensure URL ends with /
    const apiUrl = baseUrl.endsWith("/")
      ? `${baseUrl}api/tags`
      : `${baseUrl}/api/tags`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      testResult.textContent = "Connection error!";
    }

    const data = await response.json();
    testResult.textContent = "Connection successful!";
    const models = data.models.map((model) => model.name);
    await chrome.storage.sync.set({
      models: models,
    });
    modelSelect.innerHTML = "";
    models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });

    modelSelect.disabled = false;
  } catch (error) {
    modelSelect.innerHTML = '<option value="">Failed to load models</option>';
    testResult.textContent = "Connection error!";

    console.error("Error loading models:", error);
  }
}

async function testKbConnection() {
  const testResult = document.getElementById("kbTestResult");
  testResult.textContent = "Testing...";

  const apiUrl = baseUrl.endsWith("/")
    ? `${baseUrl}api/tags`
    : `${baseUrl}/api/tags`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    testResult.textContent = "Connection error!";
  } else {
    testResult.textContent = "Connection success!";
  }
}

function showSaveSuccess(message) {
  const notification = document.createElement("div");
  notification.className = "save-notification";
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #4CAF50;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 1000;
  `;

  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}
