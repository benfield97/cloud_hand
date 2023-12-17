const videoElement = document.getElementsByClassName('input_video')[0];
	window.handData = null; // Global variable to store hand data

function onResults(results) {
    if (results.multiHandLandmarks) {
        window.handData = results.multiHandLandmarks;
    }
}

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.3,
    minTrackingConfidence: 0.3
});
hands.onResults(onResults); // Ensure the onResults function is defined in your scripts

const camera = new Camera(videoElement, {
    onFrame: async () => {
    await hands.send({image: videoElement});
    },
    width: window.innerWidth,
    height: window.innerHeight
});
camera.start();