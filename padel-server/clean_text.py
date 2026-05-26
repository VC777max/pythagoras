import re

file_path = r"C:\Users\Gebruiker\.gemini\antigravity\brain\a6b83878-7837-404a-8eee-f5cf9c734325\.system_generated\steps\2316\content.md"

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Let's remove script and style tags
text_clean = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
text_clean = re.sub(r'<style.*?</style>', '', text_clean, flags=re.DOTALL | re.IGNORECASE)
# Remove all HTML tags
text_clean = re.sub(r'<[^>]+>', ' ', text_clean)
# Clean up whitespace
text_clean = re.sub(r'\s+', ' ', text_clean).strip()

# Save the cleaned text to a file so we can view it
with open("clean_text.txt", "w", encoding="utf-8") as out:
    out.write(text_clean)

print("Cleaned text saved to clean_text.txt. Length:", len(text_clean))
# Find some cities to check if they exist in the cleaned text
cities = ['Groningen', 'Zwolle', 'Apeldoorn', 'Almere', 'Amsterdam', 'Rotterdam', 'Utrecht']
for c in cities:
    count = len(re.findall(c, text_clean, re.IGNORECASE))
    print(f"City '{c}' occurs {count} times")
