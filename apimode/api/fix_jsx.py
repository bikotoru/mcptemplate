#!/usr/bin/env python3
import re
from pathlib import Path

# Fix the [id]/page.tsx template
file_path = Path('templates/crud/(pages)/[id]/page.tsx.template')

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix specific lines one by one
fixes = [
    (r'href=\{{{ ([^}]+) }}\}', r'href={\1}'),
    (r'\{{{ ([^}]+) }\}', r'{\1}'),
]

for pattern, replacement in fixes:
    content = re.sub(pattern, replacement, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed all JSX expressions in [id]/page.tsx template')