import re

file_path = r"C:\Users\Gebruiker\.gemini\antigravity\brain\a6b83878-7837-404a-8eee-f5cf9c734325\.system_generated\steps\2316\content.md"

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Let's check where 'Groningen' appears in the raw file
matches = [m.start() for m in re.finditer('Groningen', text, re.IGNORECASE)]
print(f"Groningen matches: {len(matches)}")
for idx in matches[:5]:
    start = max(0, idx - 100)
    end = min(len(text), idx + 100)
    print(f"Match at {idx}:\n--- {text[start:end]} \n---")

# Let's check for 'Zwolle'
matches_zwolle = [m.start() for m in re.finditer('Zwolle', text, re.IGNORECASE)]
print(f"Zwolle matches: {len(matches_zwolle)}")
for idx in matches_zwolle[:5]:
    start = max(0, idx - 100)
    end = min(len(text), idx + 100)
    print(f"Match at {idx}:\n--- {text[start:end]} \n---")
