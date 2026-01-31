// === SERIAL COMMUNICATION ===
let serialConnected = false;
let lastDataTime = 0;

// === SMOOTHING FOR STABLE SENSOR VALUES ===
const SMOOTHING_WINDOW = 10;
let soilMoistureHistory = [];
let oxygenHistory = [];
let heartRateHistory = [];

// Sensor data
let sensorData = {
  soilMoisture: 600,
  oxygen: 350,
  heartRate: 0
};

// Plant system
let plant = [];
let growthCounter = 0;
let time = 0;
let leaves = [];
let flowers = [];
let plantAge = 0;
let autoGrowth = true;

// === REAL PLANT'S PLANTING DATE ===
const PLANTING_DATE = new Date('2025-11-11');
let lastUpdateTime = null;

// Plant images
let branchImage;
let leafImage;
let flowerImage;
let potImage;
let groundImage;

// =====================================================
// POSITION CONTROLS - CHANGE THESE TO ADJUST
// =====================================================

// Pot position control
let potEmbedAmount = 150; // How much pot is embedded in ground (0-300)
let potHorizontalPosition = 0.5; // 0.0 = left, 0.5 = center, 1.0 = right

// Plant starting position (relative to pot)
let plantStartYOffset = 30; // Distance from top of pot where plant starts
let plantStartHeight = 20; // Initial stem height

// =====================================================

// Pot properties
let pot = {
  x: 0,
  y: 0,
  width: 200,
  height: 160,
  scale: 0.1,
  imageLoaded: false,
  plantStartY: 15 // Where plant emerges from pot (relative to pot top)
};

// Ground properties
let ground = {
  y: 0,
  height: 200
};

function preload() {
  branchImage = loadImage('fuchsia_branch.png');
  leafImage = loadImage('fuchsia_leaf.png');
  flowerImage = loadImage('fuchsia_flower.png');
  potImage = loadImage('fuchsia_pot.png');
  groundImage = loadImage('ground.png');
  
  potImage.loadPixels();
  console.log("All images loaded!");
}

// === SMOOTHING FUNCTION ===
function getSmoothedValue(history, newValue, windowSize) {
  history.push(newValue);
  while (history.length > windowSize) {
    history.shift();
  }
  if (history.length === 0) return newValue;
  let sum = 0;
  for (let i = 0; i < history.length; i++) {
    sum += history[i];
  }
  return Math.round(sum / history.length);
}

function calculateRealPlantAge() {
  const now = new Date();
  const ageInMillis = now - PLANTING_DATE;
  const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);
  return ageInDays * 100;
}

function calculatePotPosition() {
  // Calculate ground position
  ground.height = windowHeight * 0.25;
  ground.y = windowHeight - ground.height;
  
  // Update pot dimensions if image is loaded
  if (potImage.width > 0) {
    pot.scale = 0.1;
    pot.width = potImage.width * pot.scale;
    pot.height = potImage.height * pot.scale;
    pot.imageLoaded = true;
  }
  
  // Position pot: horizontally based on potHorizontalPosition, vertically embedded in ground
  pot.x = windowWidth * potHorizontalPosition;
  pot.y = ground.y + potEmbedAmount; // Center of pot at ground level + embed amount
  
  console.log("Pot position recalculated:");
  console.log("  Ground starts at y:", ground.y);
  console.log("  Pot center at y:", pot.y);
  console.log("  Pot top at y:", pot.y - pot.height/2);
  console.log("  Pot bottom at y:", pot.y + pot.height/2);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Calculate initial positions
  calculatePotPosition();
  
  // Initialize plant age
  plantAge = calculateRealPlantAge();
  lastUpdateTime = new Date();
  
  // Expose function to receive serial data from HTML
  window.handleSerialData = function(data) {
    processSerialData(data);
  };
  
  console.log("Fuchsia Plant Simulation Started!");
  console.log("Canvas size:", windowWidth, "x", windowHeight);
  
  // Start plant from top of pot
  let potTopY = pot.y - pot.height/2; // Top edge of pot
  let plantBaseY = potTopY + pot.plantStartY; // Where plant emerges from pot
  
  let baseX = pot.x;
  let baseY = plantBaseY - plantStartYOffset;
  
  console.log("Plant starting position:");
  console.log("  Base X:", baseX);
  console.log("  Base Y:", baseY);
  console.log("  Pot top Y:", potTopY);
  console.log("  Plant base Y:", plantBaseY);
  
  plant.push(new StemSegment(baseX, baseY, baseX, baseY - plantStartHeight, 0, -PI/2, 7));
}

function processSerialData(data) {
  if (!data) return;
  
  data = data.trim();
  if (data.length === 0) return;
  
  console.log("Raw data received:", data);
  
  let parts;
  if (data.includes(',')) {
    parts = data.split(',');
  } else if (data.includes(';')) {
    parts = data.split(';');
  } else {
    parts = data.split(/\s+/);
  }
  
  console.log("Parsed parts:", parts);
  
  if (parts.length >= 1) {
    let soilVal = parseFloat(parts[0]);
    if (!isNaN(soilVal)) {
      sensorData.soilMoisture = getSmoothedValue(soilMoistureHistory, soilVal, SMOOTHING_WINDOW);
    }
    
    if (parts.length >= 2) {
      let oxygenVal = parseFloat(parts[1]);
      if (!isNaN(oxygenVal)) {
        sensorData.oxygen = getSmoothedValue(oxygenHistory, oxygenVal, SMOOTHING_WINDOW);
      }
    }
    
    if (parts.length >= 3) {
      let heartVal = parseFloat(parts[2]);
      if (!isNaN(heartVal)) {
        sensorData.heartRate = getSmoothedValue(heartRateHistory, heartVal, SMOOTHING_WINDOW);
      }
    }
    
    serialConnected = true;
    lastDataTime = millis();
    
    console.log("Updated sensors - Soil:", sensorData.soilMoisture, 
                "O2:", sensorData.oxygen, 
                "Heart:", sensorData.heartRate);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Store old positions before recalculation
  let oldPotX = pot.x;
  let oldPotTopY = pot.y - pot.height/2;
  let oldPlantBaseY = oldPotTopY + pot.plantStartY;
  
  // Recalculate positions
  calculatePotPosition();
  
  // Calculate offsets
  let newPotTopY = pot.y - pot.height/2;
  let newPlantBaseY = newPotTopY + pot.plantStartY;
  
  let offsetX = pot.x - oldPotX;
  let offsetY = newPlantBaseY - oldPlantBaseY;
  
  console.log("Window resized - Offsets:", offsetX, offsetY);
  
  // Move all plant segments
  for (let segment of plant) {
    segment.baseStartX += offsetX;
    segment.baseStartY += offsetY;
    segment.baseEndX += offsetX;
    segment.baseEndY += offsetY;
    segment.startX += offsetX;
    segment.startY += offsetY;
    segment.endX += offsetX;
    segment.endY += offsetY;
  }
  
  // Move all leaves
  for (let leaf of leaves) {
    leaf.x += offsetX;
    leaf.y += offsetY;
  }
  
  // Move all flowers
  for (let flower of flowers) {
    flower.x += offsetX;
    flower.y += offsetY;
  }
}

function drawBackground() {
  let topColor = color(135, 206, 235);
  let bottomColor = color(240, 248, 255);
  
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(topColor, bottomColor, inter);
    stroke(c);
    line(0, y, width, y);
  }
  
  drawGround();
  drawPot();
}

function drawGround() {
  if (groundImage && groundImage.width > 0) {
    let groundY = ground.y;
    let groundHeight = ground.height;
    image(groundImage, 0, groundY, width, groundHeight);
  } else {
    fill(120, 90, 60);
    noStroke();
    rect(0, ground.y, width, ground.height);
    
    stroke(100, 70, 50, 80);
    strokeWeight(1);
    for (let x = 0; x < width; x += 20) {
      line(x, ground.y, x + 10, ground.y + 20);
    }
  }
}

function drawPot() {
  if (pot.imageLoaded && potImage.width > 0) {
    push();
    imageMode(CENTER);
    image(potImage, pot.x, pot.y, pot.width, pot.height);
    pop();
  } else {
    let potTopY = pot.y - pot.height/2;
    fill(205, 133, 63);
    stroke(165, 103, 43);
    strokeWeight(2);
    rect(pot.x - pot.width/3, potTopY, pot.width * 0.67, pot.height);
    fill(185, 113, 53);
    noStroke();
    rect(pot.x - pot.width/3, potTopY - 5, pot.width * 0.67, 10, 3);
  }
}

function draw() {
  drawBackground();
  
  time += 0.02;
  
  const now = new Date();
  if (lastUpdateTime) {
    const timePassed = now - lastUpdateTime;
    const daysPassed = timePassed / (1000 * 60 * 60 * 24);
    plantAge += daysPassed * 100;
  }
  lastUpdateTime = now;
  
  if (autoGrowth) {
    growthCounter++;
    let growthSpeed = getGrowthSpeed();
    if (growthCounter > growthSpeed && plant.length < 150) {
      if (shouldGrow()) {
        growPlant();
      }
      growthCounter = 0;
    }
  }
  
  updatePlant();
  drawPlant();
  drawUI();
}

// ... (rest of the functions remain the same until keyPressed) ...

function keyPressed() {
  if (key === ' ') {
    growPlant();
    console.log("Manual growth.");
  }
  
  if (key === 'r' || key === 'R') {
    plant = [];
    leaves = [];
    flowers = [];
    growthCounter = 0;
    
    plantAge = calculateRealPlantAge();
    lastUpdateTime = new Date();
    
    // Reset plant with correct position
    let potTopY = pot.y - pot.height/2;
    let plantBaseY = potTopY + pot.plantStartY;
    let baseX = pot.x;
    let baseY = plantBaseY - plantStartYOffset;
    
    console.log("Reset - Plant base Y:", baseY);
    
    plant.push(new StemSegment(baseX, baseY, baseX, baseY - plantStartHeight, 0, -PI/2, 7));
    
    sensorData.soilMoisture = 650;
    
    console.log("Plant reset!");
  }
  
  if (key === 'a' || key === 'A') {
    autoGrowth = !autoGrowth;
    console.log("Auto growth:", autoGrowth ? "ON" : "OFF");
  }
  
  // Debug controls for position adjustment
  if (key === '1') {
    potEmbedAmount -= 10;
    console.log("potEmbedAmount:", potEmbedAmount);
    windowResized(); // Trigger repositioning
  }
  
  if (key === '2') {
    potEmbedAmount += 10;
    console.log("potEmbedAmount:", potEmbedAmount);
    windowResized(); // Trigger repositioning
  }
  
  if (key === '3') {
    potHorizontalPosition = max(0, potHorizontalPosition - 0.05);
    console.log("potHorizontalPosition:", potHorizontalPosition);
    windowResized(); // Trigger repositioning
  }
  
  if (key === '4') {
    potHorizontalPosition = min(1, potHorizontalPosition + 0.05);
    console.log("potHorizontalPosition:", potHorizontalPosition);
    windowResized(); // Trigger repositioning
  }
  
  if (key === '5') {
    plantStartYOffset -= 5;
    console.log("plantStartYOffset:", plantStartYOffset);
    keyPressed({key: 'r'}); // Reset plant with new offset
  }
  
  if (key === '6') {
    plantStartYOffset += 5;
    console.log("plantStartYOffset:", plantStartYOffset);
    keyPressed({key: 'r'}); // Reset plant with new offset
  }
}
