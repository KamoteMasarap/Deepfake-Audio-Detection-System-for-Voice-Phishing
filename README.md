# Deepfake Audio Detection System for Voice Phishing (Vishing) Defense

[![Project Status: Final Defense](https://img.shields.io/badge/Project%20Status-Final%20Defense-green)](https://github.com/)
[![Accuracy](https://img.shields.io/badge/Accuracy-95.1%25-blue)](https://github.com/)
[![EER](https://img.shields.io/badge/EER-6.3%25-red)](https://github.com/)

## 📌 Project Overview
This system is a specialized cybersecurity solution designed to detect AI-generated voices used in **Voice Phishing (Vishing)** attacks. By combining deep learning image recognition (**ResNet-18**) with a deterministic **Acoustic Physics Engine**, the platform identifies synthetic spectral anomalies and biological impossibilities in audio signals.

### Performance Summary
* **Accuracy:** 95.1%
* **Equal Error Rate (EER):** 6.3%
* **ROC-AUC:** 0.97
* **Primary Datasets:** ASVspoof 5, FLEURS (Tagalog/Taglish), and Kaggle "In the Wild"

---

## 🛠️ System Architecture & Design
The system utilizes **Deterministic Scoring Fusion** to provide a "Mathematical Receipt" for every verdict, ensuring transparency and Explainable AI (XAI).

### Component Descriptions
1.  **Input & Preprocessing:** Handles .wav/.mp3 ingestion, standardizing audio to a 16kHz sampling rate and 4-second duration.
2.  **Parallel Feature Extraction:** Simultaneously generates Mel-Spectrograms for neural analysis and extracts acoustic markers (Pitch, ZCR, MFCC, Onset) for physics-based verification.
3.  **Deep Learning & Physics Fusion:** Combines ResNet-18 likelihood scores with rule-based adjustments from the Physics Engine to calculate the final probability.
4.  **Results Interface:** Renders the "Unified Analysis Card," showing the final percentage alongside a forensic breakdown of detected traits.

---

## 🚀 Installation & Setup

### Prerequisites
* Python 3.9+
* Node.js 16+
* PyTorch & Librosa

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### 2. Frontend (React)

```bash
cd frontend
npm install
npm start
