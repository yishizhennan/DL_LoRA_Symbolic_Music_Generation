import os
import json
import re
from collections import defaultdict
from typing import List, Dict, Tuple
import random
from music21 import converter, chord
from music_form_analyzer import MusicFormAnalyzer
from extract_motif import extract_motif
# 实例化分析器
analyzer = MusicFormAnalyzer()

# 配置参数
INPUT_FOLDER = "abc"  # 替换为你的ABC文件所在文件夹
OUTPUT_FILE = "pop909_finetuning.jsonl"  # 输出文件名
TASKS = ["b"]  # 要生成的任务类型

# 辅助函数：从ABC文件中提取头部信息


def extract_abc_metadata(abc_content: str) -> Dict[str, str]:
    metadata = {}
    lines = abc_content.split('\n')[:20]  # 只读取前20行
    for line in lines:
        if line.startswith('%') or not line.strip():
            continue
        if ':' in line and line[1] == ':':
            key = line[0]
            value = line[2:].strip()
            metadata[key] = value
    return metadata

# 辅助函数：从ABC内容中提取和弦


# def extract_chords(abc_content: str) -> List[str]:
#     chords = re.findall(r'\[([A-Ga-g#^b=]+)\]', abc_content)
#     return list(set(chords))


# 生成单个训练样本


def extract_melody(abc_content: str) -> str:
    # 获取音符部分
    notes_section = abc_content.split(
        '\n\n')[1] if '\n\n' in abc_content else abc_content
    # 移除和弦标记 [CEG] -> 空
    melody = re.sub(r'\[[^\]]+\]', '', notes_section)
    # 移除装饰符号 {trill} -> 空
    melody = re.sub(r'\{[^}]+\}', '', melody)
    # 合并连续空格
    melody = ' '.join(melody.split())
    return melody.strip()


def generate_training_sample(abc_content: str, filename: str) -> List[Dict]:
    samples = []
    metadata = extract_abc_metadata(abc_content)

    # 基础信息
    base_info = {
        "file": filename,
        "order": metadata.get('X', '1'),
        "key": metadata.get('K', 'C'),
        "meter": metadata.get('M', '4/4'),
        "length": metadata.get('L', '1/8')
    }

    if "a" in TASKS:
        motif = extract_motif(abc_content)
        samples.append({
            "instruction": "Assemble a piece of music by merging the alphabetic representation of the predetermined musical pattern and the provided melodic theme.",
            "input": f"X:{base_info['order']}\nL:{base_info['length']}\n K:{base_info['key']}\nM:{base_info['meter']}\n{motif}",
            "output": abc_content
        })
    if "b" in TASKS:
        form = analyzer.analyze(abc_content)
        samples.append({
            "instruction": "Employ the subsequent musical design as a foundation for your piece.",
            "input": f"{form['form']}",
            "output": abc_content
        })
    if "c" in TASKS:
        samples.append({
            "instruction": "Produce melodies following the designated musical arrangement and the given motif",
            "input": f"[FILE] {filename}\n[KEY] {base_info['key']}\n[METER] {base_info['meter']}\n[LENGTH] {base_info['length']}",
            "output": abc_content
        })
    if "d" in TASKS:
        samples.append({
            "instruction": "Construct a musical arrangement that blends the supplied motif while maintaining the specified alphabetical order.",
            "input": f"[FILE] {filename}\n[KEY] {base_info['key']}\n[METER] {base_info['meter']}\n[LENGTH] {base_info['length']}",
            "output": abc_content
        })
    if "e" in TASKS:
        samples.append({
            "instruction": "Employ the subsequent musical design as a foundation for your piece.",
            "input": f"[FILE] {filename}\n[KEY] {base_info['key']}\n[METER] {base_info['meter']}\n[LENGTH] {base_info['length']}",
            "output": abc_content
        })

    if "melody_harmonization" in TASKS:
        melody_only = extract_melody(abc_content)
        samples.append({
            "instruction": "Add chord accompaniment to the given melody.",
            "input": f"[MELODY]\n{melody_only}",
            "output": abc_content
        })

    return samples

# 主处理函数


def process_abc_folder(folder_path: str) -> List[Dict]:
    all_data = []
    for filename in os.listdir(folder_path):
        if filename.endswith('.abc'):
            with open(os.path.join(folder_path, filename), 'r', encoding='utf-8') as f:
                abc_content = f.read()
                try:
                    samples = generate_training_sample(abc_content, filename)
                    all_data.extend(samples)
                except Exception as e:
                    print(f"Error processing {filename}: {str(e)}")
    return all_data

# 保存为JSONL格式


def save_as_jsonl(data: List[Dict], output_path: str):
    with open(output_path, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')


if __name__ == "__main__":
    print(f"Processing ABC files from {INPUT_FOLDER}...")
    training_data = process_abc_folder(INPUT_FOLDER)
    print(f"Generated {len(training_data)} training samples.")

    save_as_jsonl(training_data, OUTPUT_FILE)
    print(f"Data saved to {OUTPUT_FILE}")
