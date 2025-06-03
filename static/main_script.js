if (typeof ABCJS === 'undefined') {
    console.error("ABCJS is not defined. Loading library dynamically...");
    const script = document.createElement('script');
    script.src = 'static/abcjs_midi_6.0.0-beta.21-min.js'; // Adjust path as necessary
    script.onload = initApp;
    script.onerror = () => {
        console.error("Failed to load ABCJS library");
        document.getElementById('error-message').textContent = "Failed to load required music library. Please refresh the page.";
        document.getElementById('error-message').style.display = 'block';
    };
    document.head.appendChild(script);
} else {
    initApp();

    function initApp() {

        // DOM Elements
        const generateBtn = document.getElementById('generate-btn');
        const promptInput = document.getElementById('prompt');
        const statusDiv = document.getElementById('status');
        const errorDiv = document.getElementById('error-message');
        const audioWarning = document.getElementById('audio-warning');
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
        // File upload elements
        const fileUploadBtn = document.getElementById('file-upload-btn');
        const fileModal = document.getElementById('file-modal');
        const closeModalBtn = document.getElementById('close-modal');
        const cancelUploadBtn = document.getElementById('cancel-upload');
        const confirmUploadBtn = document.getElementById('confirm-upload');
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');
        const uploadedFilesContainer = document.getElementById('uploaded-files');

        // Sample abc
        sample_abc = `X:1
    T:Sample Generated Music
    C:AI Composer
    M:4/4
    L:1/8
    Q:1/4=120
    K:C 
    |: "C" C2 E2 G2 c2 | "G7" B2 d2 G2 F2 |]`

        // State variables
        let isGenerating = false;
        let isPlaying = false;
        let totalTime = 0;
        let resumeTime = 0;
        let startTime = 0;

        let abcSynth, synthControl;
        let visualObj;
        let audioContext;
        let isSynthPlaying = false;
        let synthContext;
        let timer = null;
        let intervalId;
        let currentABC = sample_abc; // Use sample ABC notation for initial testing

        let uploadedFiles = [];

        const sampleAudio = new Audio('static/generated/generated_music.mp3'); // Placeholder for generated music audio
        // Format time for display (MM:SS)
        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }

        // Update time display
        function updateTimeDisplay(currentTime) {
            currentTimeEl.textContent = formatTime(currentTime);
            totalTimeEl.textContent = formatTime(totalTime);
            progressBar.style.width = `${totalTime ? (currentTime / totalTime) * 100 : 0}% `;
        }

        function togglePlayback() {
            if (isPlaying) {
                abcSynth.stop();
                clearInterval(timer);
                resumeTime = audioContext.currentTime - startTime;
                isPlaying = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
            else {
                playFrom(resumeTime);
            }
        }

        // Set up event listeners
            fileUploadBtn.addEventListener('click', openFileModal);
            closeModalBtn.addEventListener('click', closeFileModal);
            cancelUploadBtn.addEventListener('click', closeFileModal);
            confirmUploadBtn.addEventListener('click', closeFileModal);
            fileInput.addEventListener('change', handleFileSelect);
            
            // Drag and drop functionality
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                handleFileSelect(e);
            });
        function openFileModal() {
            fileModal.classList.add('active');
            document.body.style.overflow = 'hidden';

        }
        function closeFileModal() {
            fileModal.classList.remove('active');
            document.body.style.overflow = '';
        }

        function handleFileSelect(e) {
            const files = e.target.files || e.dataTransfer.files;
            if (!files.length) return;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Check file type
                const fileExt = file.name.split('.').pop().toLowerCase();
                if (!['txt', 'abc', 'mid', 'midi'].includes(fileExt)) {
                    alert(`Unsupported file type: ${file.name}. Only TXT, ABC, and MIDI files are allowed.`);
                    continue;
                }

                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert(`File too large: ${file.name}. Maximum file size is 5MB.`);
                    continue;
                }

                // Add to uploaded files
                uploadedFiles.push(file);
                renderUploadedFiles();
            }
        }

        function renderUploadedFiles() {
            uploadedFilesContainer.innerHTML = '';

            if (uploadedFiles.length === 0) {
                uploadedFilesContainer.innerHTML = '<p style="text-align: center; color: #aaa;">No files uploaded</p>';
                return;
            }

            uploadedFiles.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';

                // Format file size
                const fileSize = file.size > 1024 * 1024
                    ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
                    : (file.size / 1024).toFixed(2) + ' KB';

                // Get file icon based on type
                const fileExt = file.name.split('.').pop().toLowerCase();
                let fileIcon = 'fa-file-alt';

                if (fileExt === 'mid' || fileExt === 'midi') {
                    fileIcon = 'fa-file-audio';
                } else if (fileExt === 'txt') {
                    fileIcon = 'fa-file-text';
                }

                fileItem.innerHTML = `
                    <div class="file-info">
                        <i class="fas ${fileIcon} file-icon"></i>
                        <div>
                            <div class="file-name" title="${file.name}">${file.name}</div>
                            <div class="file-size">${fileSize}</div>
                        </div>
                    </div>
                    <button class="remove-file" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                uploadedFilesContainer.appendChild(fileItem);
            });

            // Add event listeners to remove buttons
            document.querySelectorAll('.remove-file').forEach(btn => {
                btn.addEventListener('click', function () {
                    const index = parseInt(this.getAttribute('data-index'));
                    uploadedFiles.splice(index, 1);
                    renderUploadedFiles();
                });
            });
        }

        function formatFileForUpload(file) {
            return {
                name: file.name,
                type: file.type,
                size: file.size,
                content: "" // Placeholder, in real app we would read the content
            };
        } 

        async function playFrom(position) {
            console.log("Starting playback from position:", position);
            if (!visualObj) return;

            if (!audioContext || audioContext.state === 'closed') {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (audioContext.state === 'suspended')
                await audioContext.resume();

            if (abcSynth) abcSynth.stop();
            abcSynth = new ABCJS.synth.CreateSynth();
            await abcSynth.init({ visualObj, audioContext });
            await abcSynth.prime();

            abcSynth.seek(position);
            console.log("Synth initialized and primed. Starting playback...");
            abcSynth.start();

            startTime = audioContext.currentTime - position;
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';

            clearInterval(timer);
            timer = setInterval(() => {
                const elapsed = audioContext.currentTime - startTime;
                resumeTime = elapsed;
                updateTimeDisplay(elapsed);
                // console.log("Current time:", elapsed, "Total time:", totalTime);
                if (elapsed >= totalTime) {
                    clearInterval(timer);
                    resumeTime = 0;
                    isPlaying = false;
                    updateTimeDisplay(totalTime);
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
            }, 200);
        }
        
        // Generate music function
        async function generateMusic() {
            const prompt = promptInput.value.trim();

            if (!prompt) {
                errorDiv.textContent = 'Please enter a description for the music you want to generate.';
                errorDiv.style.display = 'block';
                return;
            }

            if (abcSynth)
                abcSynth.stop();

            clearInterval(timer);
            errorDiv.style.display = 'none';
            generateBtn.disabled = true;
            generateBtn.classList.remove('pulse');
            statusDiv.innerHTML = '<div class="loading"></div> Generating your music...';

            // Reset player and sheet music
            playerContent.style.display = 'none';
            sheetContent.style.display = 'none';

            try {
                const formData = new FormData();
                formData.append('prompt', prompt);
                console.log(uploadedFiles.length, "files to upload");
                // Grab uploaded files from file input
                if (uploadedFiles.length > 0) {
                    for (let i = 0; i < uploadedFiles.length; i++) {
                        formData.append('files', uploadedFiles[i]);
                    }
                }
                console.log("Form data prepared:", formData.get('prompt'), formData.getAll('files'));

            const response = await fetch("/generate", {
                method: "POST",
                body: formData  // ⬅️ Use FormData instead of JSON.stringify
            });
                if (!response.ok) throw new Error("Failed to generate music from backend.");

                const abcText = await response.text();
                currentABC = abcText;
                console.log("Generated ABC Notation:", abcText);
                // Display success
                statusDiv.innerHTML = '<i class="fas fa-check-circle" style="color: #00AF00; margin-right: 10px;"></i> Music generated successfully!';

                // Render ABC notation to sheet music
                notationDiv.innerHTML = ''; // Clear previous notation

                visualObj = ABCJS.renderAbc(
                    notationDiv,
                    abcText, // Use the sample ABC notation
                    {
                        responsive: 'resize',
                        add_classes: true,
                        staffwidth: 700,
                        scale: 1.2
                    }
                )[0];
                // Initialize synth
                console.log("AudioContext initialized:");
                abcSynth = new ABCJS.synth.CreateSynth();
                await abcSynth.init({ visualObj, audioContext: synthContext });
                await abcSynth.prime();
                totalTime = visualObj.duration || abcSynth.duration || 0;
                console.log("Synth initialized and primed. Total duration:", totalTime);
                updateTimeDisplay(0);
                // Show player and sheet music sections
                playerContent.style.display = 'block';
                sheetContent.style.display = 'block';
                generateBtn.disabled = false;

            } catch (error) {
                statusDiv.innerHTML = '';
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } finally {
                generateBtn.disabled = false;
            }
        }

        // progressContainer.addEventListener('click', (e) => {
        //     if (!isGenerating && audioPlayer.readyState > 0) {
        //         const width = progressContainer.clientWidth;
        //         const clickX = e.offsetX;
        //         const seekTime = (clickX / width) * totalTime;
        //         audioPlayer.currentTime = seekTime;
        //     }
        // });

        // document.getElementById("convert-audio-btn").addEventListener("click", () => {
        //     const abc = window.generatedABC || abcEditorText || ""; // 获取 abc 字符串
        //     if (!abc) {
        //         alert("No ABC music available.");
        //         return;
        //     }

        //     // 创建 MIDI 音频合成器
        //     const synth = new ABCJS.synth.CreateSynth();

        //     synth.init({
        //         visualObj: ABCJS.renderAbc("notation", abc)[0],
        //         audioContext: new (window.AudioContext || window.webkitAudioContext)(),
        //     }).then(() => {
        //         synth.prime().then(() => {
        //             synth.start(); // 播放音频
        //         });
        //     }).catch(error => {
        //         console.error("Audio conversion error:", error);
        //         alert("Failed to convert ABC to audio.");
        //     });
        // });
        // Export logic for audio playback and downloads
        window.addEventListener('DOMContentLoaded', () => {

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
            playBtn.addEventListener('click', () => { togglePlayback(); });

            prevBtn.addEventListener('click', () => {
                if (abcSynth) abcSynth.stop();
                clearInterval(timer);
                resumeTime = 0;
                isPlaying = false;
                updateTimeDisplay(0);
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            });

            nextBtn.addEventListener('click', () => {
                if (abcSynth) abcSynth.stop();
                clearInterval(timer);
                resumeTime = totalTime;
                isPlaying = false;
                updateTimeDisplay(totalTime);
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            });

            progressContainer.addEventListener('click', async (e) => {
                // if (!abcSynth || !visualObj || !synthContext || typeof abcSynth.seek !== 'function') return;
                const width = progressContainer.clientWidth;
                const clickX = e.offsetX;
                const seekTime = (clickX / width) * totalTime;

                await startPlaybackFrom(seekTime);
            });

            instrumentBtns.forEach(btn => btn.addEventListener('click', () => {
                // Instrument switching not implemented for ABCJS synth
                btn.addEventListener('click', () => {
                    if (!isGenerating) {
                        // instrumentBtns.forEach(b => b.classList.remove('active'));
                        // btn.classList.add('active');
                        // currentInstrument = btn.dataset.instrument;

                        // if(totalTime > 0){
                        //     loadAudio(currentInstrument);
                        //     if (isPlaying) {
                        //         startPlayback();
                        //     }
                        // }
                        alert("Instrument switching is not supported in this version. Please use the default instrument.");
                    }
                });
            }));

            // Remove Convert ABC button if exists
            const convertBtn = document.getElementById('convert-audio-btn');
            if (convertBtn) convertBtn.style.display = 'none';
            // Download midi via API calls
            document.getElementById("download-midi-btn")?.addEventListener("click", async () => {
                try {
                    const res = await fetch("/download-midi", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ abc: currentABC })
                    });
                    if (!res.ok) throw new Error("Failed to generate MIDI");
                    const blob = await res.blob();
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "generated_music.mid";
                    a.click();
                } catch (err) {
                    alert("Error downloading MIDI: " + err.message);
                }
            });
            // Old version: download midi via ABCJS
            // This probably cannot be played on Windows
            // document.getElementById("download-midi-btn")?.addEventListener("click", () => {
            //     const midi = ABCJS.synth.getMidiFile(sample_abc, { midiOutputType: "binary" });
            //     const blob = new Blob([midi], { type: "audio/midi" });
            //     const a = document.createElement("a");
            //     a.href = URL.createObjectURL(blob);
            //     a.download = "generated_music.mid";
            //     a.click();
            // });

            // Download PDF via SVG rendering
            document.getElementById("download-pdf-btn")?.addEventListener("click", () => {
                const MARGIN = 10; // in jsPDF units (1 unit = 1/72 inch by default)

                const svgElement = document.querySelector("#notation svg");
                if (svgElement) {
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(svgBlob);
                    const img = new Image();

                    img.onload = () => {
                        const scale = 2;
                        const canvas = document.createElement('canvas');
                        const rect = svgElement.getBoundingClientRect();
                        canvas.width = rect.width * scale;
                        canvas.height = rect.height * scale;
                        const ctx = canvas.getContext('2d');

                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        const imgData = canvas.toDataURL("image/jpeg", 1.0);
                        const pdf = new window.jspdf.jsPDF();
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const contentWidth = pageWidth - MARGIN * 2;
                        const contentHeight = pageHeight - MARGIN * 2;

                        let imgHeight = (canvas.height * contentWidth) / canvas.width;
                        let yOffset = 0;

                        while (yOffset < imgHeight) {
                            const sliceCanvas = document.createElement('canvas');
                            sliceCanvas.width = canvas.width;
                            sliceCanvas.height = (contentHeight * canvas.width) / contentWidth;
                            const sliceCtx = sliceCanvas.getContext('2d');
                            sliceCtx.fillStyle = '#fff';
                            sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                            sliceCtx.drawImage(canvas, 0, -(yOffset * canvas.width) / contentWidth);

                            const sliceData = sliceCanvas.toDataURL('image/jpeg', 1.0);
                            pdf.addImage(sliceData, 'JPEG', MARGIN, MARGIN, contentWidth, contentHeight);

                            yOffset += contentHeight;
                            if (yOffset < imgHeight) pdf.addPage();
                        }

                        pdf.save("sheet_music.pdf");
                        URL.revokeObjectURL(url);
                    };

                    img.onerror = () => {
                        alert("Failed to load SVG image for PDF export. Please try again.");
                        URL.revokeObjectURL(url);
                    };

                    img.src = url;
                } else {
                    alert("Sheet music not rendered yet. Please generate music first.");
                }
            });
        });


        // Initialize
        updateTimeDisplay(0);
        totalTime = 0;
        renderUploadedFiles();
        // Example prompt for user convenience
        promptInput.value = "A joyful piano piece in C major, fast tempo, with a flowing melody";
        // loadAudio(currentInstrument);
    }


}