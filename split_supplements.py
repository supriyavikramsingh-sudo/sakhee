#!/usr/bin/env python3
"""
Split pcos_supplements.txt into category-based files for optimal RAG ingestion
"""

import re

def split_supplement_file(input_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by main categories (## CATEGORY)
    sections = re.split(r'(## CATEGORY [IVX]+ - [^\n]+)', content)
    
    # Get header and disclaimers (everything before first CATEGORY)
    header = sections[0]
    
    # Process each category
    for i in range(1, len(sections), 2):
        if i + 1 < len(sections):
            category_header = sections[i]
            category_content = sections[i + 1]
            
            # Extract category number from header
            match = re.search(r'CATEGORY ([IVX]+)', category_header)
            if match:
                cat_num = match.group(1).lower()
                
                # Create file for this category
                output_file = input_file.replace('pcos_supplements.txt', f'pcos_supplements_category_{cat_num}.txt')
                
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(header)
                    f.write('\n\n')
                    f.write(category_header)
                    f.write('\n\n')
                    f.write(category_content.strip())
                
                print(f"✅ Created: {output_file}")

if __name__ == "__main__":
    input_file = "/Users/supriya97/Desktop/AI Projects/sakhee/server/src/data/medical/pcos_supplements.txt"
    split_supplement_file(input_file)
    print("\n✅ Supplement files split by category for optimal RAG ingestion!")
