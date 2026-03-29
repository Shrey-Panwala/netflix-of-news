import os
import re

EMOJI_PATTERN = re.compile(r'['
    r'\U0001F600-\U0001F64F'  # emoticons
    r'\U0001F300-\U0001F5FF'  # symbols & pictographs
    r'\U0001F680-\U0001F6FF'  # transport & map
    r'\U0001F700-\U0001F77F'  # alchemical
    r'\U0001F780-\U0001F7FF'  # geometric shapes
    r'\U0001F800-\U0001F8FF'  # supplemental arrows
    r'\U0001F900-\U0001F9FF'  # supplemental symbols and pictographs
    r'\U0001FA00-\U0001FA6F'  # chess symbols
    r'\U0001FA70-\U0001FAFF'  # symbols and pictographs extended-A
    r'\U00002600-\U000026FF'  # misc symbols
    r'\U00002700-\U000027BF'  # dingbats
    r'\u2B50'                 # star
    r'\u200d'                 # zero width joiner
    r'\ufe0f'                 # variation selector 16
    r'\u2728'                 # sparkles
    r'\u2b55'                 # heavy large circle
    r'\u23f3'                 # hourglass
    r'\u23f0'                 # alarm clock
    r']+', re.UNICODE)

def remove_emojis(text):
    return EMOJI_PATTERN.sub('', text)

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = remove_emojis(content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Cleaned {filepath}")

for root, _, files in os.walk('.'):
    # Exclude directories
    if any(d in root for d in ['node_modules', '.git', '.venv', '__pycache__']):
        continue
    for file in files:
        if file.endswith(('.jsx', '.py', '.md', '.txt', '.css', '.html')):
            process_file(os.path.join(root, file))
