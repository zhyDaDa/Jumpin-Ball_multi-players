const fpsBufferSize = 24;

const tipBoard = document.getElementById("tipBoard");
let playerColour = localStorage.getItem("playerColour") || "";
let playerName = localStorage.getItem("playerName") || "";
let zoomIndex = localStorage.getItem("zoomIndex") || 1.2;
let trapClock = 0;

/**
 * 存放物品图片
 * pic_src => base64的src
 */
const picDic = {};

/* div: 服务器连接 */

let fpsBuffer = [new Date().getTime(), 0];

function setServer(serverAddress) {
    serverAddress = serverAddress || "ws://127.0.0.1:432";
    if (serverAddress.indexOf("ws") < 0) serverAddress = "ws://" + serverAddress + ":432";
    // 保存上次的地址
    localStorage.setItem("lastServerAddress", serverAddress);
    document.querySelector("#currentServerIP").innerText = serverAddress;
    document.querySelector("#h6_3").innerHTML = `<font color="blue"> 尝试连接服务器中... </font>`
    window.socket = new WebSocket(serverAddress);
    window.socket_file = new WebSocket(serverAddress + "0");

    socket.onopen = function() {
        console.log("成功连接到服务器");
        // alert("成功连接到服务器");
        document.querySelector("#h6_3").innerHTML = `<font color="green"> 成功连接到服务器 </font>`;

    };
    /* div: 接收消息 */
    socket.onmessage = function(e) {
        let data = JSON.parse(e.data);
        // 计算延迟
        let receiveTime = Date.now();

        pullSever(data);

        // 更新延迟显示
        let renderLatency = Date.now() - receiveTime;
        // document.querySelectorAll(".serverDelay").forEach(el => el.innerText = latency);
        document.querySelectorAll(".renderDelay").forEach(el => el.innerText = renderLatency);

        // 计算fps
        if (fpsBuffer[1] < fpsBufferSize) {
            fpsBuffer[1]++;
        } else {
            let fps = Math.round(fpsBuffer[1] / (new Date().getTime() - fpsBuffer[0]) * 1000);
            document.querySelectorAll(".fps").forEach(el => el.innerText = fps);
            fpsBuffer = [new Date().getTime(), 0];
        }

    };
    socket.onclose = function() {
        console.log("连接关闭");
        document.querySelector("#h6_3").innerHTML = `<font color="red"> 服务器连接已断开 </font>`
        window.setTimeout(function() {
            if (window.socket.readyState > 2) {
                document.querySelector("#h6_3").innerHTML = `<font color="blue"> 尝试重新连接... </font>`
                setServer(serverAddress);
            }
        }, 5000);
    };
    socket_file.onmessage = function(e) {
        let obj = JSON.parse(e.data);
        switch (obj.type) {
            case "map":
                game.set_map(obj.data);
                break;
            case "item_pic":
                picDic[obj.data.pic_src] = obj.data.src;
                break;
            case "time":
                socket_file.send(JSON.stringify({
                    type: "time",
                    time: obj.data.time
                }));
                document.querySelectorAll(".serverDelay").forEach(el => el.innerText = Number(obj.data.latency).toFixed(2));
                break;
            default:
                break;
        }
    }
}

/** 从服务器获取数据 */
function pullSever(data) {
    switch (data.type) {
        case "game":
            // TODO: 判断players[0]和自己差别有多大, 如果太大, 使用服务器端的数据, 还有map
            data.data.players[0] = game.player;
            game.update_situation(data.data.players, data.data.items);

            // 更新leaderBoard
            game.update_leaderBoard(data.players);
            break;
        case "map":
            engine.load_map(data.data);
            break;
        case "pic":
            picDic[data.data.pic_src] = data.data.base64;
            break;
        case "time":
            pushServer("time", ({
                time: data.data.time
            }));
            document.querySelectorAll(".serverDelay").forEach(el => el.innerText = Number(data.data.latency).toFixed(2));
            break;
    }
}

/** 
 * 向服务器发送数据
 * @param {"player" | "time"} type  发送的数据类型
 * @param {Object} data  发送的数据
 */
function pushServer(type, data) {
    switch (type) {
        case "player":
            window.socket.send(JSON.stringify({
                type: "player",
                data: data
            }));
            break;
        case "time":
            window.socket_file.send(JSON.stringify({
                type: "time",
                data: data
            }));
            break;
        default:
            break;
    }
}

/* div: html前端杂货 */

function setSkinColor(color) {
    playerColour = color;
    localStorage.setItem("playerColour", color);
    tellServer();
}

function setPlayerName(name) {
    // 截取前nameMaxLength个字符
    playerName = name.substr(0, nameMaxLength);
    localStorage.setItem("playerName", playerName);
    tellServer();
}

/* div: 游戏初始化 */

const canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d');

const engine = new Engine();
const game = new Game();

const thisPlayer = new Player();



// 获取窗口宽高, 并设置canvas的大小
function setViewZoom(zoomIndex) {
    const w = window.innerWidth,
        h = window.innerHeight;
    canvas.width = w / zoomIndex;
    canvas.height = h / zoomIndex;
    game.set_viewport(canvas.width, canvas.height);
    // 防止camera瞬时偏移
    game.update_camera(game.player.chara.loc.x, game.player.chara.loc.y, true);
}
setViewZoom(zoomIndex);

/* 将viewport限制在地图的范围内*/
game.limit_viewport = false;
/* camera开始移动的距离差 */
game.camer_movement_limit = { x: 10, y: 8 };


game.pauseFlag = false;
let anim;
window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
        return window.setTimeout(callback, 1000 / 60);
    };

const Loop = function() {
    // 清空画布
    ctx.fillStyle = game.current_map.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 本地物理引擎计算
    engine.updateSelf();
    // 提交服务器
    pushServer("player", game.player);
    // 渲染
    game.draw(ctx);

    anim = window.requestAnimFrame(Loop);
};

Loop();