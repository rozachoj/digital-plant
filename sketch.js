// === SIMPLE TEST VERSION ===
let sensorData = {
  soilMoisture: 600,
  oxygen: 350,
  heartRate: 0
};

// Simple plant variables
let plant = [];
let time = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  console.log("Plant simulation ready!");
  console.log("Click anywhere to connect Arduino");
  
  // Start with one stem
  plant.push({
    x: width/2,
    y: height - 100,
    length: 50,
    angle: -PI/2
  });
}

// This function gets called from HTML when serial data arrives
window.handleSerialData = function(data) {
  console.log("Got data:", data);
  
  // Simple parsing - adjust based on your Arduino output
  let parts = data.trim().split(' ');
  if (parts.length > 0) {
    let soil = Number(parts[0]);
    if (!isNaN(soil)) {
      sensorData.soilMoisture = soil;
      console.log("Soil updated to:", soil);
    }
  }
};

function draw() {
  background(135, 206, 235); // Sky blue
  
  // Draw ground
  fill(120, 90, 60);
  rect(0, height - 100, width, 100);
  
  // Draw pot
  fill(205, 133, 63);
  rect(width/2 - 50, height - 150, 100, 50);
  
  // Draw plant
  stroke(85, 107, 47);
  strokeWeight(10);
  for (let stem of plant) {
    let endX = stem.x + cos(stem.angle) * stem.length;
    let endY = stem.y + sin(stem.angle) * stem.length;
    line(stem.x, stem.y, endX, endY);
  }
  
  // Draw UI
  fill(0, 0, 0, 150);
  rect(10, 10, 200, 80, 5);
  
  fill(255);
  textSize(16);
  text("Digital Fuchsia Plant", 20, 35);
  textSize(12);
  text("Soil: " + sensorData.soilMoisture, 20, 60);
  text("Click to connect Arduino", 20, 80);
  
  time += 0.02;
}

function mousePressed() {
  // Add a new stem when clicked (for testing)
  plant.push({
    x: width/2,
    y: height - 100,
    length: random(20, 60),
    angle: random(-PI, 0)
  });
  console.log("Added new stem!");
}
