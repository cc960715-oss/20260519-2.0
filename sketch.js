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
}

function handleGameLogic() {
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
        playerChoice = (gesture === "START_SIGNAL" || gesture === "UNKNOWN") ? "未知" : gesture;
        determineWinner(playerChoice, computerChoice);
        gameState = "RESULT";
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
    }
  } else if (gameState === "GAME_OVER") {
    gameMessage = (playerScore >= WIN_SCORE ? "恭喜你贏了！" : "電腦贏了！") + " 按下 F5 重新開始";
  }
}

function getGesture(hand) {
  // 確保 keypoints 存在
  if (!hand || !hand.keypoints) return "UNKNOWN";

  // 簡易手勢辨識 (利用指尖與關節的 Y 座標比較，Y 越小代表越高)
  // index: 8, middle: 12, ring: 16, pinky: 20
  // joint: 6, 10, 14, 18
  let isIndexUp = hand.keypoints[8].y < hand.keypoints[6].y;
  let isMiddleUp = hand.keypoints[12].y < hand.keypoints[10].y;
  let isRingUp = hand.keypoints[16].y < hand.keypoints[14].y;
  let isPinkyUp = hand.keypoints[20].y < hand.keypoints[18].y;

  if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) return "START_SIGNAL";
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) return "布";
  if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) return "剪刀";
  if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) return "石頭";
  return "UNKNOWN";
}

function determineWinner(p, c) {
  if (p === "未知") {
    gameMessage = "你沒出拳，電腦得一分";
    computerScore++;
    return;
  }
  if (p === c) {
    gameMessage = "平手！(" + p + ")";
  } else if (
    (p === "石頭" && c === "剪刀") ||
    (p === "剪刀" && c === "布") ||
    (p === "布" && c === "石頭")
  ) {
    gameMessage = "你贏了！電腦出 " + c;
    playerScore++;
  } else {
    gameMessage = "電腦贏了！電腦出 " + c;
    computerScore++;
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
  
  // 倒數或結果顯示
  if (gameState === "RESULT") {
    textSize(40);
    fill(255, 255, 0);
    text(`你: ${playerChoice} vs 電腦: ${computerChoice}`, width / 2, height / 2);
  } else if (gameState === "COUNTDOWN") {
    textSize(80);
    fill(255);
    text(timer, width / 2, height / 2);
  }
}
