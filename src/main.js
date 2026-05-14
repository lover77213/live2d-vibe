async function init() {
    // 因為在 index.html 已經載入了 pixi.min.js，這裡直接使用全域變數 PIXI
    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window
    });

    // 使用全域變數 PIXI.live2d (由 pixi-live2d-display 插件提供)
    const model = await PIXI.live2d.Live2DModel.from("public/model/model.model3.json");
    app.stage.addChild(model);
    
    model.x = 0;
    model.y = 0;
}
init();