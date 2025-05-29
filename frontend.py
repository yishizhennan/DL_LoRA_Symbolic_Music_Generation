from flask import Flask, render_template_string, render_template, jsonify, request
import time
import random

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
    # Simulate generation delay
    time.sleep(3)
    
    # Simulate occasional errors
    if random.random() < 0.2:
        return jsonify({"status": "error", "message": "Model failed to generate music. Please try again with a different prompt."})
    
    return jsonify({
        "status": "success",
        "abc_notation": sample_abc,
        "audio_url": "./static/generated_music.mp3",
        "duration": 20  # 3 minutes
    })

if __name__ == '__main__':
    app.run(debug=True)