#!/usr/bin/env python3
"""
Split pcos_ingredient_substitutes_RAG.txt into 6 category-based files
for better RAG retrieval precision and maintainability.
"""

import os
import re
from pathlib import Path

# Define the input file
INPUT_FILE = "server/src/data/medical/pcos_ingredient_substitutes_RAG.txt"
OUTPUT_DIR = "server/src/data/medical"

# Define section mappings (section number -> target file)
SECTION_MAPPING = {
    # Grains & Sweeteners (Carb-based)
    "grains": {
        "file": "pcos_ingredient_substitutes_grains.txt",
        "sections": [1, 3],  # GRAINS & FLOURS, SWEETENERS & SUGARS
        "title": "PCOS-FRIENDLY INGREDIENT SUBSTITUTES - GRAINS & SWEETENERS",
    },
    
    # Proteins (Dairy, Legumes, Protein Adaptations)
    "proteins": {
        "file": "pcos_ingredient_substitutes_proteins.txt",
        "sections": [4, 5, 17],  # DAIRY, PROTEINS & LEGUMES, ANIMAL PROTEIN SUBSTITUTES
        "title": "PCOS-FRIENDLY INGREDIENT SUBSTITUTES - PROTEINS & DAIRY",
    },
    
    # Produce & Fats
    "produce": {
        "file": "pcos_ingredient_substitutes_produce_and_fats.txt",
        "sections": [2, 6],  # COOKING OILS & FATS, VEGETABLES & FRUITS
        "title": "PCOS-FRIENDLY INGREDIENT SUBSTITUTES - PRODUCE & FATS",
    },
    
    # Prepared Foods (Cooking, Snacks, Sweets, Beverages, Regional)
    "prepared": {
        "file": "pcos_ingredient_substitutes_prepared_foods.txt",
        "sections": [7, 8, 9, 10, 11],  # COOKING METHODS through REGIONAL SPECIALTIES
        "title": "PCOS-FRIENDLY INGREDIENT SUBSTITUTES - PREPARED FOODS & REGIONAL SPECIALTIES",
    },
    
    # Special Diets (Allergies, Diet Types, Portions, Equipment, Emergency)
    "special": {
        "file": "pcos_ingredient_substitutes_special_diets.txt",
        "sections": [12, 13, 14, 15, 16],  # ALLERGY through EMERGENCY QUICK SUBSTITUTES
        "title": "PCOS-FRIENDLY INGREDIENT SUBSTITUTES - SPECIAL DIETS & GUIDANCE",
    },
    
    # Keto (separate - it's large and special-purpose)
    "keto": {
        "file": "pcos_keto_substitutes.txt",
        "sections": [18],  # KETOGENIC DIET SUBSTITUTES
        "title": "PCOS-FRIENDLY KETOGENIC DIET SUBSTITUTES",
    }
}


def parse_sections(content):
    """Parse the file and extract sections with their numbers."""
    sections = {}
    current_section_num = None
    current_section_content = []
    
    lines = content.split('\n')
    header_lines = []  # Store the file header (before first section)
    in_header = True
    
    for line in lines:
        # Check for section header (## SECTION X: ... ###)
        section_match = re.match(r'^## SECTION (\d+):', line)
        keto_match = re.match(r'^## SECTION: KETOGENIC', line)
        
        if section_match:
            # Save previous section
            if current_section_num is not None:
                sections[current_section_num] = '\n'.join(current_section_content)
            
            # Start new section
            current_section_num = int(section_match.group(1))
            current_section_content = [line]
            in_header = False
            
        elif keto_match:
            # Save previous section
            if current_section_num is not None:
                sections[current_section_num] = '\n'.join(current_section_content)
            
            # Keto is section 18
            current_section_num = 18
            current_section_content = [line]
            in_header = False
            
        else:
            if in_header:
                header_lines.append(line)
            elif current_section_num is not None:
                current_section_content.append(line)
    
    # Save last section
    if current_section_num is not None:
        sections[current_section_num] = '\n'.join(current_section_content)
    
    # Get the header (everything before first section)
    header = '\n'.join(header_lines).strip()
    
    return header, sections


def create_file_content(category_name, category_info, header, sections):
    """Create content for a category file."""
    content_parts = []
    
    # Custom header for this category
    content_parts.append(category_info['title'])
    content_parts.append("Version: 2025-11-11 (Split from main file)")
    content_parts.append("Purpose: RAG file for LangChain embeddings - " + category_name.upper() + " category")
    content_parts.append("Format: Ingredient → Substitute mapping with regional alternatives and diet-type considerations")
    content_parts.append("Usage: Query by ingredient name, cooking method, or diet restriction to retrieve PCOS-friendly alternatives")
    content_parts.append("")
    content_parts.append("=" * 80)
    
    # Add relevant sections
    for section_num in category_info['sections']:
        if section_num in sections:
            content_parts.append("")
            content_parts.append(sections[section_num])
    
    # Add end marker
    content_parts.append("")
    content_parts.append("=" * 80)
    content_parts.append(f"END OF {category_info['title']}")
    content_parts.append("=" * 80)
    
    return '\n'.join(content_parts)


def main():
    """Main execution."""
    print("🔪 Splitting PCOS Ingredient Substitutes file into 6 category-based files...")
    print()
    
    # Read input file
    input_path = Path(INPUT_FILE)
    if not input_path.exists():
        print(f"❌ Error: Input file not found: {INPUT_FILE}")
        return
    
    print(f"📖 Reading input file: {INPUT_FILE}")
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse sections
    print("🔍 Parsing sections...")
    header, sections = parse_sections(content)
    print(f"   Found {len(sections)} sections")
    print(f"   Section numbers: {sorted(sections.keys())}")
    print()
    
    # Create output directory if needed
    output_dir = Path(OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create each category file
    print("✂️  Creating category files:")
    for category_name, category_info in SECTION_MAPPING.items():
        output_file = output_dir / category_info['file']
        
        # Generate content
        file_content = create_file_content(category_name, category_info, header, sections)
        
        # Write file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(file_content)
        
        # Count lines
        line_count = len(file_content.split('\n'))
        section_nums = ', '.join(str(s) for s in category_info['sections'])
        
        print(f"   ✅ {category_info['file']}")
        print(f"      Sections: {section_nums}")
        print(f"      Lines: {line_count}")
        print()
    
    # Rename original file to .bak3
    backup_file = input_path.with_suffix('.txt.bak3')
    print(f"📦 Creating backup: {backup_file.name}")
    input_path.rename(backup_file)
    print()
    
    print("✨ Split complete! Summary:")
    print()
    print("📁 New files created:")
    for category_info in SECTION_MAPPING.values():
        print(f"   • {category_info['file']}")
    print()
    print("📋 Next steps:")
    print("   1. Review the generated files")
    print("   2. Run: cd server && npm run ingest:medical")
    print("   3. Test RAG retrieval with ingredient queries")
    print("   4. Delete backup files if satisfied: rm *.bak*")
    print()
    print("🎉 Done!")


if __name__ == "__main__":
    main()
