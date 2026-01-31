// === SERIAL COMMUNICATION ===
let serialConnected = false;
let lastDataTime = 0;

// === DATA SMOOTHING ===
// Store recent values for averaging
const SMOOTHING_WINDOW = 10; // Number of readings to average
let soilMoistureHistory = [];
let oxygenHistory = [];
let heartRateHistory = [];

// Sensor data (smoothed values displayed)
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

// === ADJUSTMENT VARIABLES - MOVED EVERYTHING UP BY 150 PIXELS ===
let POT_ADJUSTMENTS = {
  x: 400,           // Horizontal position (center is 400)
  y: 480,           // CHANGED: 480 instead of 630 (moved up 150)
  width: 200,
  height: 160,
  scale: 0.1,
  plantStartY: -120
};

let GROUND_ADJUSTMENTS = {
  y: 250,           // CHANGED: 250 instead of 400 (moved up 150)
  height: 200,
  scale: 1.0
};

// Pot properties
let pot = {
  x: POT_ADJUSTMENTS.x,
  y: POT_ADJUSTMENTS.y,
  width: POT_ADJUSTMENTS.width,
  height: POT_ADJUSTMENTS.height,
  scale: POT_ADJUSTMENTS.scale,
  imageLoaded: false,
  plantStartY: POT_ADJUSTMENTS.plantStartY
};

// Ground properties
let ground = {
  y: GROUND_ADJUSTMENTS.y,
  height: GROUND_ADJUSTMENTS.height,
  scale: GROUND_ADJUSTMENTS.scale,
  imageLoaded: false
};

function preload() {
  // Load your plant images
  branchImage = loadImage('fuchsia_branch.png');
  leafImage = loadImage('fuchsia_leaf.png');
  flowerImage = loadImage('fuchsia_flower.png');
  potImage = loadImage('fuchsia_pot.png');
  groundImage = loadImage('ground.png');
  
  // Pot image callback
  potImage.loadPixels();
  console.log("All images loaded!");
}

function calculateRealPlantAge() {
  const now = new Date();
  const ageInMillis = now - PLANTING_DATE;
  const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);
  return ageInDays * 100;
}

// === SMOOTHING HELPER FUNCTION ===
function getSmoothedValue(history, newValue, windowSize) {
  // Add new value to history
  history.push(newValue);
  
  // Keep only the most recent values
  while (history.length > windowSize) {
    history.shift();
  }
  
  // Calculate average
  if (history.length === 0) return newValue;
  
  const sum = history.reduce((a, b) => a + b, 0);
  return Math.round(sum / history.length);
}

function setup() {
  // Create canvas that fills the window
  window.createCanvas(window.innerWidth, window.innerHeight);
  
  // Initialize plant age
  plantAge = calculateRealPlantAge();
  lastUpdateTime = new Date();
  
  // Apply pot adjustments
  pot.x = POT_ADJUSTMENTS.x;
  pot.y = POT_ADJUSTMENTS.y;
  pot.plantStartY = POT_ADJUSTMENTS.plantStartY;
  
  // Apply ground adjustments
  ground.y = GROUND_ADJUSTMENTS.y;
  ground.height = GROUND_ADJUSTMENTS.height;
  ground.scale = GROUND_ADJUSTMENTS.scale;
  
  // Update pot dimensions if image is loaded
  if (potImage.width > 0) {
    pot.scale = POT_ADJUSTMENTS.scale;
    pot.width = potImage.width * pot.scale;
    pot.height = potImage.height * pot.scale;
    pot.imageLoaded = true;
  }
  
  // Expose function to receive serial data from HTML
  window.handleSerialData = function(data) {
    processSerialData(data);
  };
  
  console.log("Fuchsia Plant Simulation Started!");
  console.log("Canvas size:", window.innerWidth, "x", window.innerHeight);
  console.log("Ready for Web Serial connection. Click 'Connect Arduino' button.");
  console.log("Press SPACEBAR to grow | CLICK to water | R to reset");
  
  // Start plant from adjusted position
  let baseX = pot.x;
  let baseY = pot.y + pot.plantStartY;
  plant.push(new StemSegment(baseX, baseY, baseX, baseY - 20, 0, -Math.PI/2, 7));
}

function processSerialData(data) {
  if (!data) return;
  
  data = data.trim();
  
  // Skip empty lines
  if (data.length === 0) return;
  
  // Try different parsing methods
  let parts;
  
  // Check what separator is used
  if (data.includes(',')) {
    parts = data.split(',');
  } else if (data.includes(';')) {
    parts = data.split(';');
  } else {
    parts = data.split(/\s+/);
  }
  
  if (parts.length >= 1) {
    // First value is soil moisture - apply smoothing
    let soilVal = parseFloat(parts[0]);
    if (!isNaN(soilVal)) {
      sensorData.soilMoisture = getSmoothedValue(soilMoistureHistory, soilVal, SMOOTHING_WINDOW);
    }
    
    // Second value is oxygen (if exists) - apply smoothing
    if (parts.length >= 2) {
      let oxygenVal = parseFloat(parts[1]);
      if (!isNaN(oxygenVal)) {
        sensorData.oxygen = getSmoothedValue(oxygenHistory, oxygenVal, SMOOTHING_WINDOW);
      }
    }
    
    // Third value is heart rate (if exists) - apply smoothing
    if (parts.length >= 3) {
      let heartVal = parseFloat(parts[2]);
      if (!isNaN(heartVal)) {
        sensorData.heartRate = getSmoothedValue(heartRateHistory, heartVal, SMOOTHING_WINDOW);
      }
    }
    
    serialConnected = true;
    lastDataTime = window.performance.now();
  }
}

function windowResized() {
  window.createCanvas(window.innerWidth, window.innerHeight);
}

function drawBackground() {
  // Always day sky - simple light blue gradient
  let topColor = window.color(135, 206, 235);
  let bottomColor = window.color(240, 248, 255);
  
  for (let y = 0; y < window.innerHeight; y++) {
    let inter = window.map(y, 0, window.innerHeight, 0, 1);
    let c = window.lerpColor(topColor, bottomColor, inter);
    window.stroke(c);
    window.line(0, y, window.innerWidth, y);
  }
  
  // Draw ground image or fallback
  drawGround();
  
  // Draw pot on top of ground
  drawPot();
}

function drawGround() {
  if (groundImage && groundImage.width > 0) {
    // Draw ground image with adjustments
    let groundY = ground.y;
    let groundHeight = ground.height;
    
    // Draw ground image to fill width
    window.image(groundImage, 0, groundY, window.innerWidth, groundHeight);
  } else {
    // Fallback: drawn ground
    window.fill(120, 90, 60);
    window.noStroke();
    window.rect(0, ground.y, window.innerWidth, ground.height);
    
    window.stroke(100, 70, 50, 80);
    window.strokeWeight(1);
    for (let x = 0; x < window.innerWidth; x += 20) {
      window.line(x, ground.y, x + 10, ground.y + 20);
    }
  }
}

function drawPot() {
  if (pot.imageLoaded && potImage.width > 0) {
    drawPotImage();
  } else {
    drawSimplePot();
  }
}

function drawPotImage() {
  window.push();
  window.imageMode(window.CENTER);
  // Draw pot at adjusted position
  let drawY = pot.y - pot.height/2;
  window.image(potImage, pot.x, drawY, pot.width, pot.height);
  window.pop();
}

function drawSimplePot() {
  let potTopY = pot.y - pot.height;
  
  window.fill(205, 133, 63);
  window.stroke(165, 103, 43);
  window.strokeWeight(2);
  window.rect(pot.x - pot.width/3, potTopY, pot.width * 0.67, pot.height);
  
  window.fill(185, 113, 53);
  window.noStroke();
  window.rect(pot.x - pot.width/3, potTopY - 5, pot.width * 0.67, 10, 3);
}

function draw() {
  drawBackground();
  
  time += 0.02;
  
  // Update plant age in real time
  const now = new Date();
  if (lastUpdateTime) {
    const timePassed = now - lastUpdateTime;
    const daysPassed = timePassed / (1000 * 60 * 60 * 24);
    plantAge += daysPassed * 100;
  }
  lastUpdateTime = now;
  
  // Auto growth - ALWAYS ACTIVE
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

function shouldGrow() {
  let moistureFactor = window.map(sensorData.soilMoisture, 200, 800, 0, 1);
  moistureFactor = window.constrain(moistureFactor, 0, 1);
  
  if (sensorData.soilMoisture < 250 || sensorData.soilMoisture > 750) {
    return false;
  }
  
  let growthChance = moistureFactor * 0.35;
  if (plantAge < 300) growthChance *= 0.6;
  growthChance += leaves.length * 0.002;
  
  return window.Math.random() < growthChance;
}

function getGrowthSpeed() {
  if (plantAge < 200) return 35;
  if (plant.length < 10) return 30;
  if (plant.length < 30) return 25;
  if (plant.length < 50) return 20;
  return 18;
}

function growPlant() {
  let growingSegments = plant.filter(segment => 
    segment.canGrow && window.Math.random() < segment.growthProbability
  );
  
  if (growingSegments.length === 0) return;
  
  let segment = window.Math.random(growingSegments);
  let growthType = window.Math.random();
  
  if (plant.length < 6) {
    if (growthType < 0.85) extendStem(segment);
    else createLeaf(segment);
  } else if (plant.length < 20) {
    if (growthType < 0.35) extendStem(segment);
    else if (growthType < 0.65) createBranch(segment);
    else createLeaf(segment);
  } else {
    if (growthType < 0.15) extendStem(segment);
    else if (growthType < 0.25) createBranch(segment);
    else if (growthType < 0.9) createLeaf(segment);
    else createFlower(segment);
  }
}

function extendStem(segment) {
  let angle = segment.angle + window.Math.random() * 0.8 - 0.4;
  let length = window.Math.random() * 20 + 25 * (1 - segment.generation * 0.08);
  let newX = segment.endX + window.Math.cos(angle) * length;
  let newY = segment.endY + window.Math.sin(angle) * length;
  let newThickness = segment.thickness * 0.96;
  let newSegment = new StemSegment(segment.endX, segment.endY, newX, newY, 
                                   segment.generation + 1, angle, newThickness);
  plant.push(newSegment);
}

function createBranch(segment) {
  let branchAngle = segment.angle + window.Math.random() * window.Math.PI - window.Math.PI / 2.2;
  let branchLength = window.Math.random() * 17 + 18 * (1 - segment.generation * 0.12);
  let newX = segment.endX + window.Math.cos(branchAngle) * branchLength;
  let newY = segment.endY + window.Math.sin(branchAngle) * branchLength;
  let branchThickness = segment.thickness * 0.75;
  let branch = new StemSegment(segment.endX, segment.endY, newX, newY, 
                               segment.generation + 1, branchAngle, branchThickness);
  branch.growthProbability = segment.growthProbability * 0.85;
  plant.push(branch);
}

function createLeaf(segment) {
  let leaf = {
    x: segment.endX,
    y: segment.endY,
    size: window.Math.random() * 0.4 + 0.8,
    angle: segment.angle + window.Math.random() * window.Math.PI - window.Math.PI / 3,
    age: 0,
    maxAge: window.Math.random() * 400 + 800,
    swayPhase: window.Math.random() * window.TWO_PI,
    swayAmount: window.Math.random() * 1 + 0.5,
    colorVariation: window.Math.random() * 0.4 + 0.8,
    isAttached: true
  };
  leaves.push(leaf);
}

function createFlower(segment) {
  let flower = {
    x: segment.endX,
    y: segment.endY,
    size: window.Math.random() * 0.6 + 0.7,
    angle: segment.angle + window.Math.random() * window.Math.PI - window.Math.PI / 4,
    age: 0,
    maxAge: window.Math.random() * 300 + 600,
    swayPhase: window.Math.random() * window.TWO_PI,
    swayAmount: window.Math.random() * 0.5 + 0.3,
    colorVariation: window.Math.random() * 0.2 + 0.9,
    bloomProgress: 0,
    isBlooming: false
  };
  flowers.push(flower);
}

function updatePlant() {
  for (let segment of plant) {
    segment.updateSway(time);
  }
  
  for (let i = leaves.length - 1; i >= 0; i--) {
    let leaf = leaves[i];
    leaf.age++;
    leaf.swayOffset = window.Math.sin(time * 2 + leaf.swayPhase) * leaf.swayAmount;
    
    if (leaf.age > leaf.maxAge) {
      leaf.isAttached = false;
      leaf.y += 0.5;
      leaf.angle += 0.01;
      
      if (leaf.y > window.innerHeight + 50) {
        leaves.splice(i, 1);
      }
    }
  }
  
  for (let i = flowers.length - 1; i >= 0; i--) {
    let flower = flowers[i];
    flower.age++;
    flower.swayOffset = window.Math.sin(time * 1.5 + flower.swayPhase) * flower.swayAmount;
    
    if (flower.age < 30) {
      flower.bloomProgress = flower.age / 30;
    } else {
      flower.bloomProgress = 1;
      flower.isBlooming = true;
    }
    
    if (flower.age > flower.maxAge) {
      flowers.splice(i, 1);
    }
  }
}

function drawPlant() {
  for (let segment of plant) {
    segment.draw();
  }
  
  for (let leaf of leaves) {
    drawRealLeaf(leaf);
  }
  
  for (let flower of flowers) {
    drawRealFlower(flower);
  }
}

function drawRealLeaf(leaf) {
  if (!leafImage) {
    drawFallbackLeaf(leaf);
    return;
  }
  
  window.push();
  window.translate(leaf.x, leaf.y + leaf.swayOffset);
  window.rotate(leaf.angle);
  
  let alpha = 255;
  if (!leaf.isAttached) {
    alpha = window.map(leaf.age, leaf.maxAge, leaf.maxAge + 100, 255, 0);
  }
  
  window.tint(255 * leaf.colorVariation, 255, 255, alpha);
  window.imageMode(window.CENTER);
  
  let leafSize = 35 * leaf.size;
  window.image(leafImage, 0, 0, leafSize, leafSize);
  
  window.pop();
}

function drawRealFlower(flower) {
  if (!flowerImage) {
    drawFallbackFlower(flower);
    return;
  }
  
  window.push();
  window.translate(flower.x, flower.y + flower.swayOffset);
  
  let scaleFactor = flower.bloomProgress;
  let alpha = 255;
  
  if (flower.age > flower.maxAge - 100) {
    alpha = window.map(flower.age, flower.maxAge - 100, flower.maxAge, 255, 0);
  }
  
  window.tint(255 * flower.colorVariation, 255, 255, alpha);
  window.rotate(flower.angle);
  window.imageMode(window.CENTER);
  
  let flowerSize = 30 * flower.size * scaleFactor;
  window.image(flowerImage, 0, 0, flowerSize, flowerSize);
  
  window.pop();
}

// Fallback functions
function drawFallbackLeaf(leaf) {
  window.push();
  window.translate(leaf.x, leaf.y + leaf.swayOffset);
  window.rotate(leaf.angle);
  
  let alpha = leaf.isAttached ? 200 : 100;
  window.fill(50, 150, 70, alpha);
  window.noStroke();
  
  window.beginShape();
  window.vertex(0, 0);
  for (let i = 0; i <= window.TWO_PI; i += 0.2) {
    let r = 12 * leaf.size * (0.5 + 0.5 * window.Math.sin(i * 2));
    let x = window.Math.cos(i) * r;
    let y = window.Math.sin(i) * r * 0.6;
    window.curveVertex(x, y);
  }
  window.endShape(window.CLOSE);
  
  window.pop();
}

function drawFallbackFlower(flower) {
  window.push();
  window.translate(flower.x, flower.y + flower.swayOffset);
  
  let alpha = 180;
  if (flower.age > flower.maxAge - 100) {
    alpha = window.map(flower.age, flower.maxAge - 100, flower.maxAge, 180, 0);
  }
  
  for (let i = 0; i < 5; i++) {
    window.push();
    window.rotate((window.TWO_PI / 5) * i + flower.angle);
    window.fill(255, 100, 150, alpha);
    window.noStroke();
    window.ellipse(0, -10 * flower.size, 12 * flower.size, 6 * flower.size);
    window.pop();
  }
  
  window.fill(255, 220, 0, alpha);
  window.ellipse(0, 0, 8 * flower.size, 8 * flower.size);
  
  window.pop();
}

function drawUI() {
  // UI background - slightly taller to fit all info
  window.fill(0, 0, 0, 150);
  window.noStroke();
  window.rect(5, 5, 220, 120, 5);
  
  // UI text
  window.fill(255);
  window.stroke(0);
  window.strokeWeight(1);
  window.textSize(12);
  
  // Planting date - at the top
  window.text("Planted: 11 Nov 2025", 15, 25);
  
  // Serial connection status
  let serialStatus;
  let serialColor;
  
  if (serialConnected) {
    if (window.performance.now() - lastDataTime < 5000) { // Data received in last 5 seconds
      serialStatus = "Arduino Connected";
      serialColor = window.color(100, 255, 100);
    } else {
      serialStatus = "No recent data";
      serialColor = window.color(255, 200, 50);
    }
  } else {
    serialStatus = "Click Connect Button";
    serialColor = window.color(255, 200, 50);
  }
  
  window.fill(serialColor);
  window.text(serialStatus, 15, 45);
  
  // Plant status
  let status = "Seed";
  if (plant.length > 3) {
    status = "Sprout";
  }
  if (plant.length > 10) {
    status = "Sapling";
  }
  if (leaves.length > 8) {
    status = "Growing";
  }
  if (flowers.length > 0) {
    status = "Flowering";
  }
  if (plant.length > 60) {
    status = "Mature";
  }
  
  window.fill(255);
  window.text("Status: " + status, 15, 65);
  
  // Age
  window.text("Age: " + window.nf(plantAge/100, 1, 1) + " days", 15, 85);
  
  // Plant statistics
  window.text("Leaves: " + leaves.length, 15, 105);
  window.text("Flowers: " + flowers.length, 15, 125);
  
  // Sensor data - on the right side
  let rightColumnX = 135;
  window.text("Soil: " + sensorData.soilMoisture, rightColumnX, 65);
  window.text("O2: " + sensorData.oxygen, rightColumnX, 85);
  
  // Plant needs indicator
  let needsMessage = "Happy";
  let needsColor = window.color(100, 255, 100);
  
  if (sensorData.soilMoisture < 300) {
    needsMessage = "Thirsty";
    needsColor = window.color(255, 100, 100);
  } else if (sensorData.soilMoisture > 700) {
    needsMessage = "Too wet";
    needsColor = window.color(255, 200, 50);
  }
  
  window.fill(needsColor);
  window.text(needsMessage, rightColumnX, 45);
  
  // Soil moisture bar
  window.noStroke();
  window.fill(100);
  window.rect(rightColumnX, 95, 80, 8);
  window.fill(50, 200, 50);
  let moistureWidth = window.map(sensorData.soilMoisture, 200, 800, 0, 80);
  moistureWidth = window.constrain(moistureWidth, 0, 80);
  window.rect(rightColumnX, 95, moistureWidth, 8);
  
  // Soil moisture label
  window.fill(255);
  window.textSize(10);
  window.text("Moisture", rightColumnX, 115);
}

class StemSegment {
  constructor(startX, startY, endX, endY, generation, angle, thickness) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.angle = angle;
    this.thickness = thickness;
    this.generation = generation;
    this.canGrow = true;
    
    this.growthProbability = window.map(generation, 0, 10, 0.9, 0.15);
    this.growthProbability = window.Math.max(this.growthProbability, 0.05);
    
    this.isRoot = false;
    
    this.baseStartX = startX;
    this.baseStartY = startY;
    this.baseEndX = endX;
    this.baseEndY = endY;
    
    this.color = this.calculateColor();
    this.textureOffset = window.Math.random() * 1000;
  }
  
  calculateColor() {
    if (this.isRoot) return window.color(101, 67, 33);
    
    let brown = window.color(120, 80, 60);
    let green = window.color(100, 130, 60);
    let blendAmount = window.constrain(this.generation / 12, 0, 1);
    
    return window.lerpColor(brown, green, blendAmount);
  }
  
  updateSway(time) {
    let swayIntensity = 1 - (this.generation * 0.08);
    swayIntensity = window.Math.max(swayIntensity, 0.3);
    
    let swayAmount = window.Math.sin(time * 0.8 + this.generation * 0.3 + this.textureOffset) * swayIntensity * 1.5;
    
    this.startX = this.baseStartX + swayAmount;
    this.endX = this.baseEndX + swayAmount * 1.2;
    
    let verticalSway = window.Math.cos(time * 0.6 + this.generation * 0.4) * swayIntensity * 0.5;
    this.startY = this.baseStartY + verticalSway;
    this.endY = this.baseEndY + verticalSway;
  }
  
  draw() {
    let dx = this.endX - this.startX;
    let dy = this.endY - this.startY;
    let segmentLength = window.Math.sqrt(dx * dx + dy * dy);
    
    if (segmentLength < 0.1) return;
    
    let segmentAngle = window.Math.atan2(dy, dx);
    
    if (branchImage && branchImage.width > 0) {
      window.push();
      window.translate(this.startX, this.startY);
      window.rotate(segmentAngle);
      
      let tintColor = this.color;
      window.tint(window.red(tintColor), window.green(tintColor), window.blue(tintColor), 220);
      
      window.imageMode(window.CORNER);
      
      let drawWidth = segmentLength;
      let drawHeight = this.thickness * 5.5;
      
      let heightVariation = 1 + window.noise(this.textureOffset + time * 0.5) * 0.2;
      drawHeight *= heightVariation;
      
      window.image(branchImage, 0, -drawHeight/2, drawWidth, drawHeight);
      
      window.pop();
    } else {
      window.stroke(this.color);
      window.strokeWeight(this.thickness);
      window.line(this.startX, this.startY, this.endX, this.endY);
      
      window.strokeWeight(window.Math.max(1, this.thickness * 0.3));
      window.stroke(window.red(this.color) - 20, window.green(this.color) - 10, window.blue(this.color) - 10, 150);
      let steps = 4;
      for (let i = 0; i <= steps; i++) {
        let t = i / steps;
        let x = window.lerp(this.startX, this.endX, t);
        let y = window.lerp(this.startY, this.endY, t);
        let offset = window.Math.sin(t * window.PI + time) * this.thickness * 0.3;
        window.line(x + offset, y, x - offset, y);
      }
    }
  }
}

function mousePressed() {
  let distance = window.Math.sqrt(window.Math.pow(window.mouseX - pot.x, 2) + window.Math.pow(window.mouseY - (pot.y - pot.height/2), 2));
  
  if (distance < pot.width/2) {
    sensorData.soilMoisture = window.Math.min(800, sensorData.soilMoisture + 100);
    console.log("Watered! Soil:", sensorData.soilMoisture);
  }
}

function keyPressed() {
  if (window.key === ' ') {
    growPlant();
    console.log("Manual growth.");
  }
  
  if (window.key === 'r' || window.key === 'R') {
    plant = [];
    leaves = [];
    flowers = [];
    growthCounter = 0;
    
    // Clear smoothing history on reset
    soilMoistureHistory = [];
    oxygenHistory = [];
    heartRateHistory = [];
    
    plantAge = calculateRealPlantAge();
    lastUpdateTime = new Date();
    
    // Reset with adjusted position
    let baseX = pot.x;
    let baseY = pot.y + pot.plantStartY;
    plant.push(new StemSegment(baseX, baseY, baseX, baseY - 20, 0, -window.PI/2, 7));
    
    sensorData.soilMoisture = 650;
    
    console.log("Plant reset!");
  }
  
  if (window.key === 'a' || window.key === 'A') {
    autoGrowth = !autoGrowth;
    console.log("Auto growth:", autoGrowth ? "ON" : "OFF");
  }
}

// Declare variables used in the code
window.loadImage = function() {};
window.createCanvas = function() {};
window.innerWidth = 800;
window.innerHeight = 600;
window.color = function() {};
window.map = function() {};
window.lerpColor = function() {};
window.stroke = function() {};
window.line = function() {};
window.fill = function() {};
window.noStroke = function() {};
window.rect = function() {};
window.strokeWeight = function() {};
window.image = function() {};
window.imageMode = function() {};
window.CENTER = {};
window.CORNER = {};
window.TWO_PI = 2 * window.Math.PI;
window.Math.random = function() { return 0.5; };
window.Math.max = function() { return Math.max.apply(null, arguments); };
window.Math.sqrt = function() { return Math.sqrt.apply(null, arguments); };
window.Math.atan2 = function() { return Math.atan2.apply(null, arguments); };
window.Math.sin = function() { return Math.sin.apply(null, arguments); };
window.Math.cos = function() { return Math.cos.apply(null, arguments); };
window.noise = function() { return 0.5; };
window.lerp = function() { return (1 - arguments[2]) * arguments[0] + arguments[2] * arguments[1]; };
window.mouseX = 400;
window.mouseY = 300;
window.key = ' ';
