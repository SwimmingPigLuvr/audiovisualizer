import * as THREE from 'three';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let asciiEnabled = true;

let currentSource = 'mp3';

let previousUpdateTime = 0;
const updateInterval = 1000 / 12;

let torus, plane;
let camera, controls, scene, renderer, effect, geometry;
let analyser, musicAnalyser, micAnalyser;
let micInput, music;

let listener = new THREE.AudioListener();
let isMicSetup = false;

const start = Date.now();

init();
animate();

function initAudio() {

    camera.add(listener);

    // mp3 setup
    music = new THREE.Audio(listener);
    musicAnalyser = new THREE.AudioAnalyser(music);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/static/music/lights.mp3', function(buffer) {
        music.setBuffer(buffer);
        music.setLoop(true);
        music.setVolume(0.5);
        // music.play(); // don't play this immediately
    });
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

function init() {

    // camera
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.y = 500;
    camera.position.z = 500;

    // scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0, 0, 0 );

    // lights
    const pointLight1 = new THREE.PointLight( 0xffffff, 5, 0, 0);
    pointLight1.position.set( 500, 500, 500 );
    scene.add( pointLight1 );

    const pointLight2 = new THREE.PointLight( 0xffffff, 5, 0, 0 );
    pointLight2.position.set( - 500, - 500, - 500 );
    scene.add( pointLight2 );

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // shape
    geometry = new THREE.PlaneGeometry( 500, 500, 50, 50 ); 
    const material = new THREE.MeshStandardMaterial( { 
        color: 0xffff0,
        metalness: 1,
        roughness: 0.5
    } ); 
    torus = new THREE.Mesh( geometry, material ); 
    scene.add( torus );

    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );

    // ascii effect
    effect = new AsciiEffect( renderer, ' .:-+*=%@#', { invert: true } );
    effect.setSize( window.innerWidth, window.innerHeight );
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
    effect.setSize( window.innerWidth, window.innerHeight );
}


function updateObject() {
    if (analyser && torus.geometry.isBufferGeometry) {
        // Get frequency data
        const frequencyData = analyser.getFrequencyData();

        // Normalize frequency data for visualization
        const normalizedData = frequencyData.map(value => value / 255.0); // Normalize to [0, 1]

        // Apply normalized data to displace the z position of the vertices
        const positions = torus.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            let zDisplacement = normalizedData[i % normalizedData.length] * 50; // Scale displacement
            // Update the z position directly
            positions.setZ(i, zDisplacement);
        }
        positions.needsUpdate = true;

        // Optional: Adjust material properties based on the average frequency
        const avgFrequency = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
        torus.material.color.setHSL(avgFrequency / 256, 1, 0.5);

    } else {
        // Default behavior if no analyser is available or the geometry isn't buffer geometry
        // Note: It seems you commented out these lines, indicating they might not be necessary.
        // If you don't need to update the object when there's no audio input, you can remove this section.
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

document.getElementById('playButton').addEventListener('click', function() {

    if (THREE.AudioContext.getContext().state === 'suspended') {
        THREE.AudioContext.getContext().resume();
    }

    if (isMicSetup) {
        if (micInput) micInput.stop();
        music.play();
        analyser = musicAnalyser; // switch to mp3 visualizer
    } else {
        music.stop();
        micInput.play();
        analyser = micAnalyser;
    }

    isMicSetup = !isMicSetup;

});




document.getElementById('asciiToggle').addEventListener('change', function(e) {
    toggleAsciiEffect(e.target.checked);
});

toggleAsciiEffect(document.getElementById('asciiToggle').checked);
