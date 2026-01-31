// Sensor data
let sensorData = {
  soilMoisture: 600,  // Start with optimal value
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

// === ADJUSTMENT VARIABLES ===
let POT_ADJUSTMENTS = {
  x: 400,           // Horizontal position (center is 400)
  y: 630,           // Vertical position (higher number = lower on screen)
  width: 200,       // Pot width
  height: 160,      // Pot height
  scale: 0.1,       // Scale factor (1.0 = original size)
  plantStartY: -120  // How far above pot the plant starts (negative = above pot)
};

let GROUND_ADJUSTMENTS = {
  y: 400,           // Vertical position (where ground starts from top)
  height: 200,      // Height of ground image
  scale: 1.0        // Scale factor for ground image
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

function setup() {
  createCanvas(800, 600);
  
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
  
  console.log("Fuchsia Plant Simulation Started!");
  console.log("Press SPACEBAR to grow | CLICK to water | R to reset");
  
  // Start plant from adjusted position
  let baseX = pot.x;
  let baseY = pot.y + pot.plantStartY;
  plant.push(new StemSegment(baseX, baseY, baseX, baseY - 20, 0, -PI/2, 7));
}

function drawBackground() {
  // Always day sky - simple light blue gradient
  let topColor = color(135, 206, 235);  // Light blue
  let bottomColor = color(240, 248, 255);  // Very light blue
  
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(topColor, bottomColor, inter);
    stroke(c);
    line(0, y, width, y);
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
    image(groundImage, 0, groundY, width, groundHeight);
  } else {
    // Fallback: drawn ground
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
    drawPotImage();
  } else {
    drawSimplePot();
  }
}

function drawPotImage() {
  push();
  imageMode(CENTER);
  // Draw pot at adjusted position
  let drawY = pot.y - pot.height/2;
  image(potImage, pot.x, drawY, pot.width, pot.height);
  pop();
}

function drawSimplePot() {
  let potTopY = pot.y - pot.height;
  
  fill(205, 133, 63);
  stroke(165, 103, 43);
  strokeWeight(2);
  rect(pot.x - pot.width/3, potTopY, pot.width * 0.67, pot.height);
  
  fill(185, 113, 53);
  noStroke();
  rect(pot.x - pot.width/3, potTopY - 5, pot.width * 0.67, 10, 3);
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
  let moistureFactor = map(sensorData.soilMoisture, 200, 800, 0, 1);
  moistureFactor = constrain(moistureFactor, 0, 1);
  
  if (sensorData.soilMoisture < 250 || sensorData.soilMoisture > 750) {
    return false;
  }
  
  let growthChance = moistureFactor * 0.35;
  if (plantAge < 300) growthChance *= 0.6;
  growthChance += leaves.length * 0.002;
  
  return random() < growthChance;
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
    segment.canGrow && random() < segment.growthProbability
  );
  
  if (growingSegments.length === 0) return;
  
  let segment = random(growingSegments);
  let growthType = random();
  
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
  let angle = segment.angle + random(-0.4, 0.4);
  let length = random(25, 45) * (1 - segment.generation * 0.08);
  let newX = segment.endX + cos(angle) * length;
  let newY = segment.endY + sin(angle) * length;
  let newThickness = segment.thickness * 0.96;
  let newSegment = new StemSegment(segment.endX, segment.endY, newX, newY, 
                                   segment.generation + 1, angle, newThickness);
  plant.push(newSegment);
}

function createBranch(segment) {
  let branchAngle = segment.angle + random(-PI/2.2, PI/2.2);
  let branchLength = random(18, 35) * (1 - segment.generation * 0.12);
  let newX = segment.endX + cos(branchAngle) * branchLength;
  let newY = segment.endY + sin(branchAngle) * branchLength;
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
    size: random(0.8, 1.2),
    angle: segment.angle + random(-PI/3, PI/3),
    age: 0,
    maxAge: random(800, 1200),
    swayPhase: random(TWO_PI),
    swayAmount: random(0.5, 1.5),
    colorVariation: random(0.8, 1.2),
    isAttached: true
  };
  leaves.push(leaf);
}

function createFlower(segment) {
  let flower = {
    x: segment.endX,
    y: segment.endY,
    size: random(0.7, 1.3),
    angle: segment.angle + random(-PI/4, PI/4),
    age: 0,
    maxAge: random(600, 900),
    swayPhase: random(TWO_PI),
    swayAmount: random(0.3, 0.8),
    colorVariation: random(0.9, 1.1),
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
    leaf.swayOffset = sin(time * 2 + leaf.swayPhase) * leaf.swayAmount;
    
    if (leaf.age > leaf.maxAge) {
      leaf.isAttached = false;
      leaf.y += 0.5;
      leaf.angle += 0.01;
      
      if (leaf.y > height + 50) {
        leaves.splice(i, 1);
      }
    }
  }
  
  for (let i = flowers.length - 1; i >= 0; i--) {
    let flower = flowers[i];
    flower.age++;
    flower.swayOffset = sin(time * 1.5 + flower.swayPhase) * flower.swayAmount;
    
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
  
  push();
  translate(leaf.x, leaf.y + leaf.swayOffset);
  rotate(leaf.angle);
  
  let alpha = 255;
  if (!leaf.isAttached) {
    alpha = map(leaf.age, leaf.maxAge, leaf.maxAge + 100, 255, 0);
  }
  
  tint(255 * leaf.colorVariation, 255, 255, alpha);
  imageMode(CENTER);
  
  let leafSize = 35 * leaf.size;
  image(leafImage, 0, 0, leafSize, leafSize);
  
  pop();
}

function drawRealFlower(flower) {
  if (!flowerImage) {
    drawFallbackFlower(flower);
    return;
  }
  
  push();
  translate(flower.x, flower.y + flower.swayOffset);
  
  let scaleFactor = flower.bloomProgress;
  let alpha = 255;
  
  if (flower.age > flower.maxAge - 100) {
    alpha = map(flower.age, flower.maxAge - 100, flower.maxAge, 255, 0);
  }
  
  tint(255 * flower.colorVariation, 255, 255, alpha);
  rotate(flower.angle);
  imageMode(CENTER);
  
  let flowerSize = 30 * flower.size * scaleFactor;
  image(flowerImage, 0, 0, flowerSize, flowerSize);
  
  pop();
}

// Fallback functions
function drawFallbackLeaf(leaf) {
  push();
  translate(leaf.x, leaf.y + leaf.swayOffset);
  rotate(leaf.angle);
  
  let alpha = leaf.isAttached ? 200 : 100;
  fill(50, 150, 70, alpha);
  noStroke();
  
  beginShape();
  vertex(0, 0);
  for (let i = 0; i <= TWO_PI; i += 0.2) {
    let r = 12 * leaf.size * (0.5 + 0.5 * sin(i * 2));
    let x = cos(i) * r;
    let y = sin(i) * r * 0.6;
    curveVertex(x, y);
  }
  endShape(CLOSE);
  
  pop();
}

function drawFallbackFlower(flower) {
  push();
  translate(flower.x, flower.y + flower.swayOffset);
  
  let alpha = 180;
  if (flower.age > flower.maxAge - 100) {
    alpha = map(flower.age, flower.maxAge - 100, flower.maxAge, 180, 0);
  }
  
  for (let i = 0; i < 5; i++) {
    push();
    rotate((TWO_PI / 5) * i + flower.angle);
    fill(255, 100, 150, alpha);
    noStroke();
    ellipse(0, -10 * flower.size, 12 * flower.size, 6 * flower.size);
    pop();
  }
  
  fill(255, 220, 0, alpha);
  ellipse(0, 0, 8 * flower.size, 8 * flower.size);
  
  pop();
}

function drawUI() {
  // UI background - slightly taller to fit all info
  fill(0, 0, 0, 150);
  noStroke();
  rect(5, 5, 220, 120, 5);  // Made wider: 220px instead of 210px
  
  // UI text
  fill(255);
  stroke(0);
  strokeWeight(1);
  textSize(12);
  
  // Planting date - at the top
  text("Planted: 11 Nov 2025", 15, 25);
  
  // Plant status - moved down
  let status = "Seed";
  let statusEmoji = "🌱";
  if (plant.length > 3) {
    status = "Sprout";
    statusEmoji = "🌱";
  }
  if (plant.length > 10) {
    status = "Sapling";
    statusEmoji = "🪴";
  }
  if (leaves.length > 8) {
    status = "Growing";
    statusEmoji = "🌿";
  }
  if (flowers.length > 0) {
    status = "Flowering";
    statusEmoji = "🌸";
  }
  if (plant.length > 60) {
    status = "Mature";
    statusEmoji = "🌳";
  }
  
  text(statusEmoji + " " + status, 15, 45);
  
  // Age
  text("Age: " + nf(plantAge/100, 1, 1) + " days", 15, 65);
  
  // Plant statistics
  text("Leaves: " + leaves.length, 15, 85);
  text("Flowers: " + flowers.length, 15, 105);
  
  // Sensor data - on the right side, MOVED RIGHT
  let rightColumnX = 135;  // Increased from 120 to 135
  text("Soil: " + sensorData.soilMoisture, rightColumnX, 45);
  text("O₂: " + sensorData.oxygen, rightColumnX, 65);
  
  // Plant needs indicator - simplified
  let needsMessage = "✓ Happy";
  let needsColor = color(100, 255, 100);
  
  if (sensorData.soilMoisture < 300) {
    needsMessage = "💧 Thirsty";
    needsColor = color(255, 100, 100);
  } else if (sensorData.soilMoisture > 700) {
    needsMessage = "⚠️ Too wet";
    needsColor = color(255, 200, 50);
  }
  
  fill(needsColor);
  text(needsMessage, rightColumnX, 25);
  
  // Soil moisture bar - smaller, below sensor data
  noStroke();
  fill(100);
  rect(rightColumnX, 80, 80, 8);
  fill(50, 200, 50);
  let moistureWidth = map(sensorData.soilMoisture, 200, 800, 0, 80);
  moistureWidth = constrain(moistureWidth, 0, 80);
  rect(rightColumnX, 80, moistureWidth, 8);
  
  // Soil moisture label
  fill(255);
  textSize(10);
  text("Moisture", rightColumnX, 100);
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
    
    this.growthProbability = map(generation, 0, 10, 0.9, 0.15);
    this.growthProbability = max(this.growthProbability, 0.05);
    
    this.isRoot = false;
    
    this.baseStartX = startX;
    this.baseStartY = startY;
    this.baseEndX = endX;
    this.baseEndY = endY;
    
    this.color = this.calculateColor();
    this.textureOffset = random(1000);
  }
  
  calculateColor() {
    if (this.isRoot) return color(101, 67, 33);
    
    let brown = color(120, 80, 60);
    let green = color(100, 130, 60);
    let blendAmount = constrain(this.generation / 12, 0, 1);
    
    return lerpColor(brown, green, blendAmount);
  }
  
  updateSway(time) {
    let swayIntensity = 1 - (this.generation * 0.08);
    swayIntensity = max(swayIntensity, 0.3);
    
    let swayAmount = sin(time * 0.8 + this.generation * 0.3 + this.textureOffset) * swayIntensity * 1.5;
    
    this.startX = this.baseStartX + swayAmount;
    this.endX = this.baseEndX + swayAmount * 1.2;
    
    let verticalSway = cos(time * 0.6 + this.generation * 0.4) * swayIntensity * 0.5;
    this.startY = this.baseStartY + verticalSway;
    this.endY = this.baseEndY + verticalSway;
  }
  
  draw() {
    let dx = this.endX - this.startX;
    let dy = this.endY - this.startY;
    let segmentLength = sqrt(dx * dx + dy * dy);
    
    if (segmentLength < 0.1) return;
    
    let segmentAngle = atan2(dy, dx);
    
    if (branchImage && branchImage.width > 0) {
      push();
      translate(this.startX, this.startY);
      rotate(segmentAngle);
      
      let tintColor = this.color;
      tint(red(tintColor), green(tintColor), blue(tintColor), 220);
      
      imageMode(CORNER);
      
      let drawWidth = segmentLength;
      let drawHeight = this.thickness * 5.5;
      
      let heightVariation = 1 + noise(this.textureOffset + time * 0.5) * 0.2;
      drawHeight *= heightVariation;
      
      image(branchImage, 0, -drawHeight/2, drawWidth, drawHeight);
      
      pop();
    } else {
      stroke(this.color);
      strokeWeight(this.thickness);
      line(this.startX, this.startY, this.endX, this.endY);
      
      strokeWeight(max(1, this.thickness * 0.3));
      stroke(red(this.color) - 20, green(this.color) - 10, blue(this.color) - 10, 150);
      let steps = 4;
      for (let i = 0; i <= steps; i++) {
        let t = i / steps;
        let x = lerp(this.startX, this.endX, t);
        let y = lerp(this.startY, this.endY, t);
        let offset = sin(t * PI + time) * this.thickness * 0.3;
        line(x + offset, y, x - offset, y);
      }
    }
  }
}

function mousePressed() {
  let distance = dist(mouseX, mouseY, pot.x, pot.y - pot.height/2);
  
  if (distance < pot.width/2) {
    sensorData.soilMoisture = min(800, sensorData.soilMoisture + 100);
    console.log("Watered! Soil:", sensorData.soilMoisture);
  }
}

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
    
    // Reset with adjusted position
    let baseX = pot.x;
    let baseY = pot.y + pot.plantStartY;
    plant.push(new StemSegment(baseX, baseY, baseX, baseY - 20, 0, -PI/2, 7));
    
    sensorData.soilMoisture = 650;
    
    console.log("Plant reset!");
  }
  
  if (key === 'a' || key === 'A') {
    autoGrowth = !autoGrowth;
    console.log("Auto growth:", autoGrowth ? "ON" : "OFF");
  }
  
  // Pot adjustment keys (still work but not shown in UI)
  if (key === '+' || key === '=') {
    POT_ADJUSTMENTS.scale = min(1.5, POT_ADJUSTMENTS.scale + 0.1);
    updatePotFromAdjustments();
    console.log("Pot scale:", POT_ADJUSTMENTS.scale);
    return false;
  }
  
  if (key === '-' || key === '_') {
    POT_ADJUSTMENTS.scale = max(0.4, POT_ADJUSTMENTS.scale - 0.1);
    updatePotFromAdjustments();
    console.log("Pot scale:", POT_ADJUSTMENTS.scale);
    return false;
  }
  
  if (key === 'w' || key === 'W') {
    POT_ADJUSTMENTS.y -= 5;
    updatePotFromAdjustments();
    console.log("Pot moved up to y=" + POT_ADJUSTMENTS.y);
    return false;
  }
  
  if (key === 's' || key === 'S') {
    POT_ADJUSTMENTS.y += 5;
    updatePotFromAdjustments();
    console.log("Pot moved down to y=" + POT_ADJUSTMENTS.y);
    return false;
  }
  
  if (key === 'q' || key === 'Q') {
    POT_ADJUSTMENTS.plantStartY -= 5;
    updatePotFromAdjustments();
    console.log("Plant start moved up to", POT_ADJUSTMENTS.plantStartY);
    return false;
  }
  
  if (key === 'e' || key === 'E') {
    POT_ADJUSTMENTS.plantStartY += 5;
    updatePotFromAdjustments();
    console.log("Plant start moved down to", POT_ADJUSTMENTS.plantStartY);
    return false;
  }
  
  // Ground adjustment keys (still work but not shown in UI)
  if (key === 'i' || key === 'I') {
    GROUND_ADJUSTMENTS.y -= 5;
    updateGroundFromAdjustments();
    console.log("Ground moved up to y=" + GROUND_ADJUSTMENTS.y);
    return false;
  }
  
  if (key === 'k' || key === 'K') {
    GROUND_ADJUSTMENTS.y += 5;
    updateGroundFromAdjustments();
    console.log("Ground moved down to y=" + GROUND_ADJUSTMENTS.y);
    return false;
  }
  
  if (key === 'j' || key === 'J') {
    GROUND_ADJUSTMENTS.height -= 5;
    GROUND_ADJUSTMENTS.height = max(20, GROUND_ADJUSTMENTS.height);
    updateGroundFromAdjustments();
    console.log("Ground height decreased to", GROUND_ADJUSTMENTS.height);
    return false;
  }
  
  if (key === 'l' || key === 'L') {
    GROUND_ADJUSTMENTS.height += 5;
    GROUND_ADJUSTMENTS.height = min(300, GROUND_ADJUSTMENTS.height);
    updateGroundFromAdjustments();
    console.log("Ground height increased to", GROUND_ADJUSTMENTS.height);
    return false;
  }
}

function updatePotFromAdjustments() {
  pot.x = POT_ADJUSTMENTS.x;
  pot.y = POT_ADJUSTMENTS.y;
  pot.scale = POT_ADJUSTMENTS.scale;
  pot.plantStartY = POT_ADJUSTMENTS.plantStartY;
  
  if (potImage && potImage.width > 0) {
    pot.width = potImage.width * pot.scale;
    pot.height = potImage.height * pot.scale;
  } else {
    pot.width = 200 * pot.scale;
    pot.height = 160 * pot.scale;
  }
}

function updateGroundFromAdjustments() {
  ground.y = GROUND_ADJUSTMENTS.y;
  ground.height = GROUND_ADJUSTMENTS.height;
  ground.scale = GROUND_ADJUSTMENTS.scale;
}
