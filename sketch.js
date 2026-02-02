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

// Debug flag
let showDebugInfo = true;

// Age settings
const STARTING_AGE_DAYS = 82.5; // Start at 82.5 days old
const MATURE_AGE_DAYS = 120; // Plant is considered mature at 120 days
const MAX_AGE_DAYS = 365; // Maximum age

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
  
  if (showDebugInfo) {
    console.log("Pot position recalculated:");
    console.log("  Ground starts at y:", ground.y);
    console.log("  Pot center at y:", pot.y);
    console.log("  Pot top at y:", pot.y - pot.height/2);
    console.log("  Pot bottom at y:", pot.y + pot.height/2);
    console.log("  potEmbedAmount:", potEmbedAmount);
    console.log("  potHorizontalPosition:", potHorizontalPosition);
  }
}

function calculatePlantBasePosition() {
  let potTopY = pot.y - pot.height/2; // Top edge of pot
  let plantBaseY = potTopY + pot.plantStartY; // Where plant emerges from pot
  let actualPlantStartY = plantBaseY - plantStartYOffset;
  
  return {
    baseX: pot.x,
    baseY: actualPlantStartY,
    potTopY: potTopY,
    plantBaseY: plantBaseY
  };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Calculate initial positions
  calculatePotPosition();
  
  // Initialize plant age to STARTING_AGE_DAYS (82.5 days)
  plantAge = STARTING_AGE_DAYS * 100; // Convert to simulation units (days * 100)
  lastUpdateTime = new Date();
  
  // Expose function to receive serial data from HTML
  window.handleSerialData = function(data) {
    processSerialData(data);
  };
  
  console.log("Fuchsia Plant Simulation Started!");
  console.log("Canvas size:", windowWidth, "x", windowHeight);
  console.log("Plant starting age:", STARTING_AGE_DAYS, "days");
  
  // Initialize plant
  resetPlant();
}

function resetPlant() {
  plant = [];
  leaves = [];
  flowers = [];
  growthCounter = 0;
  
  // Start at 82.5 days old
  plantAge = STARTING_AGE_DAYS * 100;
  lastUpdateTime = new Date();
  
  // Calculate plant starting position
  let pos = calculatePlantBasePosition();
  
  if (showDebugInfo) {
    console.log("Plant starting position:");
    console.log("  Base X:", pos.baseX);
    console.log("  Base Y:", pos.baseY);
    console.log("  Pot top Y:", pos.potTopY);
    console.log("  Plant base Y:", pos.plantBaseY);
    console.log("  plantStartYOffset:", plantStartYOffset);
  }
  
  // Create initial stem segment - taller since plant is 82.5 days old
  plant.push(new StemSegment(pos.baseX, pos.baseY, pos.baseX, pos.baseY - (plantStartHeight * 2), 0, -PI/2, 7));
  
  // Since plant is 82.5 days old, add more RANDOM initial growth
  // Add initial segments with more randomness
  let currentSegment = plant[0];
  
  for (let i = 0; i < 15; i++) {
    // Randomly decide: extend stem or create branch
    if (random() < 0.7 || plant.length < 3) {
      // Extend stem with more randomness
      let angleVariation = random(-0.6, 0.6); // More variation
      let newAngle = currentSegment.angle + angleVariation;
      let length = random(20, 35) * (1 - currentSegment.generation * 0.05); // More length variation
      
      let newX = currentSegment.endX + cos(newAngle) * length;
      let newY = currentSegment.endY + sin(newAngle) * length;
      let newThickness = currentSegment.thickness * 0.92;
      currentSegment = new StemSegment(currentSegment.endX, currentSegment.endY, newX, newY, 
                                       currentSegment.generation + 1, newAngle, newThickness);
      plant.push(currentSegment);
    } else {
      // Create a branch from a random existing segment
      let randomSegment = plant[floor(random(plant.length))];
      createBranch(randomSegment);
      // Set current segment to the new branch sometimes
      if (random() < 0.3) {
        currentSegment = plant[plant.length - 1];
      }
    }
  }
  
  // Add random branches
  for (let i = 0; i < 8; i++) {
    if (plant.length > 2) {
      // Pick a segment that's not the most recent one for more variation
      let segmentIndex = floor(random(plant.length - 3));
      createBranch(plant[segmentIndex]);
    }
  }
  
  // Add leaves with more random distribution
  for (let i = 0; i < 25; i++) {
    if (plant.length > 1) {
      // Prefer adding leaves to older segments (not just the tips)
      let segmentIndex;
      if (random() < 0.7) {
        // 70% chance: add to a mature segment (not the newest ones)
        segmentIndex = floor(random(2, max(3, plant.length - 5)));
      } else {
        // 30% chance: add to a newer segment
        segmentIndex = floor(random(max(0, plant.length - 8), plant.length));
      }
      createLeaf(plant[segmentIndex]);
    }
  }
  
  // Add flowers with random distribution
  for (let i = 0; i < 5; i++) {
    if (plant.length > 3) {
      // Flowers appear on various segments, not just tips
      let segmentIndex = floor(random(3, plant.length));
      createFlower(plant[segmentIndex]);
    }
  }
  
  console.log("Plant initialized at 82.5 days with:", plant.length, "segments,", leaves.length, "leaves,", flowers.length, "flowers");
}

function adjustPlantPosition(offsetY) {
  // Move all plant segments by offsetY
  for (let segment of plant) {
    segment.baseStartY += offsetY;
    segment.baseEndY += offsetY;
    segment.startY += offsetY;
    segment.endY += offsetY;
  }
  
  // Move all leaves
  for (let leaf of leaves) {
    leaf.y += offsetY;
  }
  
  // Move all flowers
  for (let flower of flowers) {
    flower.y += offsetY;
  }
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
  
  // Draw debug markers
  if (showDebugInfo) {
    // Draw ground line
    stroke(255, 0, 0, 100);
    strokeWeight(2);
    line(0, ground.y, width, ground.y);
    
    // Draw pot center
    stroke(0, 255, 0, 150);
    strokeWeight(5);
    point(pot.x, pot.y);
    
    // Draw pot top
    stroke(0, 0, 255, 150);
    strokeWeight(5);
    let potTopY = pot.y - pot.height/2;
    point(pot.x, potTopY);
    
    // Draw plant base (where plant emerges from pot)
    stroke(255, 255, 0, 150);
    strokeWeight(5);
    let plantBaseY = potTopY + pot.plantStartY;
    point(pot.x, plantBaseY);
    
    // Draw actual plant start (adjusted by plantStartYOffset)
    stroke(255, 0, 255, 150);
    strokeWeight(5);
    let actualPlantStartY = plantBaseY - plantStartYOffset;
    point(pot.x, actualPlantStartY);
  }
}

function draw() {
  drawBackground();
  
  time += 0.02;
  
  // Update plant age in real-time (but start from 82.5 days)
  const now = new Date();
  if (lastUpdateTime) {
    const timePassed = now - lastUpdateTime;
    const daysPassed = timePassed / (1000 * 60 * 60 * 24);
    plantAge += daysPassed * 100; // Add time in simulation units
    
    // Cap maximum age
    if (plantAge > MAX_AGE_DAYS * 100) {
      plantAge = MAX_AGE_DAYS * 100;
    }
  }
  lastUpdateTime = now;
  
  if (autoGrowth) {
    growthCounter++;
    
    // Get growth speed based on age - OLDER PLANTS GROW SLOWER
    let growthSpeed = getGrowthSpeed();
    
    if (growthCounter > growthSpeed && plant.length < getMaxSegmentsForAge()) {
      if (shouldGrow()) {
        growPlant();
      }
      growthCounter = 0;
    }
  }
  
  updatePlant();
  drawPlant();
  drawUI();
  
  // Draw debug text
  if (showDebugInfo) {
    drawDebugInfo();
  }
}

function drawDebugInfo() {
  push();
  fill(255, 255, 0);
  noStroke();
  textSize(12);
  
  let yPos = 150;
  text("DEBUG INFO:", 15, yPos);
  text("potEmbedAmount: " + potEmbedAmount, 15, yPos + 20);
  text("potHorizontalPosition: " + potHorizontalPosition.toFixed(2), 15, yPos + 35);
  text("plantStartYOffset: " + plantStartYOffset, 15, yPos + 50);
  text("plantStartHeight: " + plantStartHeight, 15, yPos + 65);
  text("Pot Y: " + Math.round(pot.y), 15, yPos + 80);
  text("Ground Y: " + Math.round(ground.y), 15, yPos + 95);
  text("Plant Age: " + (plantAge/100).toFixed(1) + " days", 15, yPos + 110);
  text("Growth Speed: " + getGrowthSpeed() + " frames", 15, yPos + 125);
  
  // Key controls help
  text("CONTROLS:", width - 150, 20);
  text("1/2: Pot depth", width - 150, 40);
  text("3/4: Pot horizontal", width - 150, 55);
  text("5/6: Plant offset", width - 150, 150);
  text("8/9: Plant height", width - 150, 85);
  text("7: Toggle debug", width - 150, 100);
  text("R: Reset plant", width - 150, 115);
  text("SPACE: Grow", width - 150, 130);
  
  pop();
}

function getAgeFactor() {
  // Returns 0-1 based on plant age relative to mature age
  return constrain(plantAge / (MATURE_AGE_DAYS * 100), 0, 1);
}

function getMaxSegmentsForAge() {
  // Maximum segments based on age
  let ageFactor = getAgeFactor();
  let maxSegments = 50 + ageFactor * 50; // 50-100 segments based on age
  return floor(maxSegments);
}

function shouldGrow() {
  let moistureFactor = map(sensorData.soilMoisture, 200, 800, 0, 1);
  moistureFactor = constrain(moistureFactor, 0, 1);
  
  if (sensorData.soilMoisture < 300 || sensorData.soilMoisture > 750) {
    return false;
  }
  
  let ageFactor = getAgeFactor();
  let growthChance = moistureFactor * 0.25; // Reduced from 0.35
  
  // OLDER PLANTS GROW SLOWER
  if (ageFactor < 0.5) {
    growthChance *= 0.8; // Young plant: 80% speed
  } else if (ageFactor < 0.8) {
    growthChance *= 0.5; // Maturing plant: 50% speed
  } else {
    growthChance *= 0.2; // Mature plant: 20% speed
  }
  
  // Since we start at 82.5 days (ageFactor ~ 0.6875), growth will be at 50% speed
  
  // More leaves means plant can grow more (photosynthesis)
  growthChance += leaves.length * 0.0005; // Reduced effect
  
  // Cap growth chance
  growthChance = constrain(growthChance, 0, 0.3);
  
  return random() < growthChance;
}

function getGrowthSpeed() {
  let ageFactor = getAgeFactor();
  
  // MUCH SLOWER GROWTH FOR OLDER PLANTS
  if (ageFactor < 0.3) return 60; // Very young: every 1 second
  if (ageFactor < 0.5) return 120; // Young: every 2 seconds
  if (ageFactor < 0.7) return 180; // Maturing: every 3 seconds
  if (ageFactor < 0.9) return 240; // Adult: every 4 seconds
  return 300; // Mature: every 5 seconds
}

function growPlant() {
  // Only grow if plant hasn't reached maximum size for its age
  if (plant.length >= getMaxSegmentsForAge()) {
    return;
  }
  
  // MORE RANDOM: Choose from a wider pool of segments
  let possibleSegments = plant.filter(segment => 
    segment.canGrow && random() < segment.growthProbability * 1.5 // Increase chance
  );
  
  if (possibleSegments.length === 0) return;
  
  // MORE RANDOM: Choose a segment with some preference for newer ones but not exclusively
  let segment;
  if (random() < 0.6) {
    // 60% chance: choose a newer segment
    segment = possibleSegments[floor(random(max(0, possibleSegments.length - 5), possibleSegments.length))];
  } else {
    // 40% chance: choose any segment (more random)
    segment = random(possibleSegments);
  }
  
  let growthType = random();
  let ageFactor = getAgeFactor();
  
  // MORE RANDOM GROWTH PATTERNS
  if (ageFactor < 0.3) {
    // Young plant: more varied growth
    if (growthType < 0.7) extendStem(segment);
    else if (growthType < 0.9) createBranch(segment);
    else createLeaf(segment);
  } else if (ageFactor < 0.6) {
    // Adolescent: balanced but random growth
    if (growthType < 0.4) extendStem(segment);
    else if (growthType < 0.7) createBranch(segment);
    else if (growthType < 0.95) createLeaf(segment);
    else createFlower(segment);
  } else {
    // Mature plant: even more random pattern
    if (growthType < 0.15) extendStem(segment);
    else if (growthType < 0.3) createBranch(segment);
    else if (growthType < 0.9) {
      if (random() < 0.8) createLeaf(segment);
      else createBranch(segment); // Sometimes branches even on mature plants
    }
    else createFlower(segment);
  }
}

function extendStem(segment) {
  // MORE RANDOM ANGLE: Use a curved growth pattern sometimes
  let angleVariation;
  if (random() < 0.3) {
    // 30% chance: more dramatic curve
    angleVariation = random(-0.8, 0.8);
  } else {
    // 70% chance: normal curve
    angleVariation = random(-0.5, 0.5);
  }
  
  let newAngle = segment.angle + angleVariation;
  
  // MORE RANDOM LENGTH
  let baseLength = random(15, 35);
  let length = baseLength * (1 - segment.generation * 0.06); // Less reduction per generation
  
  // Add some length randomness based on age
  let ageFactor = getAgeFactor();
  length = length * (1 - ageFactor * 0.2); // Less reduction for age
  
  let newX = segment.endX + cos(newAngle) * length;
  let newY = segment.endY + sin(newAngle) * length;
  
  // MORE RANDOM THICKNESS
  let thicknessVariation = random(0.9, 0.98);
  let newThickness = segment.thickness * thicknessVariation;
  
  let newSegment = new StemSegment(segment.endX, segment.endY, newX, newY, 
                                   segment.generation + 1, newAngle, newThickness);
  
  // MORE RANDOM GROWTH PROBABILITY FOR NEW SEGMENTS
  newSegment.growthProbability *= random(0.8, 1.0);
  
  plant.push(newSegment);
}

function createBranch(segment) {
  // MORE RANDOM BRANCH ANGLE
  let branchDirection = random() < 0.5 ? -1 : 1; // Random left or right
  let branchAngle;
  
  if (random() < 0.4) {
    // 40% chance: steep branch
    branchAngle = segment.angle + branchDirection * random(PI/3, PI/2);
  } else {
    // 60% chance: moderate branch
    branchAngle = segment.angle + branchDirection * random(PI/6, PI/3);
  }
  
  // MORE RANDOM BRANCH LENGTH
  let baseLength = random(12, 28);
  let branchLength = baseLength * (1 - segment.generation * 0.08);
  
  // Add randomness for older plants
  let ageFactor = getAgeFactor();
  branchLength = branchLength * (1 - ageFactor * 0.3);
  
  let newX = segment.endX + cos(branchAngle) * branchLength;
  let newY = segment.endY + sin(branchAngle) * branchLength;
  
  // MORE RANDOM THICKNESS
  let thicknessVariation = random(0.65, 0.8);
  let branchThickness = segment.thickness * thicknessVariation;
  
  let branch = new StemSegment(segment.endX, segment.endY, newX, newY, 
                               segment.generation + 1, branchAngle, branchThickness);
  
  // MORE RANDOM GROWTH PROBABILITY FOR BRANCHES
  branch.growthProbability = segment.growthProbability * random(0.7, 0.9);
  
  plant.push(branch);
}

function createLeaf(segment) {
  let leaf = {
    x: segment.endX,
    y: segment.endY,
    size: random(0.7, 1.3), // More size variation
    angle: segment.angle + random(-PI/2.5, PI/2.5), // More angle variation
    age: 0,
    maxAge: random(900, 1400), // More age variation
    swayPhase: random(TWO_PI),
    swayAmount: random(0.4, 1.2), // More sway variation
    colorVariation: random(0.7, 1.3), // More color variation
    isAttached: true,
    // Add random rotation speed
    rotationSpeed: random(-0.01, 0.01)
  };
  leaves.push(leaf);
}

function createFlower(segment) {
  // Only create flowers if plant is old enough (fuchsias flower after ~60 days)
  // Our plant starts at 82.5 days, so always create flowers
  let flower = {
    x: segment.endX,
    y: segment.endY,
    size: random(0.6, 1.4), // More size variation
    angle: segment.angle + random(-PI/3, PI/3), // More angle variation
    age: 0,
    maxAge: random(700, 1100), // More age variation
    swayPhase: random(TWO_PI),
    swayAmount: random(0.2, 0.7), // More sway variation
    colorVariation: random(0.8, 1.2), // More color variation
    bloomProgress: 0,
    isBlooming: false,
    // Add random bloom speed
    bloomSpeed: random(0.8, 1.2)
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
    
    // More interesting sway with multiple frequencies
    leaf.swayOffset = sin(time * 1.5 + leaf.swayPhase) * leaf.swayAmount * 0.7 +
                     cos(time * 2.3 + leaf.swayPhase * 1.3) * leaf.swayAmount * 0.3;
    
    // Add slow rotation
    leaf.angle += leaf.rotationSpeed || 0;
    
    // Older plants drop leaves faster
    let ageFactor = getAgeFactor();
    let ageRate = 1 + ageFactor * 0.3;
    
    if (leaf.age > leaf.maxAge * ageRate) {
      leaf.isAttached = false;
      leaf.y += 0.3;
      leaf.angle += 0.005;
      
      if (leaf.y > height + 50) {
        leaves.splice(i, 1);
      }
    }
  }
  
  for (let i = flowers.length - 1; i >= 0; i--) {
    let flower = flowers[i];
    flower.age++;
    
    // More interesting sway
    flower.swayOffset = sin(time * 1.0 + flower.swayPhase) * flower.swayAmount * 0.8 +
                       sin(time * 1.8 + flower.swayPhase * 0.7) * flower.swayAmount * 0.2;
    
    // Variable bloom speed
    let bloomSpeed = flower.bloomSpeed || 1;
    if (flower.age < 40 * bloomSpeed) {
      flower.bloomProgress = flower.age / (40 * bloomSpeed);
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
  
  // More color variation
  let tintValue = 255 * leaf.colorVariation;
  tint(tintValue, 255, 255, alpha);
  
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
  
  // More color variation
  let tintValue = 255 * flower.colorVariation;
  tint(tintValue, 255, 255, alpha);
  
  rotate(flower.angle);
  imageMode(CENTER);
  
  let flowerSize = 30 * flower.size * scaleFactor;
  image(flowerImage, 0, 0, flowerSize, flowerSize);
  
  pop();
}

function drawFallbackLeaf(leaf) {
  push();
  translate(leaf.x, leaf.y + leaf.swayOffset);
  rotate(leaf.angle);
  
  let alpha = leaf.isAttached ? 200 : 100;
  
  // Use color variation for fallback leaves too
  let greenValue = 150 * leaf.colorVariation;
  fill(50, constrain(greenValue, 100, 200), 70, alpha);
  
  noStroke();
  
  // More organic leaf shape
  beginShape();
  vertex(0, 0);
  for (let i = 0; i <= TWO_PI; i += 0.2) {
    let r = 12 * leaf.size * (0.4 + 0.6 * sin(i * 1.8)); // More organic shape
    let x = cos(i) * r;
    let y = sin(i) * r * 0.7;
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
  
  // Variable number of petals for more randomness
  let petalCount = floor(random(4, 7));
  
  for (let i = 0; i < petalCount; i++) {
    push();
    rotate((TWO_PI / petalCount) * i + flower.angle);
    
    // Color variation for petals
    let redValue = 255 * flower.colorVariation;
    fill(constrain(redValue, 200, 255), 100, 150, alpha);
    
    noStroke();
    // Random petal shape
    let petalWidth = 12 * flower.size * random(0.8, 1.2);
    let petalHeight = 6 * flower.size * random(0.8, 1.2);
    ellipse(0, -10 * flower.size, petalWidth, petalHeight);
    pop();
  }
  
  fill(255, 220, 0, alpha);
  ellipse(0, 0, 8 * flower.size, 8 * flower.size);
  
  pop();
}

function drawUI() {
  fill(0, 0, 0, 150);
  noStroke();
  rect(5, 5, 220, 120, 5);
  
  fill(255);
  stroke(0);
  strokeWeight(1);
  textSize(12);
  
  text("Planted: 11 Nov 2025", 15, 25);
  
  let serialStatus;
  let serialColor;
  
  if (serialConnected) {
    if (millis() - lastDataTime < 5000) {
      serialStatus = "Arduino Connected";
      serialColor = color(100, 255, 100);
    } else {
      serialStatus = "No recent data";
      serialColor = color(255, 200, 50);
    }
  } else {
    serialStatus = "Click Connect Button";
    serialColor = color(255, 200, 50);
  }
  
  fill(serialColor);
  text(serialStatus, 15, 45);
  
  let status = "Mature"; // Starting at 82.5 days, plant is mature
  let ageInDays = plantAge / 100;
  
  if (ageInDays < 30) status = "Seedling";
  else if (ageInDays < 60) status = "Sprout";
  else if (ageInDays < 90) status = "Flowering";
  else status = "Mature";
  
  if (flowers.length > 0) status = "Flowering " + status;
  
  fill(255);
  text("Status: " + status, 15, 65);
  text("Age: " + nf(ageInDays, 1, 1) + " days", 15, 85);
  text("Leaves: " + leaves.length, 15, 105);
  text("Flowers: " + flowers.length, 15, 125);
  
  let rightColumnX = 135;
  text("Soil: " + sensorData.soilMoisture, rightColumnX, 65);
  text("O2: " + sensorData.oxygen, rightColumnX, 85);
  
  let needsMessage = "Happy";
  let needsColor = color(100, 255, 100);
  
  if (sensorData.soilMoisture < 300) {
    needsMessage = "Thirsty";
    needsColor = color(255, 100, 100);
  } else if (sensorData.soilMoisture > 700) {
    needsMessage = "Too wet";
    needsColor = color(255, 200, 50);
  }
  
  fill(needsColor);
  text(needsMessage, rightColumnX, 45);
  
  noStroke();
  fill(100);
  rect(rightColumnX, 95, 80, 8);
  fill(50, 200, 50);
  let moistureWidth = map(sensorData.soilMoisture, 200, 800, 0, 80);
  moistureWidth = constrain(moistureWidth, 0, 80);
  rect(rightColumnX, 95, moistureWidth, 8);
  
  fill(255);
  textSize(10);
  text("Moisture", rightColumnX, 115);
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
    
    // MORE RANDOM GROWTH PROBABILITY
    this.growthProbability = map(generation, 0, 12, 0.9, 0.1) * random(0.8, 1.2);
    this.growthProbability = constrain(this.growthProbability, 0.02, 0.95);
    
    this.isRoot = false;
    
    this.baseStartX = startX;
    this.baseStartY = startY;
    this.baseEndX = endX;
    this.baseEndY = endY;
    
    this.color = this.calculateColor();
    this.textureOffset = random(1000);
    
    // Add random sway intensity
    this.swayIntensity = random(0.8, 1.2);
  }
  
  calculateColor() {
    if (this.isRoot) return color(101, 67, 33);
    
    let brown = color(120, 80, 60);
    let green = color(100, 130, 60);
    
    // More random color blending
    let blendAmount = constrain(this.generation / 10 + random(-0.1, 0.1), 0, 1);
    
    return lerpColor(brown, green, blendAmount);
  }
  
  updateSway(time) {
    let swayIntensity = (1 - (this.generation * 0.06)) * this.swayIntensity;
    swayIntensity = max(swayIntensity, 0.2);
    
    // More complex sway pattern
    let swayAmount = sin(time * 0.7 + this.generation * 0.3 + this.textureOffset) * swayIntensity * 1.2 +
                    cos(time * 1.1 + this.generation * 0.5 + this.textureOffset * 1.3) * swayIntensity * 0.4;
    
    this.startX = this.baseStartX + swayAmount;
    this.endX = this.baseEndX + swayAmount * 1.3;
    
    let verticalSway = cos(time * 0.5 + this.generation * 0.4 + this.textureOffset * 0.7) * swayIntensity * 0.6;
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
      // Add some color variation
      let tintVariation = random(0.9, 1.1);
      tint(red(tintColor) * tintVariation, green(tintColor) * tintVariation, blue(tintColor) * tintVariation, 220);
      
      imageMode(CORNER);
      
      let drawWidth = segmentLength;
      let drawHeight = this.thickness * 5.5;
      
      let heightVariation = 1 + noise(this.textureOffset + time * 0.5) * 0.3;
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
    resetPlant();
    sensorData.soilMoisture = 650;
    console.log("Plant reset to 82.5 days!");
  }
  
  if (key === 'a' || key === 'A') {
    autoGrowth = !autoGrowth;
    console.log("Auto growth:", autoGrowth ? "ON" : "OFF");
  }
  
  if (key === '7') {
    showDebugInfo = !showDebugInfo;
    console.log("Debug info:", showDebugInfo ? "ON" : "OFF");
  }
  
  // Position adjustment controls
  let needsUpdate = false;
  
  if (key === '1') {
    potEmbedAmount = max(0, potEmbedAmount - 10);
    needsUpdate = true;
  }
  
  if (key === '2') {
    potEmbedAmount += 10;
    needsUpdate = true;
  }
  
  if (key === '3') {
    potHorizontalPosition = max(0, potHorizontalPosition - 0.05);
    needsUpdate = true;
  }
  
  if (key === '4') {
    potHorizontalPosition = min(1, potHorizontalPosition + 0.05);
    needsUpdate = true;
  }
  
  if (key === '5') {
    // Calculate the new position and adjust existing plant
    let oldPos = calculatePlantBasePosition();
    plantStartYOffset = max(0, plantStartYOffset - 5);
    let newPos = calculatePlantBasePosition();
    let offsetY = newPos.baseY - oldPos.baseY;
    adjustPlantPosition(offsetY);
    console.log("plantStartYOffset decreased to:", plantStartYOffset);
  }
  
  if (key === '6') {
    // Calculate the new position and adjust existing plant
    let oldPos = calculatePlantBasePosition();
    plantStartYOffset += 5;
    let newPos = calculatePlantBasePosition();
    let offsetY = newPos.baseY - oldPos.baseY;
    adjustPlantPosition(offsetY);
    console.log("plantStartYOffset increased to:", plantStartYOffset);
  }
  
  if (key === '8') {
    plantStartHeight = max(5, plantStartHeight - 5);
    console.log("plantStartHeight decreased to:", plantStartHeight);
  }
  
  if (key === '9') {
    plantStartHeight += 5;
    console.log("plantStartHeight increased to:", plantStartHeight);
  }
  
  if (needsUpdate) {
    console.log("Position updated:");
    console.log("  potEmbedAmount:", potEmbedAmount);
    console.log("  potHorizontalPosition:", potHorizontalPosition);
    calculatePotPosition();
    windowResized(); // This will update all positions
  }
}
