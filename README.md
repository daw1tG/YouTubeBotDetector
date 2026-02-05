# 🤖 YouTube Bot Detector

![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![Python](https://img.shields.io/badge/Python-scikit--learn-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-red)
![ML](https://img.shields.io/badge/Machine%20Learning-Explainable-informational)

A Chrome extension + backend system that detects and flags likely bot comments on YouTube using **behavioral feature engineering** and an **ML-ready pipeline**.

Built to prioritize **explainability, performance, and bias-aware detection**.

---

## 🚀 What It Does

- Flags likely bot comments **in real time** on YouTube
- Extracts behavioral signals (emoji spam, generic praise, repetition)
- Collects labeled data for supervised ML training
- Runs safely at scale using throttling & DOM observers
- Designed for explainable machine learning (not black-box NLP)

---

## 🧠 Detection Approach

Instead of usernames or language assumptions, the system models **how bots behave**:

- Generic, copy-paste praise  
- Emoji stuffing / emoji-only endings  
- Excessive punctuation (`!!!`, `??`)  
- Near-duplicate comments  
- Low specificity & engagement bait  

These are converted into numeric features for both:
- Frontend heuristics
- Backend ML classification

---

## 🧩 Architecture

Chrome Extension
│
├── Content Script (botDetector.js)
│ ├── Observes new comments via MutationObserver
│ ├── Extracts behavioral features
│ ├── Flags likely bots in the UI
│ └── Sends labeled data to backend
│
├── Background Service Worker
│ └── Fetches supplemental metadata
│
└── Local Storage
└── Caches data when backend is offline

Node.js Backend (Express)
│
├── POST /api/collect → stores labeled training data
└── POST /api/predict → returns bot probability (ML-ready)

Python ML Pipeline (scikit-learn)
└── Trains an explainable classifier on extracted features
---

## 🛠 Tech Stack

**Frontend**
- JavaScript (ES6)
- Chrome Extensions API (Manifest V3)
- MutationObserver + throttling

**Backend**
- Node.js
- Express
- CORS
- CSV-based dataset generation

**Machine Learning**
- Python
- pandas
- scikit-learn (Logistic Regression)

---

## 📈 Feature Engineering (Examples)

- Emoji count & emoji-to-word ratio  
- Generic praise phrase hits  
- Username entropy  
- Punctuation clustering  
- Comment length & structure  

All features are **interpretable** and **language-agnostic**.

---

## 🔮 Future Work

- Deploy ML inference with FastAPI
- Persistent storage (Postgres)
- Semantic similarity detection
- Active learning from user feedback

---

## 👤 Author

Built as a portfolio project exploring **browser automation, ML systems, and full-stack engineering**.
