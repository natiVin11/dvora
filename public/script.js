let scene, camera, renderer, bazziGroup, head, mouth, wings = [];
let isSpeaking = false, isDancing = false, isListening = false;
let mouse = new THREE.Vector2();
let voices = [];

// טעינת קולות חכמה
function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

// --- פונקציית הדיבור (TTS) ---
function say(text) {
    const bubble = document.getElementById("bubble");
    bubble.innerText = text;
    bubble.style.display = "block";

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);

        if (voices.length === 0) loadVoices();
        const maleVoice = voices.find(v => v.lang.includes('he') && !v.name.toLowerCase().includes('female'));

        if (maleVoice) msg.voice = maleVoice;
        msg.lang = 'he-IL';
        msg.pitch = 0.85;
        msg.rate = 1.0;

        msg.onstart = () => isSpeaking = true;
        msg.onend = () => isSpeaking = false;
        window.speechSynthesis.speak(msg);
    }
}

// --- זיהוי קולי רציף (STT) ---
const micBtn = document.getElementById('mic-btn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.continuous = true; // שומע משפטים שלמים
    recognition.interimResults = false;

    micBtn.onclick = () => {
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch(e) { console.error("Mic Error:", e); }
        }
    };

    recognition.onstart = () => {
        isListening = true;
        micBtn.style.background = "#ff5252";
        micBtn.innerText = "🛑";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        document.getElementById('userBox').value = transcript;
        askBazzi();
    };

    recognition.onend = () => {
        isListening = false;
        micBtn.style.background = "#f9a825";
        micBtn.innerText = "🎤";
    };
}

async function askBazzi() {
    const input = document.getElementById("userBox");
    const question = input.value.trim();
    if (!question) return;
    input.value = "";

    // פקודת ריקוד
    if (question.includes("תרקוד") || question.includes("ריקוד")) {
        isDancing = true;
        setTimeout(() => isDancing = false, 3000);
        say("זזז... תראו איזה ריקוד מטורף!");
        return;
    }

    try {
        const res = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });
        const data = await res.json();
        say(data.answer);
    } catch (e) { say("סליחה, יש לי תקלה קטנה בכנפיים."); }
}

// --- מודל 3D (באזי המלא) ---
function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0.5, 9);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("canvas-wrapper").appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    bazziGroup = new THREE.Group();
    // גוף
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshPhongMaterial({color: 0xffcc00}));
    body.scale.set(1, 1, 1.3);
    bazziGroup.add(body);
    // פסים ועוקץ
    const stripeMat = new THREE.MeshBasicMaterial({color: 0x111111});
    for(let i=-1; i<=1; i++) {
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.12, 16, 100), stripeMat);
        stripe.position.z = i * 0.5; stripe.rotation.y = Math.PI/2;
        bazziGroup.add(stripe);
    }
    const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 16), stripeMat);
    stinger.rotation.x = -Math.PI/2; stinger.position.z = -2.2;
    bazziGroup.add(stinger);

    // ראש
    head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 32), new THREE.MeshPhongMaterial({color: 0x3e2723})));

    // עיניים מפורטות
    [-0.4, 0.4].forEach(x => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), new THREE.MeshPhongMaterial({color: 0xffffff}));
        eye.position.set(x, 0.3, 0.8);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), new THREE.MeshBasicMaterial({color: 0x000000}));
        pupil.position.z = 0.3;
        eye.add(pupil);
        head.add(eye);
    });

    mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 16, 32, Math.PI), new THREE.MeshBasicMaterial({color: 0xff8a80}));
    mouth.position.set(0, -0.3, 1); mouth.rotation.x = Math.PI;
    head.add(mouth);
    head.position.z = 1.6; bazziGroup.add(head);

    // כנפיים
    const wingGeo = new THREE.SphereGeometry(1.8, 32, 32); wingGeo.scale(1, 0.05, 0.6);
    [1, -1].forEach(side => {
        const wing = new THREE.Mesh(wingGeo, new THREE.MeshPhongMaterial({color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide}));
        wing.position.set(side * 1, 1, 0); wings.push(wing); bazziGroup.add(wing);
    });

    scene.add(bazziGroup);
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.002;
    if(bazziGroup) {
        if (isDancing) {
            bazziGroup.rotation.y += 0.3; bazziGroup.position.y = Math.sin(time * 10) * 0.8;
        } else {
            bazziGroup.position.y = Math.sin(time * 2) * 0.2;
            bazziGroup.rotation.y = THREE.MathUtils.lerp(bazziGroup.rotation.y, mouse.x * 0.4, 0.1);
        }
        wings[0].rotation.z = Math.sin(time * 60) * 0.5 + 0.5;
        wings[1].rotation.z = -Math.sin(time * 60) * 0.5 - 0.5;
        if(isSpeaking) mouth.scale.y = 1 + Math.abs(Math.sin(time * 25)) * 2;
        else mouth.scale.y = 1;
    }
    renderer.render(scene, camera);
}

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

document.getElementById('start-btn').onclick = () => {
    document.getElementById('start-overlay').style.display = 'none';
    init3D();
    say("שלום חברים! אני פרופסור באזי, בואו נדבר.");
};
document.getElementById('chat-form').onsubmit = (e) => { e.preventDefault(); askBazzi(); };