// Import the WindowManager class from the WindowManager.js file.
import WindowManager from './WindowManager.js';

// Set up Three.js variables for 3D rendering.
const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

// Initialize the current day at 00:00:00.000.
let today = new Date();
today.setHours(0, 0, 0, 0);
today = today.getTime();

// Get the current time in seconds since the start of the day.
let internalTime = getTime();
let windowManager;
let initialized = false;


// Function to get time in seconds since the beginning of the day.
function getTime() {
    return (new Date().getTime() - today) / 1000.0;
}


// Listen for visibility changes to initialize the scene when the page is visible.
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState != 'hidden' && !initialized) {
		init();
	}
});

// Initialize the scene once the window has loaded and is visible.
window.onload = () => {
	if (document.visibilityState != 'hidden') {
		init();
	}
};

// Function to initialize the scene.
function init() {
	initialized = true;

	// Delay setup to ensure accurate window measurements.
	setTimeout(() => {
		setupScene();
		setupWindowManager();
		resize();
		updateWindowShape(false);
		render();
		window.addEventListener('resize', resize);
	}, 500);    
}

// Function to set up the Three.js scene.
function setupScene() {
	// Create an orthographic camera for 2D-like projection.
	camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
	camera.position.z = 2.5;
	near = camera.position.z - .5;
	far = camera.position.z + 0.5;

	// Initialize the scene and set its background to black.
	scene = new t.Scene();
	scene.background = new t.Color(0.0);
	scene.add(camera);

	// Set up the WebGL renderer with anti-aliasing and depth buffer.
	renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
	renderer.setPixelRatio(pixR);

	// Create a container for all 3D objects.
	world = new t.Object3D();
	scene.add(world);

	// Append the rendering element to the document body.
	renderer.domElement.setAttribute("id", "scene");
	document.body.appendChild(renderer.domElement);
}

// Function to set up the window manager.
function setupWindowManager() {
	windowManager = new WindowManager();
	windowManager.setWinShapeChangeCallback(updateWindowShape);
	windowManager.setWinChangeCallback(windowsUpdated);

	// Custom metadata for window instances.
	let metaData = {foo: "bar"};

	// Initialize the window manager with the custom metadata.
	windowManager.init(metaData);

	// Initial call to update windows.
	windowsUpdated();
}

// Function to handle updates from the window manager.
function windowsUpdated() {
	setUpSphere();
}

// Function to update the number of cubes based on windows.
function setUpSphere() {
	// Remove all existing cubes from the world.
	cubes.forEach((c) => {
		world.remove(c);
	});

	cubes = [];

	// Set up a single sphere
	let c = new t.Color();
	c.setHSL(0.1, 1.0, 0.5); // Choose a color; 0.1 is just an example

	let s = 200; // Size of the sphere
	let sphere = new t.Mesh(new t.SphereGeometry(s, 32, 32), new t.MeshBasicMaterial({color: c, wireframe: true}));

	// Set the position of the sphere
	sphere.position.x = 840; // Set the X position
	sphere.position.y = 420; // Set the Y position

	// Add the sphere to the world
	world.add(sphere);
	cubes.push(sphere);
}

// Function to update the window shape with optional easing.
function updateWindowShape(easing = true) {
	// Update the target position for the scene based on the window's screen position.
	sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};

	// If easing is not required, directly set the scene offset to the target.
	if (!easing) sceneOffset = sceneOffsetTarget;
}

let posTarget = {x: 0, y: 0};

// Listen for mousemove event to update mousePos
window.addEventListener('mousemove', (event) => {
	mousePos.x = event.clientX;
	mousePos.y = event.clientY;
});

function convertCoordinates(normalizedX, normalizedY, canvasWidth, canvasHeight) {
    // Increase the extremity boundary (e.g., 20% of the dimensions)
    const boundary = 0.2;

    // Calculate the boost factor with a weaker impact
    const boostX = calculateBoostFactor(normalizedX, boundary);
    const boostY = calculateBoostFactor(normalizedY, boundary);

    // Convert and boost normalized coordinates
    let x = ((1 - normalizedX) * canvasWidth *1.1) * boostX;
    let y = (normalizedY * canvasHeight * 1.1) * boostY;

    console.log('normalized coordinates', normalizedX, normalizedY);
    return { x, y };
}

function calculateBoostFactor(coordinate, boundary) {
    // Weaken the boost factor
    // The closer the coordinate to the edge, the smaller the boost
    if (coordinate < boundary) {
        return 1 + ((boundary - coordinate) / (boundary * 5)); // Weaker boost
    } else if (coordinate > 1 - boundary) {
        return 1 + ((coordinate - (1 - boundary)) / (boundary * 5)); // Weaker boost
    }
    return 1;
}

// The main rendering loop of the application.
function render() {
	let t = getTime();  // Get the current internal time.

	// Smooth transition for the scene movement.
	let falloff = .05;  // Falloff value for smoothing.
	sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
	sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

	// Update the world position based on the offset.
	world.position.x = sceneOffset.x;
	world.position.y = sceneOffset.y;


	
	// Update the position and rotation of each cube/sphere based on the window data.
	for (let i = 0; i < cubes.length; i++) {
		let cube = cubes[i];

		// Check if hand data is available and has at least one set of points
		if (window.handData && window.handData.length > 0) {
			const handPoints = window.handData[0]; // Get the first set of hand points
	
			if (handPoints.length > 8) { // Ensure there's an index finger data
				const indexFingerTip = handPoints[4]; // Get index finger tip data
	
				const canvasWidth = renderer.domElement.clientWidth;
				const canvasHeight = renderer.domElement.clientHeight;
	
				// Convert the coordinates from normalized space to canvas space
				const canvasCoords = convertCoordinates(indexFingerTip.x, indexFingerTip.y, canvasWidth, canvasHeight);
				posTarget = canvasCoords;
			}
		}

		console.log('postarget', posTarget)
	
		cube.position.x = cube.position.x + (posTarget.x - cube.position.x) * falloff;
		cube.position.y = cube.position.y + (posTarget.y - cube.position.y) * falloff;
		cube.rotation.x = t * .5;
		cube.rotation.y = t * .3;
	}

	renderer.render(scene, camera);  // Render the scene using the camera.
	requestAnimationFrame(render);  // Request the next frame for animation.
}

// Function to resize the renderer and adjust camera on window resize.
function resize() {
	let width = window.innerWidth;  // Get the new window width.
	let height = window.innerHeight;  // Get the new window height.
	
	// Update the camera's aspect ratio and projection matrix.
	camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
	camera.updateProjectionMatrix();
	
	// Adjust the renderer size to fit the new window size.
	renderer.setSize(width, height);
}
