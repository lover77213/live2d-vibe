import * as PIXI from "https://esm.sh/pixi.js@7";
import { Live2DModel } from "https://esm.sh/pixi-live2d-display@0.5.0-beta.7";

async function init() {
    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window
    });

    // 這裡的路徑請確保與你的 model3.json 位置一致
    const model = await Live2DModel.from("public/model/model.model3.json");
    app.stage.addChild(model);
    
    model.x = 0;
    model.y = 0;
}

init();
