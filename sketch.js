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
let plantAge = 0;  // This will be initialized in setup()
let autoGrowth = true;

// === ADDED: Real plant's planting date ===
const PLANTING_DATE = new Date('2025-11-11');  // When you planted the real plant
let lastUpdateTime = null;  // Track when we last updated plantAge

// Netherlands time system
let plantTime = {
  lastRealDate: null,
  growthActive: true,
  currentHour: 0
};

// Plant images - ADD YOUR IMAGES HERE
let branchImage;
let leafImage;
let flowerImage;

// === MOVED STEM SEGMENT CLASS TO TOP ===
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
    
    // Growth probability decreases with generation
    this.growthProbability = map(generation, 0, 10, 0.9, 0.15);
    this.growthProbability = max(this.growthProbability, 0.05);
    
    this.isRoot = false;
    
    // Store base positions for sway animation
    this.baseStartX = startX;
    this.baseStartY = startY;
    this.baseEndX = endX;
    this.baseEndY = endY;
    
    // Calculate color based on generation (brown to green)
    this.color = this.calculateColor();
    
    // Random variation for more natural look
    this.textureOffset = random(1000);
  }
  
  calculateColor() {
    if (this.isRoot) return color(101, 67, 33);
    
    // Blend from brown to green as plant ages
    let brown = color(120, 80, 60);
    let green = color(100, 130, 60);
    let blendAmount = constrain(this.generation / 12, 0, 1);
    
    return lerpColor(brown, green, blendAmount);
  }
  
  updateSway(time) {
    // Gentle sway animation - more sway at tips
    let swayIntensity = 1 - (this.generation * 0.08);
    swayIntensity = max(swayIntensity, 0.3);
    
    let swayAmount = sin(time * 0.8 + this.generation * 0.3 + this.textureOffset) * swayIntensity * 1.5;
    
    this.startX = this.baseStartX + swayAmount;
    this.endX = this.baseEndX + swayAmount * 1.2;
    
    // Slight vertical sway too
    let verticalSway = cos(time * 0.6 + this.generation * 0.4) * swayIntensity * 0.5;
    this.startY = this.baseStartY + verticalSway;
    this.endY = this.baseEndY + verticalSway;
  }
  
  draw() {
    // Calculate the vector of this segment
    let dx = this.endX - this.startX;
    let dy = this.endY - this.startY;
    let segmentLength = sqrt(dx * dx + dy * dy);
    
    if (segmentLength < 0.1) return;
    
    let segmentAngle = atan2(dy, dx);
    
    // Draw branch image if available
    if (branchImage && branchImage.width > 0) {
      push();
      
      // Move to start point and rotate to match segment angle
      translate(this.startX, this.startY);
      rotate(segmentAngle);
      
      // Apply color tint based on generation
      let tintColor = this.color;
      tint(red(tintColor), green(tintColor), blue(tintColor), 220);
      
      // Set image mode to CORNER
      imageMode(CORNER);
      
      // Calculate image dimensions
      let drawWidth = segmentLength;
      let drawHeight = this.thickness * 5.5; // Adjust for your branch image
      
      // Add slight width variation for texture
      let heightVariation = 1 + noise(this.textureOffset + time * 0.5) * 0.2;
      drawHeight *= heightVariation;
      
      // Draw the branch image
      image(branchImage, 0, -drawHeight/2, drawWidth, drawHeight);
      
      pop();
    } else {
      // Fallback: Draw simple colored line
      stroke(this.color);
      strokeWeight(this.thickness);
      line(this.startX, this.startY, this.endX, this.endY);
      
      // Add some texture to the line
      strokeWeight(max(1, this.thickness * 0.3));
      stroke(red(this.color) - 20, green(this.color) - 10, blue(this.color) - 10, 150);
      let steps = 4;
      for (let i = 0; i <= steps; i++) {
        let t = i / steps;
        let x = lerp(this.startX, this.endY, t);
        let y = lerp(this.startY, this.endY, t);
        let offset = sin(t * PI + time) * this.thickness * 0.3;
        line(x + offset, y, x - offset, y);
      }
    }
  }
}

function preload() {
  // Load your plant images - UPDATE THESE FILENAMES!
  branchImage = loadImage('fuchsia_branch.png');
  leafImage = loadImage('fuchsia_leaf.png');      // Change to your leaf image filename
  flowerImage = loadImage('fuchsia_flower.png');  // Change to your flower image filename
}

// === ADDED: Function to calculate real plant age ===
function calculateRealPlantAge() {
  const now = new Date();
  const ageInMillis = now - PLANTING_DATE;
  
  // Convert milliseconds to days (1000ms * 60s * 60min * 24hr)
  const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);
  
  // Scale to match your existing plantAge units (100 = 1 day in your code)
  // In your original code, plantAge 100 = 1 day
  return ageInDays * 100;
}

function setup() {
  createCanvas(800, 600);
  
  // === CHANGED: Initialize plantAge to real plant's current age ===
  plantAge = calculateRealPlantAge();
  lastUpdateTime = new Date();  // Store when we calculated this
  
  console.log("Fuchsia Plant Simulation Started!");
  console.log("Plant planted on: November 11, 2025");
  console.log("Initial plant age set to: " + nf(plantAge/100, 1, 1) + " days");
  console.log("Press SPACEBAR to manually grow");
  console.log("Click to water the plant");
  console.log("Press 'R' to reset");
  
  // Start with a seed (first stem segment)
  let baseX = width/2;
  let baseY = height - 50;
  plant.push(new StemSegment(baseX, baseY, baseX, baseY - 30, 0, -PI/2, 8));
}

function updatePlantTime() {
  let now = new Date();
  plantTime.currentHour = now.getHours();
  plantTime.growthActive = (plantTime.currentHour >= 7 && plantTime.currentHour < 19);
}

function drawSkyGradient() {
  // Day/night sky based on Netherlands time
  let dayColor, nightColor;
  
  if (plantTime.growthActive) {
    dayColor = color(135, 206, 235); // Day blue
    nightColor = color(240, 248, 255);
  } else {
    dayColor = color(25, 25, 112);   // Night blue
    nightColor = color(0, 0, 0);
  }
  
  // Draw gradient sky
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(dayColor, nightColor, inter);
    stroke(c);
    line(0, y, width, y);
  }
  
  // Ground
  fill(101, 67, 33);
  noStroke();
  rect(0, height - 50, width, 50);
  
  // Grass
  stroke(76, 153, 0, 100);
  strokeWeight(1);
  for (let x = 0; x < width; x += 3) {
    let heightVariation = random(3, 8);
    line(x, height - 50, x + random(-2, 2), height - 50 - heightVariation);
  }
}

function draw() {
  updatePlantTime();
  drawSkyGradient();
  
  time += 0.02;
  
  // === CHANGED: Update plantAge based on real time ===
  const now = new Date();
  if (lastUpdateTime) {
    const timePassed = now - lastUpdateTime;
    const daysPassed = timePassed / (1000 * 60 * 60 * 24);
    plantAge += daysPassed * 100;  // Convert to your plantAge units
  }
  lastUpdateTime = now;
  
  // Grow the plant automatically during daytime
  if (autoGrowth && plantTime.growthActive) {
    growthCounter++;
    
    // Growth speed depends on plant age
    let growthSpeed = getGrowthSpeed();
    if (growthCounter > growthSpeed && plant.length < 150) {
      if (shouldGrow()) {
        growPlant();
      }
      growthCounter = 0;
    }
  }
  
  // Update and draw all plant components
  updatePlant();
  drawPlant();
  drawUI();
  
  // Debug info (remove in final version)
  if (frameCount % 60 === 0) {
    console.log("Plant age:", nf(plantAge/100, 1, 1), "days | Segments:", plant.length, "Leaves:", leaves.length, "Flowers:", flowers.length);
  }
}

function shouldGrow() {
  // Soil moisture affects growth
  let moistureFactor = map(sensorData.soilMoisture, 200, 800, 0, 1);
  moistureFactor = constrain(moistureFactor, 0, 1);
  
  // Don't grow if conditions are extreme
  if (sensorData.soilMoisture < 250 || sensorData.soilMoisture > 750) {
    return false;
  }
  
  // Base growth chance
  let growthChance = moistureFactor * 0.35;
  
  // Younger plants grow slower
  if (plantAge < 300) growthChance *= 0.6;
  
  // More leaves = more energy for growth
  growthChance += leaves.length * 0.002;
  
  return random() < growthChance;
}

function getGrowthSpeed() {
  if (plantAge < 200) return 35;  // Slow at first
  if (plant.length < 10) return 30;
  if (plant.length < 30) return 25;
  if (plant.length < 50) return 20;
  return 18;  // Fastest when mature
}

function growPlant() {
  // Find segments that can grow
  let growingSegments = plant.filter(segment => 
    segment.canGrow && random() < segment.growthProbability
  );
  
  if (growingSegments.length === 0) return;
  
  // Pick a random growing segment
  let segment = random(growingSegments);
  let growthType = random();
  
  // Growth logic based on plant development
  if (plant.length < 8) {
    // Early growth: focus on establishing stem
    if (growthType < 0.85) extendStem(segment);
    else createLeaf(segment);
  } else if (plant.length < 20) {
    // Mid growth: branches and leaves
    if (growthType < 0.35) extendStem(segment);
    else if (growthType < 0.65) createBranch(segment);
    else createLeaf(segment);
  } else {
    // Mature growth: mostly leaves and flowers
    if (growthType < 0.2) extendStem(segment);
    else if (growthType < 0.4) createBranch(segment);
    else if (growthType < 0.7) createLeaf(segment);
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
    size: random(0.8, 1.2),  // Scale factor for image
    angle: segment.angle + random(-PI/3, PI/3),
    age: 0,
    maxAge: random(800, 1200),  // Leaves last longer now
    swayPhase: random(TWO_PI),
    swayAmount: random(0.5, 1.5),
    colorVariation: random(0.8, 1.2),  // Slight color variation
    isAttached: true
  };
  leaves.push(leaf);
}

function createFlower(segment) {
  let flower = {
    x: segment.endX,
    y: segment.endY,
    size: random(0.7, 1.3),  // Scale factor for image
    angle: segment.angle + random(-PI/4, PI/4),
    age: 0,
    maxAge: random(600, 900),  // Flowers have limited lifespan
    swayPhase: random(TWO_PI),
    swayAmount: random(0.3, 0.8),
    colorVariation: random(0.9, 1.1),
    bloomProgress: 0,  // For blooming animation
    isBlooming: false
  };
  flowers.push(flower);
}

function updatePlant() {
  // Update sway for all segments
  for (let segment of plant) {
    segment.updateSway(time);
  }
  
  // Update leaves
  for (let i = leaves.length - 1; i >= 0; i--) {
    let leaf = leaves[i];
    leaf.age++;
    
    // Gentle sway animation
    leaf.swayOffset = sin(time * 2 + leaf.swayPhase) * leaf.swayAmount;
    
    // Leaves age and eventually fall off
    if (leaf.age > leaf.maxAge) {
      // Start falling animation
      leaf.isAttached = false;
      leaf.y += 0.5;  // Fall slowly
      leaf.angle += 0.01;  // Rotate as falling
      
      // Remove when off screen
      if (leaf.y > height + 50) {
        leaves.splice(i, 1);
      }
    }
  }
  
  // Update flowers
  for (let i = flowers.length - 1; i >= 0; i--) {
    let flower = flowers[i];
    flower.age++;
    
    // Gentle sway
    flower.swayOffset = sin(time * 1.5 + flower.swayPhase) * flower.swayAmount;
    
    // Blooming animation
    if (flower.age < 30) {
      flower.bloomProgress = flower.age / 30;
    } else {
      flower.bloomProgress = 1;
      flower.isBlooming = true;
    }
    
    // Flowers eventually fade
    if (flower.age > flower.maxAge) {
      flowers.splice(i, 1);
    }
  }
}

function drawPlant() {
  // Draw all stems/branches first (they're behind leaves/flowers)
  for (let segment of plant) {
    segment.draw();
  }
  
  // Draw leaves
  for (let leaf of leaves) {
    drawRealLeaf(leaf);
  }
  
  // Draw flowers
  for (let flower of flowers) {
    drawRealFlower(flower);
  }
}

function drawRealLeaf(leaf) {
  if (!leafImage) {
    // Fallback: draw simple leaf if image not loaded
    drawFallbackLeaf(leaf);
    return;
  }
  
  push();
  
  // Position and rotation
  translate(leaf.x, leaf.y + leaf.swayOffset);
  rotate(leaf.angle);
  
  // Apply slight color variation
  let alpha = 255;
  if (!leaf.isAttached) {
    alpha = map(leaf.age, leaf.maxAge, leaf.maxAge + 100, 255, 0);
  }
  
  tint(255 * leaf.colorVariation, 255, 255, alpha);
  
  // Set image mode to center
  imageMode(CENTER);
  
  // Calculate size
  let leafSize = 40 * leaf.size;  // Base size times variation
  
  // Draw the leaf image
  // The image is drawn centered at (0,0)
  image(leafImage, 0, 0, leafSize, leafSize);
  
  pop();
}

function drawRealFlower(flower) {
  if (!flowerImage) {
    // Fallback: draw simple flower if image not loaded
    drawFallbackFlower(flower);
    return;
  }
  
  push();
  
  // Position with sway
  translate(flower.x, flower.y + flower.swayOffset);
  
  // Apply bloom animation
  let scaleFactor = flower.bloomProgress;
  let alpha = 255;
  
  // Fade out when old
  if (flower.age > flower.maxAge - 100) {
    alpha = map(flower.age, flower.maxAge - 100, flower.maxAge, 255, 0);
  }
  
  // Apply color variation and fade
  tint(255 * flower.colorVariation, 255, 255, alpha);
  
  // Rotate slightly for natural variation
  rotate(flower.angle);
  
  // Set image mode to center
  imageMode(CENTER);
  
  // Calculate size with bloom animation
  let flowerSize = 35 * flower.size * scaleFactor;
  
  // Draw the flower image
  image(flowerImage, 0, 0, flowerSize, flowerSize);
  
  pop();
}

// Fallback functions in case images don't load
function drawFallbackLeaf(leaf) {
  push();
  translate(leaf.x, leaf.y + leaf.swayOffset);
  rotate(leaf.angle);
  
  let alpha = leaf.isAttached ? 200 : 100;
  fill(50, 150, 70, alpha);
  noStroke();
  
  // Simple leaf shape
  beginShape();
  vertex(0, 0);
  for (let i = 0; i <= TWO_PI; i += 0.2) {
    let r = 15 * leaf.size * (0.5 + 0.5 * sin(i * 2));
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
  
  // Simple flower with petals
  for (let i = 0; i < 5; i++) {
    push();
    rotate((TWO_PI / 5) * i + flower.angle);
    fill(255, 100, 150, alpha);
    noStroke();
    ellipse(0, -12 * flower.size, 15 * flower.size, 8 * flower.size);
    pop();
  }
  
  // Center
  fill(255, 220, 0, alpha);
  ellipse(0, 0, 10 * flower.size, 10 * flower.size);
  
  pop();
}

function drawUI() {
  // UI background
  fill(0, 0, 0, 150);
  noStroke();
  rect(5, 5, 360, 155, 5);  // === CHANGED: Made slightly taller for new info
  
  // UI text
  fill(255);
  stroke(0);
  strokeWeight(1);
  textSize(12);
  
  // Netherlands time display
  let timeStatus = plantTime.growthActive ? "🌞 Day (Growing)" : "🌙 Night (Resting)";
  text("Netherlands Time: " + plantTime.currentHour + ":00 - " + timeStatus, 15, 25);
  
  // === ADDED: Show real planting date ===
  text("Planted: Nov 11, 2025", 200, 25);
  
  // Plant status
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
  
  text(statusEmoji + " Status: " + status, 15, 45);
  text("Age: " + nf(plantAge/100, 1, 1) + " days | Size: " + plant.length + " segments", 15, 65);
  
  // Plant statistics
  text("Leaves: " + leaves.length + " | Flowers: " + flowers.length, 15, 85);
  text("Soil Moisture: " + sensorData.soilMoisture, 15, 105);
  
  // Plant needs indicator
  let needsMessage = "✓ Plant is happy";
  let needsColor = color(100, 255, 100);
  let needsEmoji = "😊";
  
  if (sensorData.soilMoisture < 300) {
    needsMessage = "💧 Needs water!";
    needsColor = color(255, 100, 100);
    needsEmoji = "😥";
  } else if (sensorData.soilMoisture > 700) {
    needsMessage = "⚠️ Soil too wet!";
    needsColor = color(255, 200, 50);
    needsEmoji = "😟";
  }
  
  fill(needsColor);
  text(needsEmoji + " " + needsMessage, 15, 125);
  
  // === ADDED: Real-time growth indicator ===
  fill(255, 255, 255, 200);
  textSize(11);
  text("🌱 Growing in real-time: 1 sec = 1 sec", 15, 145);
  
  // Soil moisture bar
  noStroke();
  fill(100);
  rect(15, 155, 200, 8);
  fill(50, 200, 50);
  let moistureWidth = map(sensorData.soilMoisture, 200, 800, 0, 200);
  moistureWidth = constrain(moistureWidth, 0, 200);
  rect(15, 155, moistureWidth, 8);
  
  // Instructions
  fill(255, 255, 255, 200);
  textSize(10);
  text("SPACEBAR: Grow | CLICK: Water | R: Reset", width - 230, height - 10);
  
  // Image status indicator
  if (!leafImage || !flowerImage) {
    fill(255, 100, 100, 200);
    text("⚠️ Upload leaf and flower images!", width - 230, height - 25);
  }
}

// INTERACTION FUNCTIONS
function mousePressed() {
  // Click to water the plant
  sensorData.soilMoisture = min(800, sensorData.soilMoisture + 120);
  console.log("Water added! Soil moisture:", sensorData.soilMoisture);
  
  // Visual feedback
  fill(100, 150, 255, 150);
  noStroke();
  ellipse(mouseX, mouseY, 30, 30);
}

function keyPressed() {
  // SPACEBAR to manually grow
  if (key === ' ') {
    growPlant();
    console.log("Manual growth. Segments:", plant.length, "Leaves:", leaves.length, "Flowers:", flowers.length);
  }
  
  // 'R' to reset plant
  if (key === 'r' || key === 'R') {
    plant = [];
    leaves = [];
    flowers = [];
    plantAge = 0;
    growthCounter = 0;
    
    // Reset plantAge to real plant's current age when resetting
    plantAge = calculateRealPlantAge();
    lastUpdateTime = new Date();
    
    // Start with new seed
    let baseX = width/2;
    let baseY = height - 50;
    plant.push(new StemSegment(baseX, baseY, baseX, baseY - 30, 0, -PI/2, 8));
    
    // Reset sensor data
    sensorData.soilMoisture = 600;
    
    console.log("Plant reset! New age:", nf(plantAge/100, 1, 1), "days");
  }
  
  // 'A' to toggle auto growth
  if (key === 'a' || key === 'A') {
    autoGrowth = !autoGrowth;
    console.log("Auto growth:", autoGrowth ? "ON" : "OFF");
  }
}