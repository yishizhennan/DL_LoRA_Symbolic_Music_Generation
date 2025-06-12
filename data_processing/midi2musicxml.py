import os
import subprocess

# 1. 定义路径和 MuseScore4.exe 的位置
mscore_path = r"D:\Program Files\MuseScore 4\bin\MuseScore4.exe"  # 替换为你的实际路径
base_dir = r"C:\Users\15271\Downloads\POP909-Dataset-master\POP909"

# 2. 遍历 1 到 909，生成对应的文件名（如 001/001.mid）
for i in range(1, 910):
    # 格式化为 3 位数（001, 002, ..., 909）
    num = f"{i:03d}"
    midi_path = os.path.join(base_dir, num, f"{num}.mid")
    abc_path = rf"C:\Users\15271\Downloads\abc\{num}.abc"  # 输出路径

    if not os.path.exists(midi_path):
        print(f"文件不存在: {midi_path}")
        continue

    try:
        subprocess.run([mscore_path, midi_path, "-o", abc_path], check=True)
        print(f"转换成功: {num}.mid → {num}.abc")
    except subprocess.CalledProcessError as e:
        print(f"转换失败: {num}.mid (错误: {e})")

print("批量转换完成！")
