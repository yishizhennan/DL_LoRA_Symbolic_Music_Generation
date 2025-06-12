from flask import Flask, render_template, jsonify, request, Response, send_file, session
import os
import tempfile
import subprocess
import shutil
import requests
import signal

app = Flask(__name__)
app.secret_key = 'your_secret_key'

model_process = None


def get_model_paths():
    base = session.get('selected_model')
    lora = session.get('selected_lora')
    # if not base or not lora:
    #     return None, None, None
    base_path = os.path.abspath(os.path.join(
        '../ChatMusician-main/checkpoint', base))
    lora_path = os.path.abspath(os.path.join(
        '../ChatMusician-main/lora', lora))
    out_path = os.path.abspath(os.path.join(
        '../ChatMusician-main/merged', f"final"))
    return base_path, lora_path, out_path


def stop_model_process():
    global model_process
    if model_process and model_process.poll() is None:
        print("Stopping previous model process...")
        model_process.terminate()
        try:
            model_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            model_process.kill()
        print("Previous model process stopped.")
    model_process = None


def merge_and_start():
    base, lora, out = get_model_paths()
    if not base or not lora:
        print("Model or Lora not selected, skip merge/start.")
        return
    stop_model_process()
    print("Merging model...")
    merge_cmd = ['python', 'model/train/merge.py', '--ori_model_dir',
                 base, '--model_dir', lora, '--output_dir', out]
    result = subprocess.run(merge_cmd, capture_output=True, text=True)
    print("Merge:", result.stdout, result.stderr)
    if result.returncode != 0:
        raise RuntimeError("Merge failed: " + result.stderr)
    print("Starting new model process...")
    global model_process
    model_process = subprocess.Popen([
        'python', 'model/infer/predict.py',
        '--base_model', out, '--with_prompt', '--interactive', '--flask'
    ])
    print("New model process started.")


@app.route('/')
def home():
    model_list = [d for d in os.listdir('../ChatMusician-main/checkpoint')
                  if os.path.isdir(os.path.join('../ChatMusician-main/checkpoint', d))]
    lora_list = [d for d in os.listdir(
        '../ChatMusician-main/lora') if os.path.isdir(os.path.join('../ChatMusician-main/lora', d))]
    return render_template('main_page.html', model_list=model_list, lora_list=lora_list)


@app.route('/generate', methods=['POST'])
def generate():
    prompt = request.form.get('prompt', 'Generate a random piece of music')
    model = request.form.get('model')
    lora = request.form.get('lora')
    files = request.files.getlist('files')
    print("Received prompt:", prompt)
    print("Selected model:", model)
    print("Selected lora:", lora)
    abc_content = ""
    for file in files:
        if file and file.filename.endswith('.abc'):
            file_path = os.path.join('static', 'uploaded', file.filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            file.save(file_path)
            with open(file_path, 'r') as f:
                abc_content = f.read()
        elif file and file.filename.endswith('.mid'):
            file_path = os.path.join('static', 'uploaded', file.filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            file.save(file_path)
            if shutil.which('midi2abc'):
                result = subprocess.run(
                    ['midi2abc', file_path], capture_output=True, text=True)
                if result.returncode == 0:
                    abc_content = result.stdout
                    abc_file_path = file_path.replace('.mid', '.abc')
                    with open(abc_file_path, 'w') as abc_file:
                        abc_file.write(abc_content)
    prompt_processed = prompt + '\nUploaded file content: \n' + \
        abc_content if abc_content else prompt
    try:
        ai_api_url = "http://localhost:5001/predict"
        payload = {"input": prompt_processed,
                   "with_prompt": True, "model": model, "lora": lora}
        resp = requests.post(ai_api_url, json=payload, timeout=60)
        if resp.status_code == 200:
            return Response(resp.json().get("response", ""), mimetype='text/plain')
        else:
            return Response("AI后端生成失败: " + resp.text, status=500)
    except Exception as e:
        return Response("调用AI后端异常: " + str(e), status=500)


@app.route('/download-midi', methods=['POST'])
def download_midi():
    data = request.get_json() or {}
    abc = data.get('abc')
    if not abc:
        return jsonify({'error': 'Missing ABC content'}), 400
    try:
        if not shutil.which('abc2midi'):
            return jsonify({'error': 'abc2midi command not found.'}), 500
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.abc') as abc_file:
            abc_file.write(abc)
            abc_file.flush()
            abc_path = abc_file.name
        midi_path = abc_path.replace('.abc', '.mid')
        result = subprocess.run(
            ['abc2midi', abc_path, '-o', midi_path], capture_output=True, text=True)
        if result.returncode != 0:
            return jsonify({'error': 'abc2midi failed', 'details': result.stderr}), 500
        return send_file(midi_path, mimetype='audio/midi', as_attachment=True, download_name='generated_music.mid')
    finally:
        if os.path.exists(abc_path):
            os.remove(abc_path)
        if os.path.exists(midi_path):
            os.remove(midi_path)


@app.route('/set-model', methods=['POST'])
def set_model():
    session['selected_model'] = request.get_json().get('model')
    print("Model changed to:", session['selected_model'])
    print("Current session:", dict(session))
    if session.get('selected_model') and session.get('selected_lora'):
        try:
            merge_and_start()
        except Exception as e:
            print("Error in model change:", e)
            return jsonify({'status': 'error', 'msg': str(e)})
    return jsonify({'status': 'ok'})


@app.route('/set-lora', methods=['POST'])
def set_lora():
    session['selected_lora'] = request.get_json().get('lora')
    print("Lora changed to:", session['selected_lora'])
    print("Current session:", dict(session))

    if session.get('selected_lora'):
        try:
            merge_and_start()
            print("Lora change successful, model restarted.")
        except Exception as e:
            print("Error in lora change:", e)
            return jsonify({'status': 'error', 'msg': str(e)})
    return jsonify({'status': 'ok'})


@app.route('/set-model-lora', methods=['POST'])
def set_model_lora():
    data = request.get_json()
    session['selected_model'] = data.get('model')
    session['selected_lora'] = data.get('lora')
    print("Model changed to:", session['selected_model'])
    print("Lora changed to:", session['selected_lora'])
    print("Current session:", dict(session))
    if session.get('selected_model') and session.get('selected_lora'):
        try:
            merge_and_start()
            print("Model and Lora change successful, model restarted.")
        except Exception as e:
            print("Error in model/lora change:", e)
            return jsonify({'status': 'error', 'msg': str(e)})
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(debug=True)
