#!/usr/bin/env python3
"""
Restructure pcos_supplements.txt for optimal RAG retrieval with proper markdown headers
"""

import re

def restructure_supplement_file(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace === headers with # (H1)
    content = re.sub(r'===\s*([^=]+)\s*===', r'# \1', content)
    
    # Replace CATEGORY headers with ## (H2)
    content = re.sub(r'^CATEGORY ([IVX]+)[:|-]\s*([^\n]+)', r'## CATEGORY \1 - \2', content, flags=re.MULTILINE)
    
    # Replace SUPPLEMENT: with ### (H3)
    content = re.sub(r'^SUPPLEMENT:\s*([^\n]+)', r'### \1', content, flags=re.MULTILINE)
    
    # Replace standalone headers (ALL CAPS followed by colon) with #### (H4)
    content = re.sub(r'^([A-Z][A-Z\s]+):$', r'#### \1', content, flags=re.MULTILINE)
    
    # Convert property-value pairs to bold
    content = re.sub(r'^(Category|Evidence Level|Supplement Type):\s*', r'**\1:** ', content, flags=re.MULTILINE)
    
    # Remove redundant horizontal rules
    content = re.sub(r'^---+$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^═+$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^─+$', '', content, flags=re.MULTILINE)
    
    # Clean up multiple blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Restructured supplement file saved to: {output_file}")

if __name__ == "__main__":
    input_file = "/Users/supriya97/Desktop/AI Projects/sakhee/server/src/data/medical/pcos_supplements.txt"
    output_file = "/Users/supriya97/Desktop/AI Projects/sakhee/server/src/data/medical/pcos_supplements_restructured.txt"
    
    restructure_supplement_file(input_file, output_file)
