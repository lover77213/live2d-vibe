import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";

/**
 * ⚙️ 核心配置 - 顯存極限優化版
 */
const CONFIG = {
  MODEL_PATH: "model/model.model3.json",
  BASE_SCALE: 0.0004,
  INIT_OFFSET: 0.5,
  MAX_OFFSET: 8.0,
  MIN_OFFSET: 0.1,
  BLINK_SPEED: 0.15,
  LOAD_TIMEOUT: 120000 
};

let blinkState = { isBlinking: false, progress: 1 };
let model, startY = 0, isOnModel = false;
let targetClothes = -1, currentClothes = -1;
let targetParam7 = -1, currentParam7 = -1;
let userScaleOffset = CONFIG.INIT_OFFSET;

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * 🎨 Loading 畫面 (顯存優化模式)
 */
function createLoadingScreen() {
  const loader = document.createElement('div');
  loader.id = 'app-loader';
  loader.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: #000; display: flex; flex-direction: column;
    align-items: center; justify-content: center; z-index: 20000;
    transition: opacity 1.2s ease; font-family: monospace;
  `;

  loader.innerHTML = `
    <div id="loader-spinner" style="width: 40px; height: 40px; border: 3px solid #111; border-top: 3px solid #00e5ff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 25px;"></div>
    <div style="text-align: center;">
      <div id="loader-status" style="color: #fff; font-size: 13px;">VRAM SAVING MODE...</div>
      <div id="loader-log" style="color: #444; font-size: 10px; margin-top: 10px;">PREPARING 4K TEXTURES</div>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  `;

  document.body.appendChild(loader);
  return {
    hide: () => { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 1200); },
    log: (msg) => { document.getElementById('loader-log').innerText = `> ${msg}`; },
    status: (msg) => { document.getElementById('loader-status').innerText = msg; },
    error: (msg) => {
      document.getElementById('loader-status').style.color = '#ff4d4d';
      document.getElementById('loader-status').innerText = "GPU MEMORY FULL";
      document.getElementById('loader-log').innerText = "顯存溢出：請關閉其他分頁重試";
    }
  };
}

async function ensureCubismCore() {
  if (window.Live2DCubismCore) return true;
  const base = import.meta.env.BASE_URL || "/";
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${base}live2dcubismcore.min.js`;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Core缺失"));
    document.head.appendChild(script);
  });
}

/**
 * ⚡ PIXI 初始化 (極簡顯存模式)
 */
const app = new PIXI.Application({
  resizeTo: window,
  backgroundAlpha: 0,
  antialias: false,        // 💡 關鍵：關閉抗鋸齒以節省巨大顯存開銷
  resolution: 1,           // 💡 關鍵：強制單倍像素，防止高解析螢幕過載
  autoDensity: false,
  powerPreference: 'high-performance',
});
document.body.appendChild(app.view);

Live2DModel.registerTicker(PIXI.Ticker);

function applyTextureSettings(m) {
  const texs = m.internalModel.textures;
  if (texs) {
    texs.forEach(t => {
      t.baseTexture.alphaMode = PIXI.ALPHA_MODES.PMA;
      t.baseTexture.anisotropicLevel = 0; // 💡 顯存不足時關閉異向性過濾
      t.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    });
  }
}

function resize() {
  if (!model) return;
  const s = window.innerHeight * CONFIG.BASE_SCALE * userScaleOffset;
  model.scale.set(s);
  model.anchor.set(0.5, 0.5);
  model.x = window.innerWidth / 2;
  model.y = window.innerHeight / 2;
}

/**
 * 🚀 啟動邏輯 - 降壓喚醒
 */
async function start() {
  const ui = createLoadingScreen();
  const timeout = setTimeout(() => {
    ui.error("VRAM OVERFLOW");
  }, CONFIG.LOAD_TIMEOUT);

  try {
    ui.status("BOOTING CORE...");
    await ensureCubismCore();
    
    ui.status("DECODING 4K PNG...");
    app.stop(); // 💡 暫停一切渲染
    PIXI.settings.CREATE_IMAGE_BITMAP = true;

    const base = import.meta.env.BASE_URL || "/";
    model = await Live2DModel.from(`${base}${CONFIG.MODEL_PATH}?v=${Date.now()}`, { 
      autoUpdate: false,
      idleTimeout: CONFIG.LOAD_TIMEOUT 
    });

    ui.status("UPLOADING TO VRAM...");

    model.on('modelLoaded', () => {
      // 💡 給予 2 秒完全靜默期，讓 GPU 完成搬運
      setTimeout(() => {
        resize();
        app.render(); // 💡 強制渲染一幀預熱

        setTimeout(() => {
          applyTextureSettings(model);
          app.start(); 
          model.autoUpdate = true;
          clearTimeout(timeout);
          
          createZoomButtons().show();
          ui.hide(); 
          startBlinkLoop();
          ui.log("✅ LIVE2D READY");
        }, 500);
      }, 2000); 
    });

    app.stage.addChild(model);
    app.ticker.add(updateApp);
    setupInteraction();
    window.addEventListener("resize", resize);

  } catch (err) {
    clearTimeout(timeout);
    app.start();
    ui.error(err.message);
  }
}

// --- 以下互動邏輯精簡化 ---

function updateApp() {
  if (!model?.internalModel?.coreModel || !model.autoUpdate) return;
  const core = model.internalModel.coreModel;
  currentClothes = lerp(currentClothes, targetClothes, 0.1);
  core.setParameterValueById("Param2", currentClothes);
  currentParam7 = lerp(currentParam7, targetParam7, 0.1);
  core.setParameterValueById("Param7", currentParam7);
  
  if (blinkState.isBlinking) {
    blinkState.progress -= CONFIG.BLINK_SPEED;
    if (blinkState.progress <= 0) {
      blinkState.progress = 0; blinkState.isBlinking = false;
      setTimeout(() => {
        const reopen = () => {
          blinkState.progress += 0.1;
          if (blinkState.progress < 1) requestAnimationFrame(reopen);
          else blinkState.progress = 1;
        };
        reopen();
      }, 60);
    }
  }
  core.setParameterValueById("ParamEyeLOpen", blinkState.progress);
  core.setParameterValueById("ParamEyeROpen", blinkState.progress);
}

function startBlinkLoop() {
  const next = () => setTimeout(() => { blinkState.isBlinking = true; next(); }, 3500 + Math.random() * 4000);
  next();
}

function createZoomButtons() {
  const c = document.createElement('div');
  c.style.cssText = `position:fixed;bottom:80px;right:25px;display:flex;flex-direction:column;gap:20px;z-index:10000;opacity:0;transition:0.5s;`;
  const style = `width:55px;height:55px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.8);color:white;font-size:22px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);cursor:pointer;user-select:none;touch-action:none;`;
  const bP = document.createElement('button'); bP.innerHTML = '+'; bP.style.cssText = style;
  bP.onpointerdown = (e) => { e.preventDefault(); userScaleOffset = Math.min(8, userScaleOffset + 0.1); resize(); };
  const bM = document.createElement('button'); bM.innerHTML = '-'; bM.style.cssText = style;
  bM.onpointerdown = (e) => { e.preventDefault(); userScaleOffset = Math.max(0.1, userScaleOffset - 0.1); resize(); };
  c.appendChild(bP); c.appendChild(bM);
  document.body.appendChild(c);
  return { show: () => c.style.opacity = "1" };
}

function setupInteraction() {
  app.view.style.touchAction = "none";
  app.view.onpointerdown = (e) => { if (e.clientX < window.innerWidth * 0.7) { isOnModel = true; startY = e.clientY; } };
  app.view.onpointermove = (e) => {
    if (!isOnModel) return;
    const dY = startY - e.clientY;
    if (dY > 0) targetClothes = dY < 30 ? -1 : (dY < 120 ? 0 : 1);
    else targetParam7 = Math.abs(dY) < 30 ? -1 : 0;
  };
  app.view.onpointerup = () => { isOnModel = false; };
}

start();