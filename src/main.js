/**
 * 🚀 PIXI 應用程式初始化 (強化畫質設定)
 */
const app = new PIXI.Application({
  resizeTo: window,
  backgroundAlpha: 0,
  antialias: true, 
  resolution: Math.max(window.devicePixelRatio, 2), 
  autoDensity: true,
  powerPreference: 'high-performance',
});

app.view.style.position = "absolute";
app.view.style.top = "0";
app.view.style.left = "0";
app.view.style.zIndex = "1";
document.body.appendChild(app.view);

// 從全域變數抓取 Live2D 模組
const Live2DModel = PIXI.live2d.Live2DModel;
Live2DModel.registerTicker(PIXI.Ticker);

let model;
let startX = 0; 
let startY = 0; 
let isOnModel = false;
let swipeAxis = null; 

// 🌟 參數狀態管理
let targetClothes = -1, currentClothes = -1;  
let targetParam7 = -1, currentParam7 = -1;    
let targetParam5 = -1, currentParam5 = -1;    
let targetParam3 = -1, currentParam3 = -1;    
let targetParam = -1, currentParam = -1;      
let targetParam6 = 0, currentParam6 = 0;      
let currentParam8 = 0; // 🌟 移除多餘進度變數，直接操作當前值              
let blinkTarget = 1, blinkCurrent = 1;        
let breathTimer = 0;    // 🌟 呼吸專用計時器

// 🔒 鎖定、記憶體與計時狀態
let isParam2Locked = false;
let isParam7Locked = false;
let isParam3Locked = false; 
let isParamLocked = false;  
let isParam6Triggered = false; 
let param5HoldStartTime = 0;   
let isHoldingForParam8 = false; 
let lockHistory = [];          
let lastTapTime = 0;

let userScaleOffset = 0.5; 
let zoomLock = false; 

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * 📏 自動縮放與畫質維持 (🌟 縮小 20% + 終極防裁切 Fit 邏輯)
 */
function resize() {
  if (!model) return;

  try {
    // 🌟 統一縮小係數 0.8 (即縮小 20%)，確保左右預留安全邊距 (Safe Area)
    const paddingFactor = 0.8; 
    
    const scaleByWidth = (window.innerWidth * 0.00055) * paddingFactor; 
    const scaleByHeight = (window.innerHeight * 0.0004) * paddingFactor;

    // 取寬與高中較小的值，確保模型絕對不被裁切
    let baseScale = Math.min(scaleByWidth, scaleByHeight);

    let finalScale = baseScale * userScaleOffset;

    if (finalScale > 2.0 || finalScale < 0.001 || isNaN(finalScale)) {
      finalScale = 0.15; 
    }

    model.scale.set(finalScale);
    model.anchor.set(0.5, 0.5);
    model.x = window.innerWidth / 2;
    model.y = window.innerHeight / 2;

    model.internalModel.textures.forEach(tex => {
        tex.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        tex.baseTexture.anisotropicLevel = 16;
    });
  } catch (err) {
    console.error("Resize 計算失敗:", err);
  }
}

function createZoomButtons() {
  const existing = document.getElementById('zoom-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'zoom-container';
  container.style.cssText = `
    position: fixed; bottom: 80px; right: 25px;
    display: flex; flex-direction: column; gap: 20px; z-index: 10000;
  `;

  const btnStyle = `
    width: 65px; height: 65px; border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.8);
    background: rgba(0, 0, 0, 0.7); color: white;
    font-size: 35px; font-weight: bold; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    user-select: none; touch-action: none; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  `;

  const btnPlus = document.createElement('button');
  btnPlus.innerText = '＋'; btnPlus.style.cssText = btnStyle;

  const btnMinus = document.createElement('button');
  btnMinus.innerText = '－'; btnMinus.style.cssText = btnStyle;

  const handleZoom = (amount) => {
    if (zoomLock) return;
    zoomLock = true;
    userScaleOffset = parseFloat((userScaleOffset + amount).toFixed(2));
    userScaleOffset = Math.max(0.1, Math.min(userScaleOffset, 5.0));
    resize();
    setTimeout(() => { zoomLock = false; }, 400);
  };

  btnPlus.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); handleZoom(0.05); };
  btnMinus.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); handleZoom(-0.05); };

  container.appendChild(btnPlus);
  container.appendChild(btnMinus);
  document.body.appendChild(container);
}

/**
 * ⚙️ 更新所有 Live2D 參數
 */
function updateParams() {
  if (!model?.internalModel?.coreModel) return;
  const core = model.internalModel.coreModel;
  
  // 🌟 彩蛋邏輯
  if (targetParam5 === 1 && !isParam6Triggered) {
    if (param5HoldStartTime === 0) param5HoldStartTime = Date.now(); 
    else if (Date.now() - param5HoldStartTime >= 3000) {
      isParam6Triggered = true;
      targetParam6 = 2; 
    }
  } else if (targetParam5 !== 1) {
    param5HoldStartTime = 0; 
  }

  // 🌟 Param8 水球阻尼感 (捨棄僵硬的數學曲線，改用真正的物理漸進阻尼)
  const p8Target = (isHoldingForParam8 && isParam7Locked) ? 3.0 : 0.0;
  
  // 阻尼係數設定為 0.15。這會產生越接近目標、速度越輕柔的「頂級絲滑感」，完全消除煞車鈍感。
  currentParam8 += (p8Target - currentParam8) * 0.15 * app.ticker.deltaTime;
  
  // 嚴格數值夾斷：防止溢位引發的黑幀
  currentParam8 = Math.max(0.0, Math.min(3.0, currentParam8));
  core.setParameterValueById("Param8", currentParam8);


  // 🌟 真・無縫呼吸 (修復長時間播放造成的浮點數精度卡頓)
  // 將每一幀的微小時間加上去，2.5 是呼吸速度
  breathTimer += (app.ticker.elapsedMS / 1000.0) * 2.5; 
  
  // 🌟 核心修復：強制將時間限制在一個完美的圓周內 (2*PI)
  // 這樣數字永遠不會過大，保證掛機一天一夜呼吸也絕對不卡頓！
  breathTimer = breathTimer % (Math.PI * 2); 
  
  // 計算完美正弦波並映射到 0.0 ~ 1.0
  const breathValue = (Math.sin(breathTimer) * 0.5) + 0.5;
  core.setParameterValueById("ParamBreath", breathValue);


  // 🌟 強制左右互斥
  if (targetParam3 === 1) targetParam = -1;
  if (targetParam === 1) targetParam3 = -1;

  // 參數平滑更新
  currentClothes = lerp(currentClothes, targetClothes, 0.15);
  core.setParameterValueById("Param2", currentClothes);

  currentParam5 = lerp(currentParam5, targetParam5, 0.45);
  core.setParameterValueById("Param5", currentParam5);
  
  currentParam7 = lerp(currentParam7, targetParam7, 0.45);
  core.setParameterValueById("Param7", currentParam7);

  currentParam3 = lerp(currentParam3, targetParam3, 0.45);
  core.setParameterValueById("Param3", currentParam3);

  currentParam = lerp(currentParam, targetParam, 0.45);
  core.setParameterValueById("Param", currentParam);
  
  currentParam6 = lerp(currentParam6, targetParam6, 0.05);
  core.setParameterValueById("Param6", currentParam6);

  blinkCurrent = lerp(blinkCurrent, blinkTarget, 0.25);
  core.setParameterValueById("ParamEyeLOpen", blinkCurrent);
  core.setParameterValueById("ParamEyeROpen", blinkCurrent);
}

function startBlinkLoop() {
  const loop = () => {
    setTimeout(() => {
      blinkTarget = 0;
      setTimeout(() => { blinkTarget = 1; }, 120);
      loop();
    }, 2000 + Math.random() * 4000);
  };
  loop();
}

/**
 * 👆 設定互動邏輯
 */
function setupInteraction() {
  app.view.style.touchAction = "none";

  app.view.addEventListener('pointerdown', (e) => {
    const currentTime = Date.now();
    if (currentTime - lastTapTime < 300) {
      if (lockHistory.length > 0) {
        const lastLocked = lockHistory.pop(); 
        if (lastLocked === 'Param2') { isParam2Locked = false; targetClothes = -1; targetParam5 = -1; }
        else if (lastLocked === 'Param7') { isParam7Locked = false; targetParam7 = -1; }
        else if (lastLocked === 'Param3') { isParam3Locked = false; targetParam3 = -1; }
        else if (lastLocked === 'Param') { isParamLocked = false; targetParam = -1; }
      }
    }
    lastTapTime = currentTime;
  });

  model.interactive = true; 
  model.buttonMode = true; 

  model.on('pointerdown', (e) => {
    isOnModel = true;
    startX = e.data.originalEvent.clientX || e.data.global.x; 
    startY = e.data.originalEvent.clientY || e.data.global.y; 
    swipeAxis = null; 

    // 🌟 按壓蓄力
    if (isParam7Locked) isHoldingForParam8 = true;
  });
  
  window.addEventListener('pointermove', (e) => {
    if (!isOnModel) return;
    const diffX = e.clientX - startX; 
    const diffY = startY - e.clientY; 
    
    // 防手抖容錯 (35px)
    if (!swipeAxis && (Math.abs(diffX) > 35 || Math.abs(diffY) > 35)) {
      swipeAxis = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
      isHoldingForParam8 = false; 
    }
    
    if (swipeAxis === 'x') {
      if (targetClothes === -1 && !isParam2Locked) { 
        if (diffX > 0) {
          if (!isParam3Locked) targetParam3 = diffX < 40 ? -1 : (diffX < 100 ? 0 : 1);
          targetParam = -1; 
        } else {
          const moveLeft = Math.abs(diffX);
          if (!isParamLocked) targetParam = moveLeft < 40 ? -1 : (moveLeft < 100 ? 0 : 1);
          targetParam3 = -1;
        }
      }
    } else if (swipeAxis === 'y') {
      if (diffY > 0) {
        if (!isParam3Locked && !isParamLocked) {
          if (isParam2Locked) targetParam5 = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
          else targetClothes = diffY < 30 ? -1 : (diffY < 120 ? 0 : 1);
        }
      } else {
        if (!isParam7Locked) {
          const down = Math.abs(diffY);
          if (down < 30) targetParam7 = -1;
          else if (down < 80) targetParam7 = 0.8;
          else if (down < 140) targetParam7 = 1.6;
          else if (down < 200) targetParam7 = 2.4;
          else targetParam7 = 2.8;
        }
      }
    }
  });
  
  window.addEventListener('pointerup', () => { 
    if (!isOnModel) return;
    isOnModel = false; 
    swipeAxis = null;
    isHoldingForParam8 = false;

    if (targetClothes === 1 && !isParam2Locked) { isParam2Locked = true; lockHistory.push('Param2'); }
    if (targetParam7 === 2.8 && !isParam7Locked) { isParam7Locked = true; lockHistory.push('Param7'); }
    if (targetParam3 === 1 && !isParam3Locked) { isParam3Locked = true; lockHistory.push('Param3'); }
    if (targetParam === 1 && !isParamLocked) { isParamLocked = true; lockHistory.push('Param'); }

    targetParam5 = -1;
    if (!isParam3Locked) targetParam3 = -1;
    if (!isParamLocked) targetParam = -1; 
  });
}

async function start() {
  try {
    const modelPath = "public/model/model.model3.json";
    model = await Live2DModel.from(modelPath, { autoUpdate: true });

    model.on('modelLoaded', () => {
      model.internalModel.textures.forEach((tex) => {
        if (tex.baseTexture) {
          tex.baseTexture.mipmap = PIXI.TYPES.MIPMAP_MODES.ON;
          tex.baseTexture.anisotropicLevel = 16;
          tex.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        }
      });
      userScaleOffset = 0.5;
      setTimeout(resize, 300);
    });

    window.model = model;
    app.stage.addChild(model);
    model.internalModel.eyeBlink = null;

    setupInteraction(); 
    startBlinkLoop();
    createZoomButtons(); 
    app.ticker.add(updateParams);
    
    resize();
    window.addEventListener("resize", resize);
  } catch (err) { console.error("啟動失敗:", err); }
}

window.addEventListener('DOMContentLoaded', start);
