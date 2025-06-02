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
    data = request.get_json() or {}
    prompt = data.get('prompt', 'Generate a random piece of music')
    # Simulate music generation with a delay
    time.sleep(2)
    # Simulate occasional errors
    if random.random() < 0.2:
        return Response("Model failed to generate music. Please try again with a different prompt.", status=500)

    # Simulate generation
    # Outputting strings suffices
    with open("static/generated/test_abc.txt", "r") as file:
        generated_music = file.read()
        print("Generated music:", generated_music)
    if "Generate" in prompt or "generate" in prompt:
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