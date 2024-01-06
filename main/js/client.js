const h6_1 = document.getElementById("h6_1");
const h6_2 = document.getElementById("h6_2");
const h6_3 = document.getElementById("h6_3");

const BGColor = '#333';
const nameMaxLength = 15;
const HPBarColor = '#ff5555aa';
const HPBarWidth = 30;
const HPBarHeight = 4;
let zoomIndex = 1.2;
const player_info_fontSize = 12;
const cursor_size = 20;

/* div: 服务器连接 */

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
        document.querySelector("#h6_3").innerHTML = `<font color="green"> 成功连接到服务器 </font>`
    };
    /* div: 接收消息 */
    socket.onmessage = function(e) {
        let data = JSON.parse(e.data);
        // console.log(data);
        // 计算延迟
        let receiveTime = Date.now();
        let latency = receiveTime - data.time;
        game.player = deepCopy(data.players[0]);
        game.draw(ctx, data.map_id, data.players, data.players[0].loc);
        let renderLatency = Date.now() - receiveTime;
        document.querySelector("#serverDelay").innerText = latency;
        document.querySelector("#renderDelay").innerText = renderLatency;
    };
    socket.onclose = function() {
        console.log("连接关闭");
        document.querySelector("#h6_3").innerHTML = `<font color="red"> 服务器连接已断开 </font>`
    };
    socket_file.onmessage = function(e) {
        game.set_map(JSON.parse(e.data));
    }
}

function tellServer() {
    let message = JSON.stringify({
        key: game.key,
        color: playerColour || '#FF9900',
        name: playerName || "player_A",
    });
    console.log(`发送给服务器: ${message}`);
    socket.send(message);
}

/* div: Game 引擎 */

var Game = function() {

    this.alert_errors = false;
    this.log_info = true;
    this.tile_size = 16;
    this.limit_viewport = true;
    this.jump_switch = 0;
    this.dash_switch = 0;

    this.viewport = {
        x: 200,
        y: 200
    };

    this.camera = {
        x: 0,
        y: 0
    };

    this.camera_movement_limit = { x: 10, y: 8 };

    this.key = {
        left: false,
        right: false,
        up: false,
        down: false,
        space: false,
        key_j: false,
        key_k: false,
        mouse_l: false,
        mouse_m: false,
        mouse_r: false,
    };

    this.mouse = { x: 0, y: 0 };

    this.player = {
        colour: "#111",

        loc: {
            x: 0,
            y: 0
        },

        vel: {
            x: 0,
            y: 0
        },

        can_jump: true,
        doublejumpFlag: false,
        can_doublejump: true,


        can_dash: true,


        doublejump_ability: checkDoubleJumpFlag(),
        glide_ability: checkGlide(),
        dash_ability: checkDash(),
        float_ability: checkFloat(),

        deaths: { red: localStorage.getItem("deathCount_red") << 0, drop: localStorage.getItem("deathCount_drop") << 0, all: function() { return this.red + this.drop; } }
    };

    window.onkeydown = this.keydown.bind(this);
    window.onkeyup = this.keyup.bind(this);
    window.onmousemove = this.mouseMove.bind(this);
    window.onmousedown = this.mouseDown.bind(this);
    window.onmouseup = this.mouseUp.bind(this);
};

Game.prototype.error = function(message) {

    if (this.alert_errors) alert(message);
    if (this.log_info) console.log(message);
};

Game.prototype.log = function(message) {

    if (this.log_info) console.log(message);
};

Game.prototype.set_viewport = function(x, y) {

    this.viewport.x = x;
    this.viewport.y = y;
};

Game.prototype.keydown = function(e) {

    var _this = this;

    switch (e.keyCode) {
        case 37:
            _this.key.left = true;
            break;
        case 65:
            _this.key.left = true;
            break;
        case 38:
            _this.key.up = true;
            break;
        case 87:
            _this.key.up = true;
            break;
        case 39:
            _this.key.right = true;
            break;
        case 68:
            _this.key.right = true;
            break;
        case 40:
            _this.key.down = true;
            break;
        case 32: //space
            _this.key.space = true;
            break;
        case 83:
            _this.key.down = true;
            break;
        case 74: //j
            _this.key.key_j = true;
            break;
        case 75: //k
            _this.key.key_k = true;
            break;
            // case 79: //o
            //     this.load_map(0);
            //     break;

    }
    tellServer();
};

Game.prototype.keyup = function(e) {

    var _this = this;

    switch (e.keyCode) {
        case 37:
            _this.key.left = false;
            break;
        case 65:
            _this.key.left = false;
            break;
        case 38:
            _this.key.up = false;
            break;
        case 87:
            _this.key.up = false;
            break;
        case 39:
            _this.key.right = false;
            break;
        case 68:
            _this.key.right = false;
            break;
        case 40:
            _this.key.down = false;
            break;
        case 83:
            _this.key.down = false;
            break;
        case 32: //space
            _this.key.space = false;
            break;
        case 74: //j
            _this.key.key_j = false;
            break;
        case 75: //k
            _this.key.key_k = false;
            break;
    }
    tellServer();
};

Game.prototype.mouseMove = function(e) {
    const _this = (this);
    // 光标位置是canvas坐标
    _this.mouse = {
        x: e.clientX / zoomIndex,
        y: e.clientY / zoomIndex
    };
}

Game.prototype.mouseDown = function(e) {
    const _this = (this);
    switch (e.button) {
        case 0: //左键
            _this.key.mouse_l = true;
            break;
        case 1: //中键
            _this.key.mouse_m = true;
            break;
        case 2: //右键
            _this.key.mouse_r = true;
            break;
    }
}

Game.prototype.mouseUp = function(e) {
    const _this = (this);
    switch (e.button) {
        case 0: //左键
            _this.key.mouse_l = false;
            break;
        case 1: //中键
            _this.key.mouse_m = false;
            break;
        case 2: //右键
            _this.key.mouse_r = false;
            break;
    }
}

Game.prototype.load_map = function(map_id) {
    // 从服务器加载地图
    socket_file.send(JSON.stringify({ map_id: map_id }));
}

Game.prototype.set_map = function(map) {


    if (typeof map === 'undefined' ||
        typeof map.data === 'undefined' ||
        typeof map.keys === 'undefined') {

        this.error('Error: Invalid map data!');

        return false;
    }

    this.current_map = (map);

    if (typeof this.current_map.onLoad === "function") this.current_map.onLoad();
    this.player.can_float = true;


    this.current_map.background = map.background || map.BGColor;
    this.current_map.gravity = map.gravity || { x: 0, y: 0.3 };
    this.tile_size = map.tile_size || 16;

    var _this = (this);

    this.current_map.width = 0;
    this.current_map.height = 0;

    // 把data地图中所有的数字转换为tile对象, 同时记录地图的宽度和高度
    // TODO: 有改动
    _this.current_map.height = map.data.length;

    map.data.forEach(function(row, y) {

        _this.current_map.width = Math.max(_this.current_map.width, row.length);

        row.forEach(function(tile, x) {

            _this.current_map.data[y][x] = map.keys[map.data[y][x]];
        });
    });

    this.current_map.width_p = this.current_map.width * this.tile_size;
    this.current_map.height_p = this.current_map.height * this.tile_size;

    this.key.left = false;
    this.key.up = false;
    this.key.right = false;
    this.key.down = false;
    this.key.key_j = false;
    this.key.key_k = false;

    this.log('Successfully loaded map data.');

    return true;
};

Game.prototype.get_tile = function(x, y) {

    return (this.current_map.data[y] && this.current_map.data[y][x]) ? deepCopy(this.current_map.data[y][x]) : 0;
};

Game.prototype.draw_tile = function(x, y, tile, context) {

    if (!tile || !tile.colour) return;

    context.fillStyle = tile.colour;
    context.fillRect(
        x,
        y,
        this.tile_size,
        this.tile_size
    );
};

Game.prototype.draw_map = function(context) {

    // 在最底层画出地图名称
    context.fillStyle = "white";
    context.font = canvas.width / 12 * zoomIndex + "px Segoe Script";
    context.strokeStyle = "#ffffff66";
    // 白色描边
    context.lineWidth = 6;
    context.strokeText(this.current_map.mapName, canvas.width / 2 - context.measureText(this.current_map.mapName).width / 2, canvas.height * (.5 - 1 / 8));


    for (var y = 0; y < this.current_map.data.length; y++) {
        for (var x = 0; x < this.current_map.data[y].length; x++) {
            // 暂时无序画前景和底层的区分
            // if ((!fore && !this.current_map.data[y][x].fore) || (fore && this.current_map.data[y][x].fore))
            {
                var t_x = (x * this.tile_size) - this.camera.x;
                var t_y = (y * this.tile_size) - this.camera.y;

                // 如果这个tile在视口之外, 跳过
                if (t_x < -this.tile_size ||
                    t_y < -this.tile_size ||
                    t_x > this.viewport.x ||
                    t_y > this.viewport.y) continue;

                this.draw_tile(
                    t_x,
                    t_y,
                    this.current_map.data[y][x],
                    context
                );
            }
        }
    }

};

Game.prototype.draw_all_players = function(context, players) {
    for (let player of players)
        this.draw_player(context, player);
}

Game.prototype.draw_player = function(context, player) {
    let span = player_info_fontSize * nameMaxLength / 2; // 显示名字的矩形的宽度

    // 绘制圆球本体
    context.fillStyle = player.colour || "oranges";
    context.beginPath();
    context.arc(
        player.loc.x + this.tile_size / 2 - this.camera.x,
        player.loc.y + this.tile_size / 2 - this.camera.y,
        this.tile_size / 2 - 1,
        0,
        Math.PI * 2
    );
    context.fill();
    context.closePath();


    // 绘制特效
    // 静态特效_特殊状态
    if (player.state.condtion == "fallen") {
        // 在其周围绘制虚线圆
        context.beginPath();
        context.strokeStyle = "white";
        context.lineWidth = 3;
        let radius = this.tile_size * .5 + 3;
        let c = 2 * Math.PI * radius;
        let sliceNum = 8;
        let interval = 480;
        context.lineDashOffset = 0;
        context.setLineDash([c / sliceNum * 2 / 3, c / sliceNum / 3]);
        context.arc(
            player.loc.x + this.tile_size / 2 - this.camera.x,
            player.loc.y + this.tile_size / 2 - this.camera.y,
            radius,
            0 + new Date().getTime() / interval % (16) * (2 * Math.PI / 16),
            (2 * Math.PI) + new Date().getTime() / interval % (16) * (2 * Math.PI / 16)
        );
        context.stroke();
        context.setLineDash([]);
        context.closePath();

        // 在下方画出剩余复活时间
        context.beginPath();
        context.fillStyle = "white";
        context.fillRect(
            player.loc.x - this.camera.x + this.tile_size / 2 - span / 4,
            player.loc.y - this.camera.y + this.tile_size + 8,
            span / 2 * (player.state.timer_current - player.state.timer_begin) / (player.state.timer_end - player.state.timer_begin),
            HPBarHeight);
        context.closePath();
    }

    // 动态特效_悬浮
    if (player.gliding) {
        // 在其上方绘制半圆弧
        context.beginPath();
        context.strokeStyle = "white";
        context.lineWidth = 2;
        let radius = this.tile_size * .5 + 3;
        let c = 2 * Math.PI * radius;
        context.arc(
            player.loc.x + this.tile_size / 2 - this.camera.x,
            player.loc.y + this.tile_size / 2 - this.camera.y,
            radius,
            0, Math.PI,
            true
        );
        context.stroke();
        context.closePath();
    }



    // 绘制玩家的名字
    context.lineWidth = 1;
    context.font = player_info_fontSize + "px Georgia";
    let textWidth = context.measureText(player.name).width;
    // 为了让文字更清晰, 在文字下方画一个白色矩形
    context.beginPath();
    context.fillStyle = "#ffffff66";
    context.fillRect(player.loc.x - this.camera.x + this.tile_size / 2 - span / 2, player.loc.y - this.camera.y - this.tile_size / 2 - player_info_fontSize - 1, span, player_info_fontSize + 2);
    // context.closePath();
    // 居中绘制玩家名字, 黑字白色描边
    context.fillStyle = "black";
    // x方向正中间是 loc.x - camera.x + 半个格子
    // y方向正中间是 loc.y - camera.y + 半个格子
    // 向左挪半个文字宽度, 向上挪一个格子
    context.fillText(
        player.name,
        player.loc.x - this.camera.x + this.tile_size / 2 - textWidth / 2,
        player.loc.y - this.camera.y - this.tile_size / 2);
    context.closePath();


    // 在最上面绘制血条
    context.beginPath();
    context.fillStyle = HPBarColor;
    context.fillRect(
        player.loc.x - this.camera.x + this.tile_size / 2 - span / 2,
        player.loc.y - this.camera.y - this.tile_size / 2 - player_info_fontSize - HPBarHeight,
        span * player.state.hp / player.state.hp_max,
        HPBarHeight);
    context.closePath();
};

Game.prototype.update = function() {

    this.update_player();
};

Game.prototype.update_camera = function(target_x, target_y, direct) {
    var c_x = Math.round(target_x - this.viewport.x / 2 + this.tile_size / 2);
    var c_y = Math.round(target_y - this.viewport.y / 2 + this.tile_size / 2);
    var x_dif = Math.abs(c_x - this.camera.x);
    var y_dif = Math.abs(c_y - this.camera.y);

    if (direct) {
        this.camera.x = c_x;
        this.camera.y = c_y;
        return;
    }

    if (x_dif > this.camera_movement_limit.x) {

        var mag = Math.round(Math.max(1, x_dif * 0.1));

        if (c_x != this.camera.x) {

            this.camera.x += c_x > this.camera.x ? mag : -mag;

            if (this.limit_viewport) {

                this.camera.x =
                    Math.min(
                        this.current_map.width_p - this.viewport.x + this.tile_size,
                        this.camera.x
                    );

                this.camera.x =
                    Math.max(
                        0,
                        this.camera.x
                    );
            }
        }
    }

    if (y_dif > this.camera_movement_limit.y) {

        var mag = Math.round(Math.max(1, y_dif * 0.1));

        if (c_y != this.camera.y) {

            this.camera.y += c_y > this.camera.y ? mag : -mag;

            if (this.limit_viewport) {

                this.camera.y =
                    Math.min(
                        this.current_map.height_p - this.viewport.y + this.tile_size,
                        this.camera.y
                    );

                this.camera.y =
                    Math.max(
                        0,
                        this.camera.y
                    );
            }
        }
    }
};

Game.prototype.draw_cursor = function(context) {
    const _this = (this);
    // TODO: 玩家按着左键时, 准星缩小
    // 画出准星, 由四个矩形组成
    context.beginPath();
    context.strokeStyle = "white";
    context.lineWidth = .2 * cursor_size;
    context.moveTo(_this.mouse.x + .2 * cursor_size, _this.mouse.y);
    context.lineTo(_this.mouse.x + 0.72 * cursor_size, _this.mouse.y);
    context.moveTo(_this.mouse.x - .2 * cursor_size, _this.mouse.y);
    context.lineTo(_this.mouse.x - 0.72 * cursor_size, _this.mouse.y);
    context.moveTo(_this.mouse.x, _this.mouse.y + .2 * cursor_size);
    context.lineTo(_this.mouse.x, _this.mouse.y + 0.72 * cursor_size);
    context.moveTo(_this.mouse.x, _this.mouse.y - .2 * cursor_size);
    context.lineTo(_this.mouse.x, _this.mouse.y - 0.72 * cursor_size);
    context.stroke();
    context.closePath();
}

Game.prototype.draw_player_action = function(context) {
    const _this = (this);

    if (_this.key.mouse_r) {
        // 画出玩家和光标的连线, 虚线
        context.beginPath();
        context.strokeStyle = "white";
        context.lineWidth = 4;
        // 表示玩家和光标的canvas坐标
        let p_X = _this.player.loc.x + _this.tile_size / 2 - _this.camera.x;
        let p_Y = _this.player.loc.y + _this.tile_size / 2 - _this.camera.y;
        let c_X = _this.mouse.x;
        let c_Y = _this.mouse.y;
        let len = Math.sqrt(
            Math.pow(p_X - c_X, 2) +
            Math.pow(p_Y - c_Y, 2)
        );
        let sliceNum = 4;
        let interval = 180;
        let offset = -(new Date().getTime() / interval) % (32) * (len / 32);
        context.lineDashOffset = offset;
        context.setLineDash([len / sliceNum * 2 / 3, len / sliceNum / 3]);
        context.moveTo(p_X, p_Y);
        context.lineTo(c_X, c_Y);
        context.stroke();

        context.setLineDash([]);
        context.closePath();

    }
}

Game.prototype.draw = function(context, map_id, players, camera) {
    // 如果地图改变, 重新加载
    if (!this.current_map || map_id != this.current_map.mapId) this.load_map(map_id);

    // 清空画布
    ctx.fillStyle = game.current_map.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画出地图
    this.draw_map(context);

    // 画出所有玩家
    this.draw_all_players(context, players);

    // 画出光标
    this.draw_cursor(context);

    // 画出玩家的行动
    this.draw_player_action(context);

    // context.fillStyle = '#f00';
    // context.fillRect(
    //     // Math.round(camera.x - this.viewport.x / 2 + this.tile_size) / zoomIndex,
    //     // Math.round(camera.y - this.viewport.y / 2 + this.tile_size) / zoomIndex,
    //     this.player.loc.x + this.tile_size / 2 - this.camera.x,
    //     this.player.loc.y + this.tile_size / 2 - this.camera.y,
    //     // this.viewport.x / 2,
    //     // this.viewport.y / 2,
    //     // this.mouse.x,
    //     // this.mouse.y,
    //     1,
    //     1
    // );
    // console.log(this.viewport);

    // 调整相机位置
    this.update_camera(camera.x, camera.y, false);
};

/* div: html前端杂货 */

function setSkinColor(color) {
    playerColour = color;
    tellServer();
}

function setPlayerName(name) {
    // 截取前nameMaxLength个字符
    playerName = name.substr(0, nameMaxLength);
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

const tipBoard = document.getElementById("tipBoard");
let playerColour = '#FF9900';
let playerName = "player_A";
let trapClock = 0;

game.pauseFlag = false;
let anim;

/* 将viewport限制在地图的范围内*/
game.limit_viewport = false;
/* camera开始移动的距离差 */
game.camer_movement_limit = { x: 10, y: 8 };

const Loop = function() {

    ctx.fillStyle = game.current_map.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    game.update();
    game.draw(ctx);

    trapClock++;

    anim = window.requestAnimFrame(Loop);
};

// Loop();