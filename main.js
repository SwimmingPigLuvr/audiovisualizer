import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 50, window.innerWidth / 
window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.TorusGeometry( 15, 8, 4, 6 );

// Load the texture
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('/static/images/durstChart.jpeg'); // Ensure the path to your image is correct

const material = new THREE.MeshBasicMaterial({ map: texture });

const torus = new THREE.Mesh( geometry, material );
scene.add( torus );

camera.position.z = 100;

function animate() {
    
    let rate = 0.01;
    requestAnimationFrame( animate );
    
    torus.rotation.z += rate * 0.5;
    // torus.rotation.x -= rate;
    torus.rotation.y -= rate;
    // torus.rotation.y += rate;

    renderer.render( scene, camera );
}

animate();


