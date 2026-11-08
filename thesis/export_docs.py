import re
import os
from pptx import Presentation
from pptx.util import Inches, Pt

def tex_to_md(tex_content):
    # Very basic LaTeX to Markdown conversion
    md = tex_content
    # Remove verbatim blocks and keep content
    md = re.sub(r'\\begin\{verbatim\}(.*?)\\end\{verbatim\}', r'```\n\1\n```', md, flags=re.DOTALL)
    # Remove equation blocks
    md = re.sub(r'\\begin\{equation\}(.*?)\\end\{equation\}', r'$$\n\1\n$$', md, flags=re.DOTALL)
    # Replace chapters and sections
    md = re.sub(r'\\chapter\{(.*?)\}', r'# \1', md)
    md = re.sub(r'\\section\{(.*?)\}', r'## \1', md)
    md = re.sub(r'\\subsection\{(.*?)\}', r'### \1', md)
    md = re.sub(r'\\textbf\{(.*?)\}', r'**\1**', md)
    # Remove generic latex commands
    md = re.sub(r'\\[a-zA-Z]+\{.*?\}', '', md)
    md = re.sub(r'\\[a-zA-Z]+', '', md)
    return md

def create_pptx(output_path):
    prs = Presentation()
    
    # Title Slide
    title_slide_layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(title_slide_layout)
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    title.text = "基於預測引擎與前端串流架構之新一代程序冷卻水監控系統"
    subtitle.text = "Next-Generation PCW SCADA System\n報告人: Ben Chen"
    
    # Overview Slide
    bullet_slide_layout = prs.slide_layouts[1]
    slide = prs.slides.add_slide(bullet_slide_layout)
    shapes = slide.shapes
    title_shape = shapes.title
    body_shape = shapes.placeholders[1]
    title_shape.text = "研究背景與問題陳述"
    tf = body_shape.text_frame
    tf.text = "傳統 SCADA 系統的缺陷："
    p = tf.add_paragraph()
    p.text = "1. 被動式警報：缺乏提前預防能力"
    p = tf.add_paragraph()
    p.text = "2. 缺乏特徵工程：無法辨識緩慢劣化的趨勢"
    p = tf.add_paragraph()
    p.text = "3. 效能瓶頸：歷史圖表渲染容易崩潰"
    p = tf.add_paragraph()
    p.text = "4. 傳統輪詢：伺服器資源消耗大，延遲高"

    # Solution Slide
    slide = prs.slides.add_slide(bullet_slide_layout)
    shapes = slide.shapes
    title_shape = shapes.title
    body_shape = shapes.placeholders[1]
    title_shape.text = "研究貢獻與系統架構"
    tf = body_shape.text_frame
    tf.text = "本系統提出的解決方案："
    p = tf.add_paragraph()
    p.text = "雙重預測引擎：N10 異常密度與線性斜率預測 (T-10, T-20, T-30)"
    p = tf.add_paragraph()
    p.text = "動態降採樣演算法 (Downsampling)：壓縮海量數據，實現 60 FPS"
    p = tf.add_paragraph()
    p.text = "串流架構：導入 WebSocket 即時推播"

    # Deep Analysis Slide
    slide = prs.slides.add_slide(bullet_slide_layout)
    shapes = slide.shapes
    title_shape = shapes.title
    body_shape = shapes.placeholders[1]
    title_shape.text = "特徵工程與 N10 演算"
    tf = body_shape.text_frame
    tf.text = "特徵萃取流程："
    p = tf.add_paragraph()
    p.text = "BaseAvg60：過濾高頻雜訊的基準錨點"
    p = tf.add_paragraph()
    p.text = "M10 / M60：短期與長期的偏離點數累積"
    p = tf.add_paragraph()
    p.text = "N10 = M10 / (M60 / 6)：透過比值敏銳捕捉物理行為的微小偏移"
    
    prs.save(output_path)

def main():
    tex_path = "/Users/benchen1981/Downloads/Web SCADA/thesis/main.tex"
    md_path = "/Users/benchen1981/Downloads/Web SCADA/thesis/THESIS_MARKDOWN.md"
    pptx_path = "/Users/benchen1981/Downloads/Web SCADA/thesis/thesis_presentation.pptx"
    
    if os.path.exists(tex_path):
        with open(tex_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract mainmatter for the thesis Markdown body
        match = re.search(r'\\mainmatter(.*?)\\backmatter', content, flags=re.DOTALL)
        if match:
            main_content = match.group(1)
        else:
            main_content = content
            
        md_text = tex_to_md(main_content)
        
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write("# 完整論文內容 (Converted from LaTeX)\n\n")
            f.write(md_text)
            
        print(f"Successfully converted LaTeX to Markdown: {md_path}")
    
    create_pptx(pptx_path)
    print(f"Successfully generated PPTX: {pptx_path}")

if __name__ == "__main__":
    main()
