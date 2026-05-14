async function init() {
    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window
    });
    const model = await PIXI.live2d.Live2DModel.from("public/model/model.model3.json");
    app.stage.addChild(model);
    model.x = 0;
    model.y = 0;
}
init();
