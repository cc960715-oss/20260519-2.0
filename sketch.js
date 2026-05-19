// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];

// 遊戲變數
let gameState = "WAITING"; // WAITING, COUNTDOWN, RESULT, GAME_OVER
let playerScore = 0;
let computerScore = 0;
let playerChoice = "";
let computerChoice = "";
let timer = 0;
let lastResultTime = 0;
let gameMessage = "請豎起食指開始每一局";
let particles = [];
let resultScale = 0;
const WIN_SCORE = 3;
let isModelReady = false;

function preload() {
  // Check if ml5 is loaded before initializing
  if (typeof ml5 !== 'undefined') {
    handPose = ml5.handPose({ flipped: true }, () => {
      isModelReady = true;
      console.log("HandPose Model Ready");
    });
  } else {
    console.error("ml5.js library is missing! Please include it in your HTML.");
  }
}

function mousePressed() {
  console.log("Current Hands Data:", hands);
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO, { flipped: true });
  video.hide();

  // Start detecting hands
  if (handPose) {
    handPose.detectStart(video, gotHands);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background('#1B1B1E');

  // 在置中上方顯示文字
  fill(255);
  noStroke();
  textSize(32);
  textAlign(CENTER, TOP);
  text("414730035", width / 2, 20);

  // 檢查 ml5 是否成功載入
  if (typeof ml5 === 'undefined') {
    fill(255, 0, 0);
    textSize(20);
    text("錯誤：找不到 ml5 函式庫，請檢查 HTML 設定", width / 2, height / 2);
    return;
  }

  // 計算影像顯示的寬高與位置 (50% 畫布寬高)
  let displayW = width * 0.5;
  let displayH = height * 0.5;
  let displayX = (width - displayW) / 2;
  let displayY = (height - displayH) / 2;

  // 顯示擷取影像
  image(video, displayX, displayY, displayW, displayH);

  // 遊戲邏輯與 UI 顯示
  displayGameUI(displayX, displayY, displayW, displayH);
  handleGameLogic();

  // 繪製影像邊框
  stroke('#79ADDC');
  strokeWeight(4);
  noFill();
  rect(displayX, displayY, displayW, displayH);

  // Ensure at least one hand is detected
  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        // 定義需要連線的指節群組
        let connections = [
          [0, 1, 2, 3, 4],    // 大拇指
          [5, 6, 7, 8],       // 食指
          [9, 10, 11, 12],    // 中指
          [13, 14, 15, 16],   // 無名指
          [17, 18, 19, 20]    // 小指
        ];

        // 繪製手指連線
        stroke(255, 150); // 設定線條顏色為半透明白色
        strokeWeight(2);  // 設定線條粗細
        for (let segment of connections) {
          for (let i = 0; i < segment.length - 1; i++) {
            let kp1 = hand.keypoints[segment[i]];
            let kp2 = hand.keypoints[segment[i + 1]];

            let x1 = map(kp1.x, 0, video.width, displayX, displayX + displayW);
            let y1 = map(kp1.y, 0, video.height, displayY, displayY + displayH);
            let x2 = map(kp2.x, 0, video.width, displayX, displayX + displayW);
            let y2 = map(kp2.y, 0, video.height, displayY, displayY + displayH);

            line(x1, y1, x2, y2);
          }
        }

        // Loop through keypoints and draw circles
        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];

          // 將偵測到的座標映射到縮放後的影像位置
          let x = map(keypoint.x, 0, video.width, displayX, displayX + displayW);
          let y = map(keypoint.y, 0, video.height, displayY, displayY + displayH);

          // Color-code based on left or right hand
          if (hand.handedness == "Left") {
            fill(255, 0, 255);
          } else {
            fill(255, 255, 0);
          }

          noStroke();
          circle(x, y, 12);
        }
      }
    }
  }

  updateParticles();
}

function handleGameLogic() {
  // 當遊戲結束時，更新提示訊息
  if (gameState === "GAME_OVER") {
    gameMessage = (playerScore >= WIN_SCORE ? "恭喜你贏了！" : "電腦贏了！") + " 食指朝下指重新開始";
  }

  if (hands.length > 0) {
    let hand = hands[0];
    let gesture = getGesture(hand);

    if (gameState === "WAITING") {
      gameMessage = "請豎起食指開始每一局";
      if (gesture === "START_SIGNAL") {
        gameState = "COUNTDOWN";
        timer = 3;
        lastResultTime = millis();
      }
    } else if (gameState === "COUNTDOWN") {
      let elapsed = millis() - lastResultTime;
      if (elapsed < 3000) {
        timer = 3 - Math.floor(elapsed / 1000);
        gameMessage = "準備... " + timer;
      } else {
        // 判定時間到
        computerChoice = random(["石頭", "剪刀", "布"]);
        playerChoice = (gesture === "START_SIGNAL" || gesture === "RESTART_SIGNAL" || gesture === "UNKNOWN") ? "未知" : gesture;
        determineWinner(playerChoice, computerChoice);
        gameState = "RESULT";
        resultScale = 0; // 重置縮放
        lastResultTime = millis();
      }
    } else if (gameState === "RESULT") {
      if (millis() - lastResultTime > 2000) {
        if (playerScore >= WIN_SCORE || computerScore >= WIN_SCORE) {
          gameState = "GAME_OVER";
        } else {
          gameState = "WAITING";
        }
      }
    } else if (gameState === "GAME_OVER") {
      // 檢測重新開始手勢
      if (gesture === "RESTART_SIGNAL") {
        playerScore = 0;
        computerScore = 0;
        gameState = "WAITING";
      }
    }
  }
}

function getGesture(hand) {
  // 確保 keypoints 存在
  if (!hand || !hand.keypoints) return "UNKNOWN";

  // 簡易手勢辨識 (利用指尖與關節的 Y 座標比較，Y 越小代表越高)
  // index: 8, middle: 12, ring: 16, pinky: 20
  // joint: 5, 6, 10, 14, 18
  let isIndexUp = hand.keypoints[8].y < hand.keypoints[6].y;
  let isIndexDown = hand.keypoints[8].y > hand.keypoints[5].y;
  let isMiddleUp = hand.keypoints[12].y < hand.keypoints[10].y;
  let isRingUp = hand.keypoints[16].y < hand.keypoints[14].y;
  let isPinkyUp = hand.keypoints[20].y < hand.keypoints[18].y;

  // 新增：判斷食指是否「伸長」
  let indexDist = dist(hand.keypoints[8].x, hand.keypoints[8].y, hand.keypoints[5].x, hand.keypoints[5].y);
  let indexBase = dist(hand.keypoints[6].x, hand.keypoints[6].y, hand.keypoints[5].x, hand.keypoints[5].y);
  let isIndexExtended = indexDist > indexBase * 1.5; // 伸直時距離通常是基部的 1.5 倍以上

  if (isIndexExtended && isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) return "START_SIGNAL";
  if (isIndexExtended && isIndexDown && !isMiddleUp && !isRingUp && !isPinkyUp) return "RESTART_SIGNAL";
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) return "布";
  if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) return "剪刀";
  if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) return "石頭";
  return "UNKNOWN";
}

function determineWinner(p, c) {
  if (p === "未知") {
    gameMessage = "你沒出拳，電腦得一分";
    computerScore++;
    spawnParticles(width / 2, height / 2, color(255, 100, 100)); // 失敗紅色
    return;
  }
  if (p === c) {
    gameMessage = "平手！(" + p + ")";
    spawnParticles(width / 2, height / 2, color(255, 255, 255)); // 平手白色
  } else if (
    (p === "石頭" && c === "剪刀") ||
    (p === "剪刀" && c === "布") ||
    (p === "布" && c === "石頭")
  ) {
    gameMessage = "你贏了！電腦出 " + c;
    playerScore++;
    spawnParticles(width / 2, height / 2, color(100, 255, 100)); // 勝利綠色
  } else {
    gameMessage = "電腦贏了！電腦出 " + c;
    computerScore++;
    spawnParticles(width / 2, height / 2, color(255, 100, 100)); // 失敗紅色
  }
}

function displayGameUI(x, y, w, h) {
  // 顯示分數
  textAlign(CENTER, CENTER);
  textSize(24);
  fill('#79ADDC');
  text(`玩家: ${playerScore}  |  電腦: ${computerScore}`, width / 2, y - 40);

  // 顯示下方指示說明
  fill(255);
  textSize(28);
  textAlign(CENTER, CENTER);
  text(gameMessage, width / 2, y + h + 60);

  // 顯示玩法說明 (固定於底部)
  textSize(18);
  fill(180);
  text("玩法：豎起食指開始遊戲 | 布：五指伸直 | 剪刀：食指中指 | 石頭：握拳 | 結束後食指朝下重新開始", width / 2, height - 40);
  
  // 倒數或結果顯示
  if (gameState === "RESULT") {
    push();
    translate(width / 2, height / 2);
    // 文字放大動畫邏輯
    if (resultScale < 1) resultScale += 0.1;
    scale(resultScale);
    
    textSize(60);
    stroke(0);
    strokeWeight(4);
    fill(255, 255, 0);
    text(`你: ${playerChoice} vs 電腦: ${computerChoice}`, 0, 0);
    pop();
  } else if (gameState === "COUNTDOWN") {
    textSize(80);
    fill(255);
    text(timer, width / 2, height / 2);
  }
}

// 粒子特效相關函數
function spawnParticles(x, y, col) {
  for (let i = 0; i < 30; i++) {
    particles.push({
      pos: createVector(x, y),
      vel: p5.Vector.random2D().mult(random(2, 8)),
      life: 255,
      color: col
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.pos.add(p.vel);
    p.life -= 5;
    
    push();
    noStroke();
    let c = p.color;
    fill(red(c), green(c), blue(c), p.life);
    ellipse(p.pos.x, p.pos.y, 8);
    pop();
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}
