import * as THREE from "three";

import TWEEN from "three/addons/libs/tween.module.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import {
  CSS3DRenderer,
  CSS3DObject,
} from "three/addons/renderers/CSS3DRenderer.js";

// URL of the public S3 object
const s3Url = "https://vapop.s3.eu-west-2.amazonaws.com/";
const s3JSONUrl =
  "https://vapop.s3.eu-west-2.amazonaws.com/generated_prompts.json";

let camera, scene, renderer;
let controls;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const objects = [];
const targets = { sphere: [], helix: [], grid: [] };

let isModalOpen = false;
let keysArray = [];

let jsonData = initialFetchS3Object();

init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = 3000;

  scene = new THREE.Scene();

  renderer = new CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener("change", render);

  const buttonReset = document.getElementById("resetCam");
  buttonReset.addEventListener("click", function () {
    controls.reset();
  });

  const buttonSphere = document.getElementById("sphere");
  buttonSphere.addEventListener("click", function () {
    transform(targets.sphere, 2000);
  });

  const buttonHelix = document.getElementById("helix");
  buttonHelix.addEventListener("click", function () {
    transform(targets.helix, 2000);
  });

  const buttonGrid = document.getElementById("grid");
  buttonGrid.addEventListener("click", function () {
    transform(targets.grid, 2000);
  });

  // Add mouse click event listener
  window.addEventListener("click", onMouseClick, false);
  window.addEventListener("dblclick", onMouseDblClick, false);

  // resize listener
  window.addEventListener("resize", onWindowResize);

  setInterval(checkForJsonUpdates, 10000);
}

function createShapes() {
  const values = Object.values(jsonData);

  for (let i = 0; i < Object.keys(jsonData).length; i++) {
    const element = document.createElement("div");
    element.className = "element";
    element.style.backgroundColor = "rgba(255,255,255,50)";

    const symbol = document.createElement("img");
    symbol.className = "symbol";
    symbol.src = s3Url + keysArray[i];
    element.appendChild(symbol);

    const objectCSS = new CSS3DObject(element);
    objectCSS.position.x = Math.random() * 4000 - 2000;
    objectCSS.position.y = Math.random() * 4000 - 2000;
    objectCSS.position.z = Math.random() * 4000 - 2000;
    scene.add(objectCSS);

    objects.push(objectCSS);
  }

  // sphere

  const vector = new THREE.Vector3();

  for (let i = 0, l = objects.length; i < l; i++) {
    const phi = Math.acos(-1 + (2 * i) / l);
    const theta = Math.sqrt(l * Math.PI) * phi;

    const object = new THREE.Object3D();

    object.position.setFromSphericalCoords(800, phi, theta);

    vector.copy(object.position).multiplyScalar(2);

    object.lookAt(vector);

    targets.sphere.push(object);
  }

  // helix

  for (let i = 0, l = objects.length; i < l; i++) {
    const theta = i * 0.275 + Math.PI;
    const y = -(i * 10) + 450;

    const object = new THREE.Object3D();

    object.position.setFromCylindricalCoords(1000, theta, y);

    vector.x = object.position.x * 2;
    vector.y = object.position.y;
    vector.z = object.position.z * 2;

    object.lookAt(vector);

    targets.helix.push(object);
  }

  // grid

  for (let i = 0; i < objects.length; i++) {
    const object = new THREE.Object3D();

    object.position.x = (i % 5) * 400 - 800;
    object.position.y = -(Math.floor(i / 5) % 5) * 400 + 800;
    object.position.z = Math.floor(i / 25) * 1000 - 1000;

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
      .to(
        { x: target.position.x, y: target.position.y, z: target.position.z },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
        Math.random() * duration + duration
      )
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
    const data = await response.json(); // Assuming the file is in JSON format
    console.log("File data:", data); // Handle file data here
    console.log(Object.keys(data).length);
    jsonData = data;
    keysArray = Object.keys(jsonData);
    createShapes();
    return data; // Return the data to the caller
  } catch (error) {
    console.error("Error fetching the file:", error);
    throw error; // Rethrow the error if you want to handle it outside the function
  }
}

function onMouseDblClick(event) {
  // Step 2: Perform DOM-based hit detection for CSS3DObjects
  const element = document.elementFromPoint(event.clientX, event.clientY);

  if (element.classList.contains("symbol")) {
    handleObjectClick(element);
    isModalOpen = true;
  } else {
    console.log("empty");
  }
}

function onMouseClick(event) {
  // Calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);
}

function handleObjectClick(object) {
  // You can access the object properties and perform actions
  console.log("Clicked object:", object);

  // Create new fullscreen popup that shows image and prompt
  createFullscreenPopup(object);
}

// Function to create the fullscreen popup dynamically
function createFullscreenPopup(object) {
  // Create the outer popup div
  const popup = document.createElement("div");
  popup.id = "fullscreenPopup";
  popup.className = "popup";

  // Create the popup content div
  const popupContent = document.createElement("div");
  popupContent.className = "popup-content";

  // Create the close button
  const closeButton = document.createElement("span");
  closeButton.className = "close-btn";
  closeButton.innerHTML = "&times;"; // "×" symbol

  // Add event listener to close button to hide the popup
  closeButton.addEventListener("mousedown", function () {
    popup.style.display = "none";
    isModalOpen = false;
  });

  // Add some content to the popup
  const image = document.createElement("img");
  image.src = object.src; // Replace with your image URL
  image.alt = "Popup Heading Image";
  image.style.width = "100%"; // Adjust image size if needed
  image.style.maxWidth = "1000px"; // You can set max-width to control its size

  const prompt = document.createElement("p");
  prompt.innerText = jsonData[object.src.slice(41)];
  prompt.style.marginTop = "20px"; // Add margin to separate the image from the text if needed
  prompt.style.overflowY = 'auto';
  prompt.style.height = '200px';

  // Append the elements to the content and popup divs
  popupContent.appendChild(closeButton);
  popupContent.appendChild(image);
  popupContent.appendChild(prompt);
  popup.appendChild(popupContent);

  // Append the popup to the body
  document.body.appendChild(popup);

  // Show the popup by default
  popup.style.display = "block";
}

async function checkForJsonUpdates() {
  try {
    const response = await fetch(s3JSONUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch the file.");
    }

    const data = await response.json(); // Assuming the file is in JSON format

    // Compare the serialized JSON objects
    if (JSON.stringify(jsonData) === JSON.stringify(data)) {
      // JSON has not changed
      console.log("Json has not changed");
    } else {
      console.log("updating json");
      jsonData = data;
      addNewObject();
    }
  } catch (error) {
    console.error("Error fetching the file:", error);
    throw error; // Rethrow the error if you want to handle it outside the function
  }
}

function addNewObject() {
  const latestObjectKey =
    Object.keys(jsonData)[Object.keys(jsonData).length - 1];
  const vector = new THREE.Vector3();
  const index = Object.keys(jsonData).length - 1;

  const element = document.createElement("div");
  element.className = "element";
  element.style.backgroundColor = "rgba(255,255,255,50)";

  const symbol = document.createElement("img");
  symbol.className = "symbol";
  symbol.src = s3Url + latestObjectKey;
  element.appendChild(symbol);

  const objectCSS = new CSS3DObject(element);
  objectCSS.position.x = Math.random() * 4000 - 2000;
  objectCSS.position.y = Math.random() * 4000 - 2000;
  objectCSS.position.z = Math.random() * 4000 - 2000;
  scene.add(objectCSS);

  objects.push(objectCSS);

  // sphere

  const spherePhi = Math.acos(-1 + (2 * 1) / 1);
  const sphereTheta = Math.sqrt(1 * Math.PI) * spherePhi;

  const sphereObject = new THREE.Object3D();

  sphereObject.position.setFromSphericalCoords(800, spherePhi, sphereTheta);

  vector.copy(sphereObject.position).multiplyScalar(2);

  sphereObject.lookAt(vector);

  targets.sphere.push(sphereObject);

  console.log(targets.sphere);

  // helix

  const helixTheta = index * 0.275 + Math.PI;
  const helixY = -(index * 10) + 450;

  const helixObject = new THREE.Object3D();

  helixObject.position.setFromCylindricalCoords(1000, helixTheta, helixY);

  vector.x = helixObject.position.x * 2;
  vector.y = helixObject.position.y;
  vector.z = helixObject.position.z * 2;

  helixObject.lookAt(vector);

  targets.helix.push(helixObject);

  // grid

  const gridObject = new THREE.Object3D();

  gridObject.position.x = (index % 5) * 400 - 800;
  gridObject.position.y = -(Math.floor(index / 5) % 5) * 400 + 800;
  gridObject.position.z = Math.floor(index / 25) * 1000 - 2000;

  targets.grid.push(gridObject);

  transform(targets.sphere, 2000);
}
