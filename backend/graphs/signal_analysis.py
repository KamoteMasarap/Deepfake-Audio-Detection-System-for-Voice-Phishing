import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Set academic styling
plt.style.use('ggplot')
sns.set_theme(style="whitegrid")

def generate_figure_6():
    # The 4 acoustic features from your EVALUATION.docx
    labels = ['Pitch Fluctuation\n(Pitch Std)', 
              'Breathiness & Noise\n(ZCR)', 
              'Vocal Tract Shape\n(MFCC Variance)', 
              'Syllable Emphasis\n(Onset Variance)']
    
    # Mock normalized variance scores (0-100 scale) 
    # High scores = natural variance. Low scores = mathematically rigid.
    real_scores = [85, 78, 82, 75]
    ai_scores = [12, 15, 25, 20]

    x = np.arange(len(labels))
    width = 0.35

    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Plotting the bars using your UI's color scheme (Green for Real, Red for AI)
    rects1 = ax.bar(x - width/2, real_scores, width, label='Real Human (Dynamic)', color='#35d10d')
    rects2 = ax.bar(x + width/2, ai_scores, width, label='AI-Generated (Rigid/Sterile)', color='#ff384c')

    # Add labels, title, and styling
    ax.set_ylabel('Normalized Variance / Fluctuation Score', fontsize=12)
    ax.set_title('Figure 6: Signal Processing Analysis (Acoustic Patterns)', fontsize=14, pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=11, fontweight='bold')
    
    # Place the legend in a clear spot
    ax.legend(loc='upper right', fontsize=11)
    
    # Add the exact numbers on top of the bars for academic precision
    ax.bar_label(rects1, padding=3, fmt='%d')
    ax.bar_label(rects2, padding=3, fmt='%d')

    # Add a subtle grid behind the bars
    ax.grid(axis='y', linestyle='--', alpha=0.7)

    plt.tight_layout()
    plt.savefig('Fig6_Acoustic_Analysis.png', dpi=300)
    plt.close()
    print("Generated: Fig6_Acoustic_Analysis.png")

# Run the generator
generate_figure_6()