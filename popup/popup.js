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

      // Show corresponding content (using display style)
      tabContents.forEach((content) => {
        content.style.display = "none";
      });
      document.getElementById(`${tabId}-tab`).style.display = "block";
    });
  });
  // Action buttons
  const actionButtons = {
    emotion: document.getElementById("emotionBtn"),
    summary: document.getElementById("summaryBtn"),
    compose: document.getElementById("composeBtn"),
    optimize: document.getElementById("optimizeBtn"),
  };

  // Result containers
  const resultContainers = {
    emotion: document.getElementById("emotionResult"),
    summary: document.getElementById("summaryResult"),
    compose: document.getElementById("composeResult"),
    optimize: document.getElementById("optimizeResult"),
  };

  // Load saved results on startup
  loadSavedResults();
  getInfo();

  // Handle action button clicks
  Object.entries(actionButtons).forEach(([action, btn]) => {
    btn.addEventListener("click", async () => {
      try {
        showLoading(action);
        const result = await handleAction(action);
        showResult(action, result);
        saveResult(action, result);
      } catch (error) {
        showError(action, error.message);
      }
    });
  });

  async function loadSavedResults() {
    const results = await chrome.storage.sync.get([
      "emotionResult",
      "summaryResult",
      "composeResult",
      "optimizeResult",
    ]);

    // if (results.emotionResult) {
    //   resultContainers.emotion.innerHTML = `<div class="result">${results.emotionResult}</div>`;
    // }
    if (results.summaryResult) {
      resultContainers.summary.innerHTML = `<div class="result">${results.summaryResult}</div>`;
    }
    if (results.composeResult) {
      resultContainers.compose.innerHTML = `<div class="result">${results.composeResult}</div>`;
    }
    if (results.optimizeResult) {
      resultContainers.optimize.innerHTML = `<div class="result">${results.optimizeResult}</div>`;
    }
  }

  async function saveResult(action, result) {
    const cleanedResult = result.replace(/<think>.*?<\/think>/gs, "");
    await chrome.storage.sync.set({
      [`${action}Result`]: cleanedResult,
    });
  }

  async function getInfo() {
    const settings = await chrome.storage.sync.get([
      "aiProvider",
      "apiKey",
      "baseUrl",
      "model",
      "kbBaseUrl",
      "kbApiKey",
      "emotionPrompt",
      "summaryPrompt",
      "composePrompt",
      "optimizePrompt",
    ]);
    document.getElementById("model").innerHTML = settings.model;
  }
  function showLoading(action) {
    resultContainers[action].innerHTML = '<div class="loader"></div>';
  }

  function showResult(action, result) {
    const cleanedResult = result.replace(/<think>.*?<\/think>/gs, "");
    resultContainers[
      action
    ].innerHTML = `<div class="result">${cleanedResult}</div>`;
  }

  function showError(action, message) {
    resultContainers[
      action
    ].innerHTML = `<div class="error">Error: ${message}</div>`;
  }

  async function handleAction(action) {
    // Get current tab's content
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection();
        return selection ? selection.toString() : "";
      },
    });

    const text = result[0].result;
    if (!text) {
      throw new Error("请先选中要分析的内容");
    }

    const settings = await chrome.storage.sync.get([
      "aiProvider",
      "apiKey",
      "baseUrl",
      "model",
      "kbBaseUrl",
      "kbApiKey",
      "kbKnID",
      "emotionPrompt",
      "summaryPrompt",
      "composePrompt",
      "optimizePrompt",
    ]);

    // Call appropriate API based on action
    switch (action) {
      case "emotion":
        return analyzeEmotion(text, settings);
      case "summary":
        return summarizeContent(text, settings);
      case "compose":
        return composeReply(text, settings);
      case "optimize":
        return optimizeReply(text, settings);
      default:
        throw new Error("Invalid action");
    }
  }

  async function analyzeEmotion(text, settings) {
    try {
      const { baseUrl, apiKey, model, emotionPrompt } = settings;
      if (!baseUrl || !apiKey || !model || !emotionPrompt) {
        throw new Error("Missing required settings");
      }
      const prompt = emotionPrompt.replace("{text}", text);
      const apiUrl = baseUrl.endsWith("/")
        ? `${baseUrl}api/generate`
        : `${baseUrl}/api/generate`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status}, ${errorText}`);
      }

      const data = await response.json();
      let result = data.response || "";
      result = result.replace(/<think>.*?<\/think>/gs, "");
      return result.trim();
    } catch (error) {
      console.error("Emotion analysis error:", error);
      throw error;
    }
  }

  async function summarizeContent(text, settings) {
    try {
      const { baseUrl, apiKey, model, summaryPrompt } = settings;
      if (!baseUrl || !apiKey || !model || !summaryPrompt) {
        throw new Error("Missing required settings");
      }
      const prompt = summaryPrompt.replace("{text}", text);
      const apiUrl = baseUrl.endsWith("/")
        ? `${baseUrl}api/generate`
        : `${baseUrl}/api/generate`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status}, ${errorText}`);
      }

      const data = await response.json();
      let result = data.response || "";
      result = result.replace(/<think>.*?<\/think>/gs, "");
      return result.trim();
    } catch (error) {
      console.error("Emotion analysis error:", error);
      throw error;
    }
  }

  async function composeReply(text, settings) {
    let kb;

    const { baseUrl, kbBaseUrl, kbApiKey, kbKnID, model, composePrompt } =
      settings;
    if (
      !baseUrl ||
      !kbBaseUrl ||
      !kbApiKey ||
      !kbKnID ||
      !model ||
      !composePrompt
    ) {
      throw new Error("Missing required settings");
    }
    try {
      const apiUrl = kbBaseUrl.endsWith("/")
        ? `${kbBaseUrl}api/v1/retrieval`
        : `${kbBaseUrl}/api/v1/retrieval`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kbApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset_ids: [kbKnID],
          question: text,
          limit: "0.75",
          similarity_threshold: "0.1",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status}, ${errorText}`);
      }

      const data = await response.json();

      chunks = data.data.chunks;
      const allContent = chunks.map((chunk) => chunk.content).join("\n");
      kb = allContent.trim();
    } catch (error) {
      console.error("Compose Reply error:", error);
      throw error;
    }

    try {
      let prompt1 = composePrompt.replace("{text1}", text);
      let prompt = prompt1.replace("{text2}", kb);
      const apiUrl = baseUrl.endsWith("/")
        ? `${baseUrl}api/generate`
        : `${baseUrl}/api/generate`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kbApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status}, ${errorText}`);
      }
      const data = await response.json();
      let result = data.response || "";
      result = result.replace(/<think>.*?<\/think>/gs, "");
      return result.trim();
    } catch (error) {
      console.error("Compose Reply error:", error);
      throw error;
    }
  }

  async function optimizeReply(text, settings) {
    return "Optimized content would appear here";
  }
});
