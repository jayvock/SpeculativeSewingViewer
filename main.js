import * as THREE from 'three';

import TWEEN from '/node_modules/three/examples/jsm/libs/tween.module.js';
import { TrackballControls } from '/node_modules/three/examples/jsm/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from '/node_modules/three/examples/jsm/renderers/CSS3DRenderer.js';

// URL of the public S3 object
const s3Url = "https://vapop.s3.eu-west-2.amazonaws.com/";
const s3JSONUrl = "https://vapop.s3.eu-west-2.amazonaws.com/generated_prompts.json";

let camera, scene, renderer;
let controls;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };
const images = [];

let keysArray = [];

let jsonData = initialFetchS3Object();

init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3000;

    scene = new THREE.Scene();

    renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    //

    controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener('change', render);

    const buttonReset = document.getElementById('resetCam');
    buttonReset.addEventListener('click', function () {

        controls.reset();

    });

    const buttonSphere = document.getElementById('sphere');
    buttonSphere.addEventListener('click', function () {

        transform(targets.sphere, 2000);

    });

    const buttonHelix = document.getElementById('helix');
    buttonHelix.addEventListener('click', function () {

        transform(targets.helix, 2000);

    });

    const buttonGrid = document.getElementById('grid');
    buttonGrid.addEventListener('click', function () {

        transform(targets.grid, 2000);

    });

    // Add mouse click event listener
    window.addEventListener('click', onMouseClick, false);
    
    // resize listener
    window.addEventListener('resize', onWindowResize);
}

function createShapes() {
        // table

        const values = Object.values(jsonData);

        for (let i = 0; i < Object.keys(jsonData).length; i ++) {

            const element = document.createElement('div');
            element.className = 'element';
            element.style.backgroundColor = 'rgba(255,255,255,50)';
    
            const symbol = document.createElement('img');
            symbol.className = 'symbol';
            symbol.src = s3Url + keysArray[i];
            console.log(s3Url + keysArray[i]);
            element.appendChild(symbol);
    
            const details = document.createElement('div');
            details.className = 'details';
            details.innerHTML = values[i];
            element.appendChild(details);
    
            const objectCSS = new CSS3DObject(element);
            objectCSS.position.x = Math.random() * 4000 - 2000;
            objectCSS.position.y = Math.random() * 4000 - 2000;
            objectCSS.position.z = Math.random() * 4000 - 2000;
            scene.add(objectCSS);
    
            objects.push(objectCSS);
    
            //
    
            const object = new THREE.Object3D();
            object.position.x = (table[i + 3] * 140) - 1330;
            object.position.y = - (table[i + 4] * 180) + 990;
    
            targets.table.push(object);
    
        }
    
        // sphere
    
        const vector = new THREE.Vector3();
    
        for (let i = 0, l = objects.length; i < l; i++) {
    
            const phi = Math.acos(- 1 + (2 * i) / l);
            const theta = Math.sqrt(l * Math.PI) * phi;
    
            const object = new THREE.Object3D();
    
            object.position.setFromSphericalCoords(800, phi, theta);
    
            vector.copy(object.position).multiplyScalar(2);
    
            object.lookAt(vector);
    
            targets.sphere.push(object);
    
        }
    
        // helix
    
        for (let i = 0, l = objects.length; i < l; i++) {
    
            const theta = i * 0.175 + Math.PI;
            const y = - (i * 8) + 450;
    
            const object = new THREE.Object3D();
    
            object.position.setFromCylindricalCoords(900, theta, y);
    
            vector.x = object.position.x * 2;
            vector.y = object.position.y;
            vector.z = object.position.z * 2;
    
            object.lookAt(vector);
    
            targets.helix.push(object);
    
        }
    
        // grid
    
        for (let i = 0; i < objects.length; i++) {
    
            const object = new THREE.Object3D();
    
            object.position.x = ((i % 5) * 400) - 800;
            object.position.y = (- (Math.floor(i / 5) % 5) * 400) + 800;
            object.position.z = (Math.floor(i / 25)) * 1000 - 2000;
    
            targets.grid.push(object);
    
        }

        transform(targets.sphere, 2000);
    
    }

function transform(targets, duration) {

    TWEEN.removeAll();

    for (let i = 0; i < objects.length; i++) {

        const object = objects[i];
        const target = targets[i];

        new TWEEN.Tween(object.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

        new TWEEN.Tween(object.rotation)
            .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

    }

    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();

}

function animate() {

    requestAnimationFrame(animate);

    TWEEN.update();

    controls.update();

}

function render() {

    renderer.render(scene, camera);

}

async function initialFetchS3Object() {
    try {
        const response = await fetch(s3JSONUrl);
        if (!response.ok) {
            throw new Error("Failed to fetch the file.");
        }
        const data = await response.json();  // Assuming the file is in JSON format
        console.log("File data:", data);  // Handle file data here
        console.log(Object.keys(data).length);
        jsonData = data;
        fetchImages();
        return data;  // Return the data to the caller
    } catch (error) {
        console.error("Error fetching the file:", error);
        throw error;  // Rethrow the error if you want to handle it outside the function
    }
}

async function fetchImages() {
    
    keysArray = Object.keys(jsonData);

    for (let i = 0; i < keysArray.length; i++) {
        const imageUrl = s3Url + keysArray[i];
        console.log(imageUrl);

        try {
            // Fetch the image from the S3 URL
            const response = await fetch(imageUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch the file at ${imageUrl}`);
            }

            // Read the response as an array buffer (for binary data like images)
            const imageData = await response.arrayBuffer();
            
            // Store the image data in the array
            images.push(imageData);

        } catch (error) {
            console.error("Error fetching the file:", error);
            throw error;  // Optional: rethrow if you want to handle it outside
        }
    }

    // After all images are fetched, process them
    createShapes();
}

function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Step 2: Perform DOM-based hit detection for CSS3DObjects
    const element = document.elementFromPoint(event.clientX, event.clientY);

    if (element.classList.contains('symbol')) {
        handleObjectClick(element);
    } else {
        console.log('empty');
    }
}

function handleObjectClick(object) {
    // You can access the object properties and perform actions
    console.log('Clicked object:', object);

    // Create new fullscreen popup that shows image and prompt
}
