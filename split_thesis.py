import re

with open('/Users/benchen1981/Downloads/Web SCADA/deepseek.md', 'r', encoding='utf-8') as f:
    content = f.read()

# The content has markers like: 檔案名稱：PCW_Thesis_V9_Batch1_前置與緒論.md
batches = re.split(r'檔案名稱：\s*(PCW_Thesis_V9_Batch\d+_[^\.]+\.md)', content)

# batches[0] is the preamble
# batches[1] is filename 1
# batches[2] is content 1
# batches[3] is filename 2
# batches[4] is content 2 ...

filenames = []

for i in range(1, len(batches), 2):
    filename = batches[i].strip()
    file_content = batches[i+1].strip()
    
    # Remove the next batch header from the end of the content if present
    # Actually re.split splits on the exact match, so the content ends right before the next "檔案名稱："
    # But there might be "============================================" at the end.
    file_content = re.sub(r'={20,}\nBatch \d+：.*?\n={20,}\n?$', '', file_content, flags=re.MULTILINE).strip()
    
    with open(filename, 'w', encoding='utf-8') as out:
        out.write(file_content + '\n')
    
    filenames.append(filename)
    print(f"Saved {filename}")

if filenames:
    with open('PCW_Thesis_V9_Full.md', 'w', encoding='utf-8') as full:
        for fname in filenames:
            with open(fname, 'r', encoding='utf-8') as f:
                full.write(f.read() + '\n\n')
    print("Saved PCW_Thesis_V9_Full.md")
else:
    # Fallback if regex didn't match: just copy deepseek.md
    with open('PCW_Thesis_V9_Full.md', 'w', encoding='utf-8') as out:
        out.write(content)
    print("Regex failed. Copied whole file to PCW_Thesis_V9_Full.md")

