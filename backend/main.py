from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import resnet18
from torchvision import transforms
from PIL import Image
import librosa
import librosa.display
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import os
import shutil
import base64
from io import BytesIO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DeepfakeCNN(nn.Module):
    def __init__(self):
        super(DeepfakeCNN, self).__init__()
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.relu = nn.ReLU()
        self.pool = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.fc1 = nn.Linear(32 * 32 * 32, 128)
        self.fc2 = nn.Linear(128, 2)

    def forward(self, x):
        x = self.pool(self.relu(self.conv1(x)))
        x = self.pool(self.relu(self.conv2(x)))
        x = x.view(-1, 32 * 32 * 32)
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x

def get_resnet_model():
    model = resnet18(weights=None)
    model.conv1 = nn.Conv2d(1, 64, kernel_size=(7, 7), stride=(2, 2), padding=(3, 3), bias=False)
    model.fc = nn.Sequential(
        nn.Linear(model.fc.in_features, 1),
        nn.Sigmoid()
    )
    return model

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
models_dir = os.path.join(os.path.dirname(__file__), "models")

print("Booting Dual AI Engines...")

model_super = DeepfakeCNN().to(device)
super_path = os.path.join(models_dir, "super_model.pth")
if os.path.exists(super_path):
    model_super.load_state_dict(torch.load(super_path, map_location=device, weights_only=True))
    model_super.eval()
    print("✅ 12k Super Model Loaded!")

model_resnet = get_resnet_model().to(device)
resnet_path = os.path.join(models_dir, "resnet18_deepfake_brain.pth")
if os.path.exists(resnet_path):
    model_resnet.load_state_dict(torch.load(resnet_path, map_location=device, weights_only=True))
    model_resnet.eval()
    print("✅ ResNet-18 Model Loaded!")

transform_rgb = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

transform_gray = transforms.Compose([
    transforms.Grayscale(num_output_channels=1), 
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5], std=[0.5])
])
classes = ['FAKE', 'REAL']

@app.post("/analyze")
def analyze_audio(file: UploadFile = File(...)):
    print(f"\n--- NEW DUAL ANALYSIS REQUEST: {file.filename} ---")
    temp_audio_path = f"temp_{file.filename}"
    temp_img_path = "temp_spectrogram.png"
    
    try:
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print("Step 1: Loading audio with librosa...")
        audio_data, sample_rate = librosa.load(temp_audio_path, sr=16000)
        
        print("Step 2: Extracting Dynamic Audio Features (Level 1)...")
        f0, voiced_flag, voiced_probs = librosa.pyin(audio_data, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
        valid_f0 = f0[~np.isnan(f0)]
        pitch_variation = np.std(valid_f0) if len(valid_f0) > 0 else 0
        
        flatness = np.mean(librosa.feature.spectral_flatness(y=audio_data))
        
        tempo, _ = librosa.beat.beat_track(y=audio_data, sr=sample_rate)
        tempo = float(tempo[0]) if isinstance(tempo, np.ndarray) else float(tempo)
        
        zcr = np.mean(librosa.feature.zero_crossing_rate(audio_data))

        print("Step 2.5: Extracting Advanced XAI Features (Level 2)...")
        # 1. MFCC Variance (Vocal Tract Shape)
        mfccs = librosa.feature.mfcc(y=audio_data, sr=sample_rate, n_mfcc=13)
        mfcc_variance = float(np.mean(np.var(mfccs, axis=1)))

        # 2. Spectral Roll-off (High-Frequency Cutoff/Hiss)
        rolloff = librosa.feature.spectral_rolloff(y=audio_data, sr=sample_rate, roll_percent=0.85)[0]
        rolloff_mean = float(np.mean(rolloff))

        # 3. Onset Envelope Variance (Syllable Attack Emphasis)
        onset_env = librosa.onset.onset_strength(y=audio_data, sr=sample_rate)
        onset_variance = float(np.var(onset_env))

        print("Step 3: Forcing audio to exactly 4 seconds...")
        audio_data = librosa.util.fix_length(audio_data, size=64000)

        print("Step 4: Generating Spectrograms...")
        mel_spect = librosa.feature.melspectrogram(y=audio_data, sr=sample_rate, n_mels=128)
        mel_spect_db = librosa.power_to_db(mel_spect, ref=np.max)

        plt.figure(figsize=(5, 5))
        plt.axis('off')
        librosa.display.specshow(mel_spect_db, sr=sample_rate)
        
        buf = BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
        plt.savefig(temp_img_path, bbox_inches='tight', pad_inches=0)
        plt.clf()
        plt.close('all')
        
        img_str = base64.b64encode(buf.getvalue()).decode()
        img = Image.open(temp_img_path).convert('RGB')
        
        print(" -> Running inference on 12k Super Model...")
        img_tensor_rgb = transform_rgb(img).unsqueeze(0).to(device)
        with torch.no_grad():
            logits_super = model_super(img_tensor_rgb)
            probs_super = F.softmax(logits_super, dim=1)
            conf_super, pred_super = torch.max(probs_super, 1)
            super_verdict = classes[pred_super.item()]
            super_confidence = round(conf_super.item() * 100, 2)

        print(" -> Running inference on ResNet-18...")
        img_tensor_gray = transform_gray(img).unsqueeze(0).to(device)
        with torch.no_grad():
            prob_resnet = model_resnet(img_tensor_gray).item()
            base_fake_prob = prob_resnet
            
            # --- START ACOUSTIC MODIFIER (BONUS/PENALTY & VETO) ---
            acoustic_modifier = 0.0
            override_msg = None

            # 1. PITCH VARIATION CHECK (Level 1)
            if pitch_variation < 5.0:
                acoustic_modifier += 0.45
                override_msg = "🚨 VETO: Biologically impossible pitch variation (Robotic)."
            elif pitch_variation < 14.5:
                acoustic_modifier += 0.25 
                if not override_msg:
                    override_msg = "🚨 VETO: Extremely stiff speech cadence detected."
            elif pitch_variation > 25.0:
                acoustic_modifier -= 0.15

            # 2. ZERO CROSSING RATE CHECK (Level 1)
            if zcr < 0.01:
                acoustic_modifier += 0.35
                if not override_msg:
                    override_msg = "🚨 VETO: Zero natural breath sounds detected."
            elif zcr < 0.05:
                acoustic_modifier += 0.05

            # 3. MFCC VARIANCE CHECK (Level 2: Vocal Tract)
            if mfcc_variance < 150.0: 
                acoustic_modifier += 0.20
                if not override_msg:
                    override_msg = "🚨 VETO: Synthetic vocal tract detected (Low MFCC Variance)."
            
            # 4. SPECTRAL ROLL-OFF CHECK (Level 2: Muffled/Hiss)
            if rolloff_mean < 2000.0:
                acoustic_modifier += 0.15
                if not override_msg:
                    override_msg = "🚨 VETO: Unnatural high-frequency cutoff (Muffled)."
                    
            # 5. ONSET VARIANCE CHECK (Level 2: Syllable Attack)
            if onset_variance < 0.5:
                acoustic_modifier += 0.15
                if not override_msg:
                    override_msg = "🚨 VETO: Robotic syllable emphasis (Uniform Onset)."

            # --- CALCULATE TRUE FINAL ---
            final_fake_prob = base_fake_prob + acoustic_modifier
            final_fake_prob = max(0.0, min(1.0, final_fake_prob)) # Clamp between 0 and 1
            
            # ResNet raw logic (For the diagnostic UI card)
            resnet_verdict = "FAKE" if base_fake_prob > 0.5 else "REAL"
            resnet_confidence = round((base_fake_prob if base_fake_prob > 0.5 else 1.0 - base_fake_prob) * 100, 2)

            # True Hybrid logic (For the main progress bar)
            final_verdict = "FAKE" if final_fake_prob >= 0.5 else "REAL"
            final_confidence = round((final_fake_prob if final_fake_prob >= 0.5 else 1.0 - final_fake_prob) * 100, 2)
            # --- END MODIFIER ---

        print(f"RESULTS | Super: {super_verdict} ({super_confidence}%) | Final Hybrid: {final_verdict} ({final_confidence}%)")

        return {
            "verdict": final_verdict, 
            "confidence": final_confidence,
            "spectrogram": f"data:image/png;base64,{img_str}",
            "breakdown": {
                "super": {
                    "verdict": super_verdict,
                    "confidence": super_confidence
                },
                "resnet": {
                    "verdict": resnet_verdict,
                    "confidence": resnet_confidence
                },
                "acoustics": {
                    "modifier_percent": round(acoustic_modifier * 100, 2),
                    "override_msg": override_msg
                }
            },
            "features": {
                "pitch_std": float(pitch_variation),
                "flatness": float(flatness),
                "tempo": float(tempo),
                "zcr": float(zcr),
                "mfcc_var": float(mfcc_variance),
                "rolloff": float(rolloff_mean),
                "onset_var": float(onset_variance)
            }
        }
        
    except Exception as e:
        print(f"\n!!! SERVER CRASHED !!!\nError: {str(e)}\n")
        raise e
        
    finally:
        if os.path.exists(temp_audio_path): os.remove(temp_audio_path)
        if os.path.exists(temp_img_path): os.remove(temp_img_path)