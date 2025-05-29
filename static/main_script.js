// DOM Elements
const generateBtn = document.getElementById('generate-btn');
const promptInput = document.getElementById('prompt');
const statusDiv = document.getElementById('status');
const errorDiv = document.getElementById('error-message');
const playerHeader = document.getElementById('player-header');
const playerContent = document.getElementById('player-content');
const sheetHeader = document.getElementById('sheet-header');
const sheetContent = document.getElementById('sheet-content');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const instrumentBtns = document.querySelectorAll('.instrument-btn');
const notationDiv = document.getElementById('notation');

// Sample abc
sample_abc = `X:1
T:Sample Generated Music
C:AI Composer
M:4/4
L:1/8
Q:1/4=120
K:C 
|: "C" C2 E2 G2 c2 | "G7" B2 d2 G2 F2 | "C" C2 E2 G2 c2 | "F" A2 c2 F2 E2 :|
| "C" C2 E2 G2 c2 | "Am" A2 c2 E2 A2 | "Dm" D2 F2 A2 d2 | "G7" G2 B2 d2 g2 |
| "C" c2 e2 g2 c'2 |]`

// State variables
let isGenerating = false;
let isPlaying = false;
let currentTime = 0;
let totalTime = 0;
let playbackInterval;
let currentInstrument = 'piano';
let audioPlayer = new Audio();

const sampleAudio = new Audio('static/generated_music.mp3'); // Placeholder for generated music audio
// Format time for display (MM:SS)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Update time display
function updateTimeDisplay() {
    currentTimeEl.textContent = formatTime(currentTime);
    totalTimeEl.textContent = formatTime(totalTime);
}

// Update progress bar
function updateProgressBar() {
    const progressPercent = (currentTime / totalTime) * 100;
    progressBar.style.width = `${progressPercent}%`;
}

// Playback simulation
function updatePlaybackPostion(){
    if (!audioPlayer.duration) return;
            
    currentTime = Math.floor(audioPlayer.currentTime);
    updateTimeDisplay();
    updateProgressBar();
            
    if (audioPlayer.paused) {
            pausePlayback();
    }
}

function loadAudio(instrument){
    audioPlayer.pause();
    audioPlayer = new Audio(`static/generated_music.mp3`); // Placeholder for generated music audio
    audioPlayer.addEventListener('loadedmetadata', () => {
        totalTime = Math.floor(audioPlayer.duration);
        updateTimeDisplay();
    });
    audioPlayer.addEventListener('timeupdate', updatePlaybackPostion);
    audioPlayer.addEventListener('ended', () => {
        pausePlayback();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
}
// Simulate playback
function simulatePlayback() {
    if (currentTime < totalTime) {
        currentTime++;
        updateTimeDisplay();
        updateProgressBar();
    } else {
        pausePlayback();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

// Start playback simulation
function startPlayback() {
    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    playbackInterval = setInterval(simulatePlayback, 1000);
}

// Pause playback
function pausePlayback() {
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    clearInterval(playbackInterval);
}

// Toggle playback
function togglePlayback() {
    if (isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

// Generate music function
async function generateMusic() {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        errorDiv.textContent = 'Please enter a description for the music you want to generate.';
        errorDiv.style.display = 'block';
        return;
    }

    errorDiv.style.display = 'none';
    isGenerating = true;
    generateBtn.disabled = true;
    generateBtn.classList.remove('pulse');
    statusDiv.innerHTML = '<div class="loading"></div> Generating your music...';

    // Reset player and sheet music
    playerContent.style.display = 'none';
    sheetContent.style.display = 'none';
    pausePlayback();
    currentTime = 0;
    updateTimeDisplay();
    updateProgressBar();

    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Simulate a 20% chance of error for demonstration
        if (Math.random() < 0.2) {
            throw new Error('Model failed to generate music. Please try again with a different prompt.');
        }

        // Display success
        statusDiv.innerHTML = '<i class="fas fa-check-circle" style="color: #00AF00; margin-right: 10px;"></i> Music generated successfully!';

        // Render ABC notation to sheet music
        notationDiv.innerHTML = ''; // Clear previous notation
        ABCJS.renderAbc(
            notationDiv,
            sample_abc, // Use the sample ABC notation
            {
                responsive: 'resize',
                add_classes: true,
                staffwidth: 700,
                scale: 1.2
            }
        );
        loadAudio(currentInstrument);


        // Show player and sheet music sections
        playerContent.style.display = 'block';
        sheetContent.style.display = 'block';

    } catch (error) {
        statusDiv.innerHTML = '';
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
    }
}

// Event Listeners
generateBtn.addEventListener('click', generateMusic);

playerHeader.addEventListener('click', () => {
    playerContent.style.display = playerContent.style.display === 'block' ? 'none' : 'block';
    const icon = playerHeader.querySelector('.fa-chevron-down');
    icon.style.transform = playerContent.style.display === 'block' ? 'rotate(180deg)' : 'rotate(0)';
});

sheetHeader.addEventListener('click', () => {
    sheetContent.style.display = sheetContent.style.display === 'block' ? 'none' : 'block';
    const icon = sheetHeader.querySelector('.fa-chevron-down');
    icon.style.transform = sheetContent.style.display === 'block' ? 'rotate(180deg)' : 'rotate(0)';
});

playBtn.addEventListener('click', () => {
    if (!isGenerating) {
        togglePlayback();
    }
});

prevBtn.addEventListener('click', () => {
    if (!isGenerating) {
        currentTime = Math.max(0, currentTime - 10);
        updateTimeDisplay();
        updateProgressBar();
    }
});

nextBtn.addEventListener('click', () => {
    if (!isGenerating) {
        currentTime = Math.min(totalTime, currentTime + 10);
        updateTimeDisplay();
        updateProgressBar();
    }
});

progressContainer.addEventListener('click', (e) => {
    if (!isGenerating) {
        const width = progressContainer.clientWidth;
        const clickX = e.offsetX;
        currentTime = Math.round((clickX / width) * totalTime);
        updateTimeDisplay();
        updateProgressBar();
    }
});

instrumentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!isGenerating) {
            instrumentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentInstrument = btn.dataset.instrument;

            if(totalTime > 0){
                loadAudio(currentInstrument);
                if (isPlaying) {
                    startPlayback();
                }
            }
        }
    });
});

// Initialize
updateTimeDisplay();
updateProgressBar();

// Example prompt for user convenience
promptInput.value = "A joyful piano piece in C major, fast tempo, with a flowing melody";
loadAudio(currentInstrument);