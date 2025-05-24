#!/usr/bin/env python3
import re
from pathlib import Path

def convert_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Convertir sintaxis básica
        content = re.sub(r'{{\s*#each\s+([^}]+)\s*}}', r'{% for field in \1 %}', content)
        content = re.sub(r'{{\s*#if\s+([^}]+)\s*}}', r'{% if \1 %}', content)
        content = re.sub(r'{{\s*#unless\s+([^}]+)\s*}}', r'{% if not \1 %}', content)
        content = re.sub(r'{{\s*/each\s*}}', r'{% endfor %}', content)
        content = re.sub(r'{{\s*/if\s*}}', r'{% endif %}', content)
        content = re.sub(r'{{\s*/unless\s*}}', r'{% endif %}', content)
        
        # Arreglar espaciado en variables - solo si no está ya con espacios
        content = re.sub(r'{{([^{}]+)}}', lambda m: '{{ ' + m.group(1).strip() + ' }}', content)
        
        # Solo escribir si cambió
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Converted: {file_path}')
            return True
        else:
            print(f'No changes: {file_path}')
            return False
            
    except Exception as e:
        print(f'Error in {file_path}: {e}')
        return False

# Convertir todos los templates
template_dir = Path('templates/crud')
converted_count = 0

for template_file in template_dir.rglob('*.template'):
    if convert_file(template_file):
        converted_count += 1

print(f'Total files converted: {converted_count}')