<div align="center">

# 🔒 Privami AI

**Local, private, and fully configurable AI in your pocket.**

[![React Native](https://img.shields.io/badge/React%20Native-0.74-61DAFB?style=flat-square&logo=react)](https://reactnative.dev/)
[![Android](https://img.shields.io/badge/Android-Supported-3DDC84?style=flat-square&logo=android)](https://developer.android.com/)
[![iOS](https://img.shields.io/badge/iOS-Coming%20Soon-000000?style=flat-square&logo=apple)](https://developer.apple.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Based on EdgeLLM](https://img.shields.io/badge/Fork%20of-EdgeLLM-orange?style=flat-square)](https://github.com/MekkCyber/EdgeLLM)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/U7T421CWU6)

</div>

---

## 📖 About

**Privami AI** is an AI assistant that runs **100% locally on your Android device** — no data sent to external servers, no cloud dependency for inference, and no per-message API costs.

On top of local inference, the app features **integrated web search via DuckDuckGo**, allowing the model to pull in up-to-date information from the internet when needed — all while keeping you in control.

Model parameters are **fully configurable** directly within the app, and the project supports a wide range of models in GGUF format.

> **Privami AI is a fork of [EdgeLLM](https://github.com/MekkCyber/EdgeLLM)** by [MekkCyber](https://github.com/MekkCyber), a project that demonstrates how to deploy large language models on edge devices using `llama.rn`. Privami AI builds on that foundation with a focus on privacy, usability, and advanced configurability.

---

## ✨ Features

- 🧠 **100% local inference** — your data never leaves the device
- 🔍 **Integrated web search** — fetch real-time results via DuckDuckGo with a single tap
- ⚙️ **Fully configurable model parameters** — temperature, top-p, top-k, repeat penalty, and more
- 💬 **Custom system prompt** — define the model's persona and behavior to fit your needs
- 🤖 **Multi-model support** — compatible with any GGUF-format model
- 📱 **Built with React Native** — solid cross-platform foundation
- 🍎 **iOS support planned** — coming in a future release
- 🔒 **Privacy by design** — no telemetry, no data collection, no external servers for inference

---

## 📸 Screenshots

> *(Add screenshots here)*

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [React Native CLI](https://reactnative.dev/docs/environment-setup)
- Android Studio with a configured emulator (or a physical Android device)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/privamiai.git
cd privamiai

# 2. Install dependencies
npm install

# 3. (iOS) Install native dependencies
cd ios && pod install && cd ..

# 4. Start the Metro bundler
npm start

# 5. In another terminal, run on Android
npm run android

# Or on iOS (when supported)
npm run ios
```

> **Tip:** Make sure the emulator or simulator is up and running before executing the last command.

---

## ⚙️ Model Configuration

Privami AI lets you tune the model's behavior directly from the app's settings. The available parameters include:

| Parameter | Description |
|---|---|
| `temperature` | Controls response creativity (0 = deterministic, 2 = very creative) |
| `top_p` | Nucleus sampling — filters tokens by cumulative probability |
| `repeat_penalty` | Penalizes repeated tokens to keep responses varied |
| `system_prompt` | Sets the model's persona, tone, and behavioral guidelines |

---

## 🔍 Web Search with DuckDuckGo

Web search in Privami AI is an **opt-in toggle** in the chat interface. Before sending a message, you can tap the **Web Search button** to enable it for that prompt. When active, the app fetches relevant results from DuckDuckGo and injects them as context into the model — giving it access to real-time information without ever leaving the app.

DuckDuckGo requires **no API key** and does not track your searches.

Here's how the flow works once enabled:

1. You tap the **Web Search** button before typing your prompt
2. You send your message
3. The app queries DuckDuckGo and retrieves the top results
4. Those results are passed as context to the local model
5. The model generates a response grounded in both its own knowledge and the fetched results

> You stay in full control — web search only runs when you explicitly toggle it on.

---

## 🤖 Supported Models

- `Llama 3.2 1B` — great for low-RAM devices
- `Qwen2.5 0.5B` — lightweight and efficient
- `DeepSeek-R1-Distill-Qwen-1.5B`
- `SmolLM2-1.7B`

> Prefer quantized versions (e.g. `Q4_K_M`, `Q6`) for best performance on mobile hardware.

---

## 🏗️ Tech Stack

- [React Native](https://reactnative.dev/) — main framework
- [llama.rn](https://github.com/mybigday/llama.rn) — React Native wrapper for llama.cpp
- [llama.cpp](https://github.com/ggerganov/llama.cpp) — local inference engine
- [DuckDuckGo Search API](https://duckduckgo.com/) — privacy-respecting web search

---

## 🙏 Credits

This project is based on the work of **[EdgeLLM](https://github.com/MekkCyber/EdgeLLM)** by [MekkCyber](https://github.com/MekkCyber), which laid the groundwork for running LLMs on edge devices with React Native. Without that project, Privami AI wouldn't exist.

---

## 📄 License

Distributed under the GPL 3.0 License. See [LICENSE](LICENSE) for more details.

---

<div align="center">

Built with ❤️ and a focus on privacy.

</div>
