const BGColor = '#333';
const nameMaxLength = 15;
const TRACER_LINE_WIDTH = 4;
const HPBarColor = '#ff5555aa';
const HPBarWidth = 30;
const HPBarHeight = 4;
const UI_BarColor_underlay = '#22222266';
const UI_HPBarColor_front = '#02b05d';
const UI_MPBarColor_front = '#19699f';
const player_info_fontSize = 12;
const cursor_size = 20;
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
        tellServer();
    };
    /* div: 接收消息 */
    socket.onmessage = function(e) {
        let data = JSON.parse(e.data);
        // console.log(data);
        // 计算延迟
        let receiveTime = Date.now();
        // let latency = receiveTime - data.time;
        /*  let data = {
                map_id: 0,
                players: [],
                items: [],
                bullets: [],
                time: new Date().getTime()
            } 
        */
        game.player = deepCopy(data.players[0]);
        game.draw(ctx, data.map_id, data.players, data.items, data.bullets);

        // 更新leaderBoard
        game.update_leaderBoard(data.players);

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

function tellServer() {
    // 将canvas坐标转换为数据坐标
    game.key.mouseX = game.mouse.x + game.camera.x;
    game.key.mouseY = game.mouse.y + game.camera.y;
    let message = JSON.stringify({
        key: game.key,
        color: playerColour,
        name: playerName,
    });
    console.log(`发送给服务器: ${message}`);
    socket.send(message);
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

/* div: 定义和main函数 */

const canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d');

const game = new Game();

// 获取窗口宽高, 并设置canvas的大小
function setViewZoom(zoomIndex) {
    const w = window.innerWidth,
        h = window.innerHeight;
    canvas.width = w / zoomIndex;
    canvas.height = h / zoomIndex;
    game.set_viewport(canvas.width, canvas.height);
    // 防止camera瞬时偏移
    game.update_camera(game.player.loc.x, game.player.loc.y, true);
}
setViewZoom(zoomIndex);

game.pauseFlag = false;
let anim;

/* 将viewport限制在地图的范围内*/
game.limit_viewport = false;
/* camera开始移动的距离差 */
game.camer_movement_limit = { x: 10, y: 8 };


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

    ctx.fillStyle = game.current_map.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    game.update();
    game.draw(ctx);

    trapClock++;

    anim = window.requestAnimFrame(Loop);
};

// Loop();