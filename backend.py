from flask import Flask, render_template, jsonify, request, Response, send_file
import time
import os
import tempfile
import subprocess
import random
import shutil

app = Flask(__name__)

# ABC format music exmaple
sample_abc = """
X:1
T:Sample Generated Music
C:AI Composer
M:4/4
L:1/8
Q:1/4=120
K:C
|: "C" C2 E2 G2 c2 | "G7" B2 d2 G2 F2 | "C" C2 E2 G2 c2 | "F" A2 c2 F2 E2 :|
| "C" C2 E2 G2 c2 | "Am" A2 c2 E2 A2 | "Dm" D2 F2 A2 d2 | "G7" G2 B2 d2 g2 |
| "C" c2 e2 g2 c'2 |]
"""

@app.route('/')
def home():
    return render_template("main_page.html")

@app.route('/generate', methods=['POST'])
def generate():
    prompt = request.form.get('prompt', 'Generate a random piece of music')
    files = request.files.getlist('files')
    print("Received prompt:", prompt)
    print("Received files:", files)
    abc_content = ""
    # Process uploaded files if any, transform them into ABC format if necessary
    if files:
        for file in files:
            if file and file.filename.endswith('.abc'):
                # Save the uploaded ABC file
                file_path = os.path.join('static', 'uploaded', file.filename)
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                file.save(file_path)
                print(f"Saved uploaded ABC file: {file_path}")
                with open(file_path, 'r') as f:
                    abc_content = f.read()
                    print("Content of uploaded ABC file:", abc_content)
            elif file and file.filename.endswith('.mid'):
                # Save the uploaded MIDI file
                file_path = os.path.join('static', 'uploaded', file.filename)
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                file.save(file_path)
                print(f"Saved uploaded MIDI file: {file_path}")
                # use midi2abc to convert MIDI to ABC
                if shutil.which('midi2abc'):
                    result = subprocess.run(['midi2abc', file_path], capture_output=True, text=True)
                    if result.returncode == 0:
                        abc_content = result.stdout
                        print("Converted MIDI to ABC content:", abc_content)
                        # Save the converted ABC content
                        abc_file_path = file_path.replace('.mid', '.abc')
                        with open(abc_file_path, 'w') as abc_file:
                            abc_file.write(abc_content)
                            print(f"Saved converted ABC file: {abc_file_path}")
                    else:
                        print("Error converting MIDI to ABC:", result.stderr)
                else:
                    print("midi2abc command not found. Please install midi2abc.")
            elif file and file.filename.endswith('.txt'):
                # Save the uploaded text file
                file_path = os.path.join('static', 'uploaded', file.filename)
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                file.save(file_path)
                print(f"Saved uploaded text file: {file_path}")
    # Simulate music generation with a delay
    time.sleep(2)
    # Simulate occasional errors
    if random.random() < 0.2:
        return Response("Model failed to generate music. Please try again with a different prompt.", status=500)

    # Simulate generation
    prompt_processed = prompt + '\nUploaded file content: \n' + abc_content if abc_content else prompt
    """
    TODO: Add actual music generation logic here.
    We assume that the model generates a piece of music in ABC format, either a file or a string.
    """
    # Outputting strings suffices
    with open("static/generated/demo.abc", "r") as file:
        generated_music = file.read()
    if "Generate" in prompt or "generate" in prompt_processed:
        print("Generated music:", generated_music)
        return Response(generated_music, mimetype='text/plain')
    else:
        return Response(sample_abc, mimetype='text/plain')

@app.route('/download-midi', methods=['POST'])
def download_midi():
    data = request.get_json() or {}
    abc = data.get('abc')
    if not abc:
        return jsonify({'error': 'Missing ABC content'}), 400

    try:
        if not shutil.which('abc2midi'):
            return jsonify({'error': 'abc2midi command not found. Please install abc2midi.'}), 500
        # Write ABC to a temporary file
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.abc') as abc_file:
            abc_file.write(abc)
            abc_file.flush()
            abc_path = abc_file.name

        midi_path = abc_path.replace('.abc', '.mid')

        # Call abc2midi to convert abc to midi
        result = subprocess.run(['abc2midi', abc_path, '-o', midi_path], capture_output=True, text=True)
        
        if result.returncode != 0:
            return jsonify({'error': 'abc2midi failed', 'details': result.stderr}), 500

        # Return the MIDI file
        return send_file(midi_path, mimetype='audio/midi', as_attachment=True, download_name='generated_music.mid')

    finally:
        # Clean up temporary files
        if os.path.exists(abc_path):
            os.remove(abc_path)
        if os.path.exists(midi_path):
            os.remove(midi_path)

if __name__ == '__main__':
    app.run(debug=True)