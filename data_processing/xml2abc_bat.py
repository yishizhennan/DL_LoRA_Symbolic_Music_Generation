import os
import time
import subprocess


def process_mxl_files():
    mxl_dir = "mxl"  # MXL 文件所在目录
    output_dir = "abc"  # 输出目录

    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)

    for i in range(1, 910):  # 001.mxl 到 909.mxl
        filename = f"{i:03d}.mxl"  # 格式化为 3 位数，如 1 → "001.mxl"
        filepath = os.path.join(mxl_dir, filename)

        print(f"等待文件: {filename}...", end="", flush=True)

        # 如果文件不存在，则每隔 1 秒检查一次
        while not os.path.exists(filepath):
            time.sleep(1)

        print(f" 找到，开始处理...")

        # 使用保留最多信息的参数组合
        cmd = [
            "python", "xml2abc.py",
            "-o", output_dir,
            "-c", "0",  # 过滤掉大部分冗余文本（包括部分注释）
            "-t",
            "--v1",
            "-x",  # 禁用换行信息
            filepath
        ]

        # 添加可选参数(根据需要取消注释)
        # cmd.extend(["-d", "8"])   # 指定单位长度(如1/8音符)
        # cmd.extend(["-v", "0"])   # 保留所有volta标记
        # cmd.extend(["--nbr"])     # 禁用断节奏转换(保留原始节奏)
        # cmd.extend(["--rbm"])     # 重新组合所有小节(如果原始文件缺少组合)

        subprocess.run(cmd)

        # 可选：处理完后删除或移动文件，避免重复处理
        # os.remove(filepath)


if __name__ == "__main__":
    process_mxl_files()
    print("所有文件处理完成！")
    input("按 Enter 退出...")
