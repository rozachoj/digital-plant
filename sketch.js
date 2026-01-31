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

// === SIMPLE VERTICAL ADJUSTMENT ===
// Change this ONE number to move everything up/down!
// Higher number = moves everything DOWN the screen
// Lower number = moves everything UP the screen
const VERTICAL_OFFSET = 100;  // Default: 100

// === ADJUSTMENT VARIABLES ===
let POT_ADJUSTMENTS = {
  x: 400,           // Center of screen (800px wide / 2)
  y: 500 + VERTICAL_OFFSET,  // Base position + offset
  width: 200,
  height: 160,
  scale: 0.1,
  plantStartY: -120
};

let GROUND_ADJUSTMENTS = {
  y: 350 + VERTICAL_OFFSET,   // Base position + offset
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
  
  console.log("All images loaded!");
}

function calculateRealPlantAge() {
  const now = new Date();
  const ageInMillis = now - PLANTING_DATE;
  const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);
  return ageInDays * 100;
}

function setup() {
  // Create fixed-size canvas (800x600 like before)
  createCanvas(800, 600);
  
  // Initialize plant age
  plantAge = calculateRealPlantAge();
  lastUpdateTime = new Date();
  
  // Apply adjustments
  updatePotFromAdjustments();
  updateGroundFromAdjustments();
  
  console.log("Fuchsia Plant Simulation Started!");
  console.log("Vertical offset:", VERTICAL_OFFSET);
  console.log("Pot position:", pot.x, pot.y);
  console.log("Ground position:", ground.y);
  console.log("Press SPACEBAR to grow | CLICK pot to water | R to reset");
  console.log("Press UP/DOWN arrows to adjust vertical position");
  
  // Start plant from adjusted position
  let baseX = pot.x;
  let baseY = pot.y + pot.plantStartY;
  plant.push(new StemSegment(baseX, baseY, baseX, baseY - 20, 0, -PI/2, 7));
}

function drawBackground() {
  // Simple sky - no top bar
  let topColor = color(135, 206, 235);
  let bottomColor = color(240, 248, 255);
  
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

// ... [ALL THE REST OF YOUR FUNCTIONS STAY EXACTLY THE SAME AS BEFORE]
// Only the keyPressed function needs updating for arrow keys

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
  
  // === SIMPLE ADJUSTMENT KEYS ===
  // UP ARROW: Move everything UP (decrease offset)
  if (keyCode === UP_ARROW) {
    VERTICAL_OFFSET -= 20;  // Move up by 20 pixels
    updateAllPositions();
    console.log("Moved UP. Offset:", VERTICAL_OFFSET);
    return false;
  }
  
  // DOWN ARROW: Move everything DOWN (increase offset)
  if (keyCode === DOWN_ARROW) {
    VERTICAL_OFFSET += 20;  // Move down by 20 pixels
    updateAllPositions();
    console.log("Moved DOWN. Offset:", VERTICAL_OFFSET);
    return false;
  }
  
  // RESET to default position (100)
  if (key === '0') {
    VERTICAL_OFFSET = 100;
    updateAllPositions();
    console.log("Reset to default position. Offset:", VERTICAL_OFFSET);
    return false;
  }
}

// === NEW FUNCTION: Update all positions ===
function updateAllPositions() {
  // Update pot position
  POT_ADJUSTMENTS.y = 500 + VERTICAL_OFFSET;
  
  // Update ground position
  GROUND_ADJUSTMENTS.y = 350 + VERTICAL_OFFSET;
  
  // Apply updates
  updatePotFromAdjustments();
  updateGroundFromAdjustments();
  
  console.log("Updated positions:");
  console.log("- Pot Y:", pot.y);
  console.log("- Ground Y:", ground.y);
}

// ... [THE REST OF YOUR CODE STAYS EXACTLY THE SAME]
// Make sure to include ALL your other functions exactly as they were
