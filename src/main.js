async function init() {
    console.log("🚀 [1/3] 系統啟動中...");
    
    // 防呆檢查：確保 PIXI 和插件有成功掛載
    if (typeof PIXI === 'undefined') {
        console.error("❌ 找不到 PIXI！");
        return;
    }
    if (!PIXI.live2d) {
        console.error("❌ 找不到 PIXI.live2d 插件！");
        return;
    }

    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundColor: 0xcccccc, // 灰色背景
        resizeTo: window
    });

    console.log("⏳ [2/3] 正在讀取 Live2D 模型檔案...");
    
    try {
        // 從全域變數抓取 Live2DModel
        const Live2DModel = PIXI.live2d.Live2DModel;
        const model = await Live2DModel.from("public/model/model.model3.json");
        
        console.log("✅ [3/3] 模型讀取成功！準備顯示...", model);
        
        app.stage.addChild(model);
        
        // 縮小並置中，避免模型太大超出螢幕
        model.scale.set(0.15); 
        model.x = window.innerWidth / 2 - (model.width / 2);
        model.y = window.innerHeight / 2 - (model.height / 2);
        
    } catch (err) {
        console.error("❌ 模型顯示失敗：", err);
    }
}

// 確保網頁標籤全部載入完畢後，再執行程式
window.addEventListener('DOMContentLoaded', init);
