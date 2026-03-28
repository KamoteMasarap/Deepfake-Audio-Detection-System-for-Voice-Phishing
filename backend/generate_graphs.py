import matplotlib.pyplot as plt
import numpy as np

# 1. Categories (Updated with all 5 features from your baseline)
labels = [
    'Pitch Fluctuation\n(Pitch Std)', 
    'Breathiness & Noise\n(ZCR)', 
    'Vocal Tract Shape\n(MFCC Variance)', 
    'Syllable Emphasis\n(Onset Variance)',
    'High-Frequency Profile\n(Spectral Rolloff)'
]

# Data (Normalized 0-100)
real_human = [85, 78, 88, 75, 82]
ai_generated = [12, 8, 25, 20, 30]

x = np.arange(len(labels))
width = 0.35

# 2. Setup Plot matching your exact layout
fig, ax = plt.subplots(figsize=(12, 6), dpi=300)

# Set the grid behind the bars
ax.set_axisbelow(True)
ax.yaxis.grid(True, linestyle='--', color='lightgrey', alpha=0.8)
ax.xaxis.grid(False)

# 3. Plot bars using your specific Green/Red scheme with white edges
rects1 = ax.bar(x - width/2, real_human, width, label='Real Human (Dynamic)', color='#32CD32', edgecolor='white', linewidth=1.5)
rects2 = ax.bar(x + width/2, ai_generated, width, label='AI-Generated (Rigid/Sterile)', color='#FF3B3B', edgecolor='white', linewidth=1.5)

# 4. Labels and Title
ax.set_ylabel('Normalized Variance / Fluctuation Score', fontsize=12)
ax.set_title('Figure 6: Signal Processing Analysis (Acoustic Patterns)', fontsize=14, pad=15)
ax.set_xticks(x)
ax.set_xticklabels(labels, fontsize=10, fontweight='bold')
ax.legend(fontsize=11)

# Set limits so the top numbers don't get cut off
ax.set_ylim(0, 100)

# Match the border color of the graph
for spine in ax.spines.values():
    spine.set_edgecolor('lightgrey')
    spine.set_linewidth(1.5)

# 5. Add the numbers on top of the bars
def autolabel(rects):
    for rect in rects:
        height = rect.get_height()
        ax.annotate(f'{height}',
                    xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 3),  # 3 points vertical offset
                    textcoords="offset points",
                    ha='center', va='bottom', fontsize=11)

autolabel(rects1)
autolabel(rects2)

plt.tight_layout()

# Save the final image
file_name = 'figure6_acoustic_analysis.png'
plt.savefig(file_name, bbox_inches='tight')
print(f"Graph successfully generated and saved as {file_name}")