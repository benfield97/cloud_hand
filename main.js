import WindowManager from './WindowManager.js';

const t = THREE;
let color = '8ecae6'
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let particleSystem;
let particlePositions;
let particleCount = 15000; // Number of particles in the trail
let particleHistoryLength = 5; // Length of the trail for each particle
let historySize = 5; // Size of the position history
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};
let sphereTargetSize = 1;  // Target size for the sphere
let sphereSizeLerpRate = 0.1;  // Lerp rate for smoothing the size change
let pointColor = new THREE.Color(0x8ecae6);

let today = new Date();
today.setHours(0, 0, 0, 0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

function getTime() {
    return (new Date().getTime() - today) / 1000.0;
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState != 'hidden' && !initialized) {
        init();
    }
});

window.onload = () => {
    if (document.visibilityState != 'hidden') {
        init();
    }
};

function init() {
    initialized = true;

    setTimeout(() => {
        setupScene();
        setupWindowManager();
        setupParticleSystem();
        resize();
        updateWindowShape(false);
        render();
        window.addEventListener('resize', resize);
    }, 500);
}

function setupScene() {
    camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
    camera.position.z = 2.5;
    near = camera.position.z - .5;
    far = camera.position.z + 0.5;

    scene = new t.Scene();
    scene.background = new t.Color(0.0);
    scene.add(camera);

    renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
    renderer.setPixelRatio(pixR);

    world = new t.Object3D();
    scene.add(world);

    renderer.domElement.setAttribute("id", "scene");
    document.body.appendChild(renderer.domElement);
}

function setupWindowManager() {
    windowManager = new WindowManager();
    windowManager.setWinShapeChangeCallback(updateWindowShape);
    windowManager.setWinChangeCallback(windowsUpdated);

    let metaData = {foo: "bar"};
    windowManager.init(metaData);
    windowsUpdated();
}


function setupParticleSystem() {
    let particleGeometry = new THREE.BufferGeometry();
    particlePositions = new Float32Array(particleCount * 3 * particleHistoryLength);
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    let particleMaterial = new THREE.PointsMaterial({
        color: pointColor,
        size: 2,
        transparent: true,
        opacity: 0.3
    });

    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // Initialize particle positions to be off-screen
    for (let i = 0; i < particlePositions.length; i++) {
        particlePositions[i] = -1000; // Position them far off-screen
    }
}

function windowsUpdated() {
    setUpSphere();
}

function setUpSphere() {
    // Clear existing cubes or points
    cubes.forEach((c) => {
        world.remove(c);
    });
    cubes = [];

    // Define the color and size of the points
    let pointSize = 1.0; // Increase the point size for visibility

    // Create a more detailed sphere geometry for more points
    let sphereGeometry = new THREE.SphereGeometry(200, 64, 64); // Increased detail

    // Convert to buffer geometry for efficiency
    let bufferGeometry = new THREE.BufferGeometry().fromGeometry(sphereGeometry);

    // Add additional points by cloning the positions
    let positions = Float32Array.from(bufferGeometry.attributes.position.array);
    let expandedPositions = new Float32Array(positions.length * 2); // Double the points
    expandedPositions.set(positions);
    expandedPositions.set(positions, positions.length);
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(expandedPositions, 3));

    // Create the points material
    let pointsMaterial = new THREE.PointsMaterial({
        color: pointColor,
        size: pointSize,
        sizeAttenuation: true,
        transparent: true, // Allow transparency for a more gaseous effect
        opacity: 0.6 // Adjust opacity as needed
    });

    // Create the points object
    let points = new THREE.Points(bufferGeometry, pointsMaterial);

    // Add the points to the world and cubes array
    world.add(points);
    cubes.push(points);
}

function animatePoints() {
    cubes.forEach((points) => {
        let positions = points.geometry.attributes.position;
        let count = positions.count;

        for (let i = 0; i < count; i++) {
            // Get each position and apply some perlin noise or a similar function
            // to create a swirling motion. The noise function should ideally be 3D to
            // affect x, y, and z independently.
            let x = positions.getX(i);
            let y = positions.getY(i);
            let z = positions.getZ(i);

            positions.setXYZ(
                i,
                x + (noise(x, y, z) - 0.5) * 0.3, // Swirl effect on x-axis
                y + (noise(y, z, x) - 0.5) * 0.1, // Swirl effect on y-axis
                z + (noise(z, x, y) - 0.5) * 0.6  // Swirl effect on z-axis
            );
        }

        positions.needsUpdate = true; // Required after changing the positions
    });
}

function updateWindowShape(easing = true) {
    sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
    if (!easing) sceneOffset = sceneOffsetTarget;
}

let posTarget = {x: 0, y: 0};

function convertCoordinates(normalizedX, normalizedY, canvasWidth, canvasHeight) {
    const boundary = 0.2;
    const boostX = calculateBoostFactor(normalizedX, boundary);
    const boostY = calculateBoostFactor(normalizedY, boundary);
    let x = ((1 - normalizedX) * canvasWidth * 1.1) * boostX;
    let y = (normalizedY * canvasHeight * 1.1) * boostY;
    console.log('normalized coordinates', normalizedX, normalizedY);
    return { x, y };
}

function calculateBoostFactor(coordinate, boundary) {
    if (coordinate < boundary) {
        return 1 + ((boundary - coordinate) / (boundary * 5));
    } else if (coordinate > 1 - boundary) {
        return 1 + ((coordinate - (1 - boundary)) / (boundary * 5));
    }
    return 1;
}

function spawnParticleAtSphereBorder(spherePosition, sphereRadius) {
    let u = Math.random();
    let v = Math.random();
    let theta = u * 2.0 * Math.PI;
    let phi = Math.acos(2.0 * v - 1.0);
    let x = sphereRadius * Math.sin(phi) * Math.cos(theta);
    let y = sphereRadius * Math.sin(phi) * Math.sin(theta);
    let z = sphereRadius * Math.cos(phi);

    // Return the particle position relative to the sphere's position
    return { 
        x: spherePosition.x + x, 
        y: spherePosition.y + y, 
        z: spherePosition.z + z 
    };
}

function updateParticles() {
    // Shift positions back in the array to create a history trail
    for (let i = particleCount - 1; i >= 0; i--) {
        for (let j = particleHistoryLength - 1; j > 0; j--) {
            let idx = (i * particleHistoryLength + j) * 3;
            let prevIdx = (i * particleHistoryLength + j - 1) * 3;
            particlePositions[idx] = particlePositions[prevIdx];
            particlePositions[idx + 1] = particlePositions[prevIdx + 1];
            particlePositions[idx + 2] = particlePositions[prevIdx + 2];
        }
    }

    let parentSphereRadius = cubes[0].scale.x * 200; // Assuming this is the correct radius
    let randomnessFactor = 50; // Adjust this value to increase/decrease the randomness

    for (let i = 0; i < particleCount; i++) {
        let p = spawnParticleAtSphereBorder(cubes[0].position, parentSphereRadius);
        let baseIdx = i * particleHistoryLength * 3;

        // Introduce randomness
        let randomX = (Math.random() - 0.5) * randomnessFactor;
        let randomY = (Math.random() - 0.5) * randomnessFactor;
        let randomZ = (Math.random() - 0.5) * randomnessFactor;

        particlePositions[baseIdx] = p.x + randomX;
        particlePositions[baseIdx + 1] = p.y + randomY;
        particlePositions[baseIdx + 2] = p.z + randomZ;
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
}

function render() {
    let t = getTime();
    let falloff = .05;
    sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
    sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);
    world.position.x = sceneOffset.x;
    world.position.y = sceneOffset.y;

    for (let i = 0; i < cubes.length; i++) {
        let cube = cubes[i];
        if (window.handData && window.handData.length > 0) {
            const handPoints = window.handData[0];
            if (handPoints.length > 8) {
                const thumbFingerTip = handPoints[4];
                const indexFingerTip = handPoints[8];
                const canvasWidth = renderer.domElement.clientWidth;
                const canvasHeight = renderer.domElement.clientHeight;
                const thumbCanvasCoords = convertCoordinates(thumbFingerTip.x, thumbFingerTip.y, canvasWidth, canvasHeight);
                const indexCanvasCoords = convertCoordinates(indexFingerTip.x, indexFingerTip.y, canvasWidth, canvasHeight);
                const dx = thumbCanvasCoords.x - indexCanvasCoords.x;
                const dy = thumbCanvasCoords.y - indexCanvasCoords.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const sphereSize = distance / 250;

                sphereTargetSize = Math.max(0.1, Math.min(sphereSize, 5));
                cube.scale.x += (sphereTargetSize - cube.scale.x) * sphereSizeLerpRate;
                cube.scale.y += (sphereTargetSize - cube.scale.y) * sphereSizeLerpRate;
                cube.scale.z += (sphereTargetSize - cube.scale.z) * sphereSizeLerpRate;

                posTarget = thumbCanvasCoords;
            }
        }
        cube.position.x = cube.position.x + (posTarget.x - cube.position.x) * falloff;
        cube.position.y = cube.position.y + (posTarget.y - cube.position.y) * falloff;
        cube.rotation.x = t * .5;
        cube.rotation.y = t * .3;
    }

    updateParticles(); // Update the particle positions and trails
    



    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

// Call this once during initialization, not in the render loop
function initializeParticles() {
    // Initialize particle positions to be off-screen
    for (let i = 0; i < particlePositions.length; i++) {
        particlePositions[i] = -1000; // Position them far off-screen
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
}

function resize() {
    let width = window.innerWidth;
    let height = window.innerHeight;
    camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}
