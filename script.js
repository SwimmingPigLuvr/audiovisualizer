import * as THREE from 'three';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// enable ascii effect
let asciiEnabled = true;

// animate at 12 fps
let previousUpdateTime = 0;
const updateInterval = 1000 / 12;

// shape
let plane;

// camera
let camera, controls, scene, renderer, effect, geometry;

// audio
let isMicSetup = false;
let micInput, music, musicAnalyser, micAnalyser;
let analyser;
let currentSource = 'mp3';
let listener = new THREE.AudioListener();

const start = Date.now();

init();
initAudio();
animate();

function initAudio() {

    camera.add(listener);

    // mp3 setup
    music = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/static/music/lights.mp3', function(buffer) {
        music.setBuffer(buffer);
        music.setLoop(true);
        music.setVolume(0.5);
        // music.play(); // don't play this immediately
    });

    // init music analyser
    musicAnalyser = new THREE.AudioAnalyser(music);
}



function changeSource(source) {
    if (source === 'mp3') {
        if (micInput) micInput.pause();
        music.play();
        analyser = musicAnalyser;
    } else if (source === 'mic') {
        music.pause();
        if (!isMicSetup) {
            // initial mic setup
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(function(stream) {
                    micInput = new THREE.Audio(listener);
                    micInput.setMediaStreamSource(stream);
                    micAnalyser = new THREE.AudioAnalyser(micInput);
                    micInput.play();
                    analyser = micAnalyser;
                    isMicSetup = true;
                }).catch(function(err) {
                    console.error('failed to get audio stream form media devices:', err);
                });
        } else {
            // mic has already been set up, resume
            micInput.play();
            analyser = micAnalyser;
        }
    }

    currentSource = source;
}

// choose audio source
document.getElementById('audioSource').addEventListener('change', function(e) {
    changeSource(e.target.value);
});

function init() {
    // scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0, 0, 0 );

    // camera
    camera = new THREE.
        PerspectiveCamera( 75, 
            innerWidth / innerHeight, 
            0.1, 
            1000 
        );
    camera.position.y = 500;
    camera.position.z = 500;

    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( innerWidth, innerHeight );

    // lights
    const pointLight1 = new THREE.PointLight( 0xffffff, 3, 100, 0.05);
    pointLight1.position.set( 500, 500, 500 );
    scene.add( pointLight1 );

    const pointLight2 = new THREE.PointLight( 0xffffff, 1, 0, 0 );
    pointLight2.position.set( - 500, - 500, - 500 );
    scene.add( pointLight2 );

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // shape
    geometry = new THREE.BoxGeometry( 100, 100, 100 ); 
    const material = new THREE.MeshStandardMaterial( { 
        color: 0xffff0,
        metalness: 1,
        roughness: 1
    } ); 
    plane = new THREE.Mesh( geometry, material ); 
    scene.add( plane );


    // ascii effect
    effect = new AsciiEffect( renderer, ' .:-+*=%@#', { invert: true } );
    effect.setSize( innerWidth, innerHeight );
    effect.domElement.style.color = 'white';
    effect.domElement.style.backgroundColor = 'black';

    // camera controls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;

    window.addEventListener( 'resize', onWindowResize );
}

function onWindowResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( innerWidth, innerHeight );
    effect.setSize( innerWidth, innerHeight );
}


function updateObject() {
    if (analyser && plane.geometry.isBufferGeometry) {
        // Get frequency data
        const frequencyData = analyser.getFrequencyData();

        const frequencyParts = 30;
        const partSize = frequencyData.length / frequencyParts;

        let frequencySlices = [];

        for (let i = 0; i < frequencyParts; i++) {
            const start = Math.floor(i * partSize);
            const end = Math.floor(start + partSize);
            const partData = frequencyData.slice(start, end);
            const average = partData.reduce((a, b) => a + b, 0) / partData.length;

            frequencySlices.push(average);
        }

        const positions = plane.geometry.attributes.position;
        let vertexIndex = 0;
        const verticesPerSlice = Math.floor(positions.count / frequencyParts);

        for (let i = 0; i < frequencySlices.length; i++) {
            const zDisplacement = frequencySlices[i] / 256 * 50;

            for (let j = 0; j < verticesPerSlice && vertexIndex < positions.count; j++) {
                positions.setZ(vertexIndex, zDisplacement);
                vertexIndex++;
            }
        }

        positions.needsUpdate = true;

    } else {
    
    }
}

function animate(timestamp) {

    requestAnimationFrame(animate);

    if (!analyser) return;

    const delta = timestamp - previousUpdateTime;

    if (delta > updateInterval) {
        updateObject();
        previousUpdateTime = timestamp - (delta % updateInterval);
    }

    controls.update();
    render();
}

function toggleAsciiEffect(value) {
    asciiEnabled = value;
    if (asciiEnabled) {
        document.body.appendChild(effect.domElement);
    } else {
        document.body.appendChild(renderer.domElement);

        if (effect.domElement.parentNode) {
            effect.domElement.parentNode.removeChild(effect.domElement);
        }
    }
}

function render() {

    controls.update();

    if (asciiEnabled) {
        effect.render( scene, camera );
    } else {
        renderer.render(scene, camera);
    }
}





document.getElementById('asciiToggle').addEventListener('change', function(e) {
    toggleAsciiEffect(e.target.checked);
});

toggleAsciiEffect(document.getElementById('asciiToggle').checked);
