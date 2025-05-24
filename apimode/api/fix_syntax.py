#!/usr/bin/env python3
import re
from pathlib import Path

def fix_template_syntax(file_path):
    """Fix Jinja2 syntax errors in template files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix triple curly braces - they should be regular JS expressions in JSX
        # Keep only the content inside the triple braces
        content = re.sub(r'{{{([^}]+)}}}', r'{\1}', content)
        
        # Fix json filter syntax
        content = re.sub(r'{{ json ([^}]+) }}', r'{{ \1|tojson }}', content)
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Fixed syntax in: {file_path}')
            return True
        else:
            print(f'No changes needed: {file_path}')
            return False
            
    except Exception as e:
        print(f'Error fixing {file_path}: {e}')
        return False

# Fix problematic template files
problematic_files = [
    'templates/crud/components/[Entity]Form.tsx.template',
    'templates/crud/(pages)/[id]/page.tsx.template', 
    'templates/crud/components/[Entity]List.tsx.template'
]

fixed_count = 0
for file_path in problematic_files:
    if fix_template_syntax(Path(file_path)):
        fixed_count += 1

print(f'Total files fixed: {fixed_count}')