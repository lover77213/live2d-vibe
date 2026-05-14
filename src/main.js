import * as PIXI from "https://unpkg.com/pixi.js@7/dist/pixi.min.mjs";
import { Live2DModel } from "https://unpkg.com/pixi-live2d-display@0.5.0-beta.7/dist/index.mjs";

async function init() {
    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window
    });

    // 根據截圖 1.12.08.png，路徑必須包含 public/model/
    const model = await Live2DModel.from("public/model/model.model3.json");
    app.stage.addChild(model);
    
    model.x = 0;
    model.y = 0;
}
init();