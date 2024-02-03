const h6_1 = document.getElementById("h6_1");
const h6_2 = document.getElementById("h6_2");
const h6_3 = document.getElementById("h6_3");

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
        dash: false,
        pick: false,
        reload: false,
        switch: false,
        mouse_l: false,
        mouse_m: false,
        mouse_r: false,
        mouseX: 0,
        mouseY: 0,
    };

    /**
     * 光标位置是canvas坐标
     */
    this.mouse = { x: 0, y: 0 };

    this.player = {
        name: undefined,
        colour: undefined,

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
        case 83: //s
            _this.key.down = true;
            break;
        case 32: //space
            _this.key.space = true;
            break;
        case 74: //j
        case 16: //shift
            _this.key.dash = true;
            break;
        case 69: //e
            _this.key.pick = true;
            break;
        case 82: //r
            _this.key.reload = true;
            break;
        case 9: //tab
            e.preventDefault();
            _this.key.switch = true;
            break;
        default:
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
        case 16: //shift
            _this.key.dash = false;
            break;
        case 69: //e
            _this.key.pick = false;
            break;
        case 82: //r
            _this.key.reload = false;
            break;
        case 9: //tab
            e.preventDefault();
            _this.key.switch = false;
            break;
        default:
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
    tellServer();
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
    tellServer();
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
    tellServer();
}

Game.prototype.load_map = function(map_id) {
    // 从服务器加载地图
    socket_file.send(JSON.stringify({ type: "map", map_id: map_id }));
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
        x - this.tile_size / 2,
        y - this.tile_size / 2,
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
                    t_x > this.viewport.x + this.tile_size ||
                    t_y > this.viewport.y + this.tile_size) continue;

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

Game.prototype.draw_items = function(context, items) {
    for (let item of items) {
        this.draw_item(context, item);
    }
}

/**
 * @typedef {Object} Item
 * with basic_attributes
 * @property {string} name
 * @property {string} pic_src
 * @property {number} type
 * @property {number} class
 * @property {number} tier
 * @property {number} price
 * with info
 * @property {string} colour
 * @property {string} info
 * @property {number} id
 * @property {string} belongerIp
 * @property {number} state
 * with position
 * @property {number} mapId
 * @property {{x: Number, y: Number}} pos
 */

/**
 * @param {Item} item 
 */
Game.prototype.draw_item = function(context, item) {
    let x = item.pos.x * this.tile_size - this.camera.x;
    let y = item.pos.y * this.tile_size - this.camera.y;

    let len = this.tile_size * 3 / 4;

    if (picDic[item.pic_src]) {
        let img = new Image();
        img.src = picDic[item.pic_src];
        // 居中绘制 取物品的高度作为参考
        let scale = len / img.height;
        let drawWidth = img.width * scale;
        let drawHeight = img.height * scale;
        context.drawImage(img, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    } else {
        // 请求图片
        socket_file.send(JSON.stringify({ type: "item_pic", pic_src: item.pic_src }));
        // 绘制默认图片
        context.fillStyle = "black";
        context.fillRect(x, y, this.tile_size / 2, this.tile_size / 2);
    }
}

Game.prototype.draw_all_players = function(context, players) {
    for (let player of players)
        this.draw_player(context, player);
}

Game.prototype.draw_player = function(context, player) {
    let span = player_info_fontSize * nameMaxLength / 2; // 显示名字的矩形的宽度

    // 绘制圆球本体
    context.fillStyle = player.colour;
    context.beginPath();
    context.arc(
        player.loc.x - this.camera.x,
        player.loc.y - this.camera.y,
        player.size / 2 - 1,
        0,
        Math.PI * 2
    );
    context.fill();
    context.closePath();


    // 绘制特效
    // 静态特效_特殊状态
    if (player.state.condtion == "fallen" || player.state.condtion == "dead") {
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
            player.loc.x - this.camera.x,
            player.loc.y - this.camera.y,
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
            player.loc.x - this.camera.x - span / 4,
            player.loc.y - this.camera.y + this.tile_size / 2 + 8,
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
            player.loc.x - this.camera.x,
            player.loc.y - this.camera.y,
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
    context.fillRect(player.loc.x - this.camera.x - span / 2, player.loc.y - this.camera.y - this.tile_size - player_info_fontSize - 1, span, player_info_fontSize + 2);
    // context.closePath();
    // 居中绘制玩家名字, 黑字白色描边
    context.fillStyle = "black";
    // x方向正中间是 loc.x - camera.x
    // y方向正中间是 loc.y - camera.y
    // 向左挪半个文字宽度, 向上挪一个格子
    context.fillText(
        player.name,
        player.loc.x - this.camera.x - textWidth / 2,
        player.loc.y - this.camera.y - this.tile_size);
    context.closePath();


    // 在最上面绘制血条
    context.beginPath();
    context.fillStyle = HPBarColor;
    context.fillRect(
        player.loc.x - this.camera.x - span / 2,
        player.loc.y - this.camera.y - this.tile_size - player_info_fontSize - HPBarHeight,
        span * player.state.hp / player.state.hp_max,
        HPBarHeight);
    context.closePath();
};

Game.prototype.update = function() {

    this.update_player();
};

Game.prototype.update_camera = function(target_x, target_y, direct) {
    // 理想位置是目标的canvas坐标 和 光标的canvas坐标的中点
    var c_x = (target_x - this.viewport.x / 2);
    var c_y = (target_y - this.viewport.y / 2);
    // if (this.key.mouse_r) {
    //     c_x = (c_x + this.mouse.x) / 2;
    //     c_y = (c_y + this.mouse.y) / 2;
    // }
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

Game.prototype.update_leaderBoard = function(players) {
    // 更新leaderBoard
    let leaderBoard = document.getElementById("leaderBoard");
    let leaderHTML = "";
    // 排序
    players.sort((a, b) => b.state.hp - a.state.hp);
    for (let player of players) {
        leaderHTML += `
        <tr>
            <td>${player.name}</td>
            <td>${player.state.hp}</td>
        </tr>
        `;
    }
    leaderBoard.innerHTML = leaderHTML;
}

Game.prototype.draw_cursor = function(context) {
    const _this = (this);
    // 画出准星, 由四个矩形组成
    if (!this.key.mouse_l) {
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
    } else {
        context.beginPath();
        context.strokeStyle = "white";
        context.lineWidth = .18 * cursor_size;
        context.moveTo(_this.mouse.x + .18 * cursor_size, _this.mouse.y);
        context.lineTo(_this.mouse.x + 0.64 * cursor_size, _this.mouse.y);
        context.moveTo(_this.mouse.x - .18 * cursor_size, _this.mouse.y);
        context.lineTo(_this.mouse.x - 0.64 * cursor_size, _this.mouse.y);
        context.moveTo(_this.mouse.x, _this.mouse.y + .18 * cursor_size);
        context.lineTo(_this.mouse.x, _this.mouse.y + 0.64 * cursor_size);
        context.moveTo(_this.mouse.x, _this.mouse.y - .18 * cursor_size);
        context.lineTo(_this.mouse.x, _this.mouse.y - 0.64 * cursor_size);
        context.stroke();
        context.closePath();
    }
}

Game.prototype.draw_player_action = function(context) {
    const _this = (this);

    if (_this.key.mouse_r) {
        // 画出玩家和光标的连线, 虚线
        context.beginPath();
        context.strokeStyle = "white";
        context.lineWidth = TRACER_LINE_WIDTH;
        // 表示玩家和光标的canvas坐标
        let p_X = _this.player.loc.x - _this.camera.x;
        let p_Y = _this.player.loc.y - _this.camera.y;
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

Game.prototype.draw_bullets = function(context, bullets) {
    for (let bullet of bullets) {
        this.draw_bullet(context, bullet);
    }
}

Game.prototype.draw_bullet = function(context, bullet) {
    /* 
        bullet.loc = { x: 0, y: 0 };
        bullet.colour = "#000";
        bullet.size = 0;
        bullet.shape = 0; // BULLET_SHAPE_CIRCLE, BULLET_SHAPE_RECT
     */
    context.beginPath();
    context.fillStyle = bullet.colour;
    // todo: 展望: 根据不同形状绘制不同形状的子弹, 绘制方法通过json文件配置
    // TODO: 所有的实体应当以其中心点来表示位置, canvas坐标系要统一改
    // 这里的this.tile_size应该去掉, 所有的tilesize/2都应该去掉
    context.arc(
        bullet.loc.x - this.camera.x,
        bullet.loc.y - this.camera.y,
        bullet.size / 2,
        0,
        Math.PI * 2
    );
    context.fill();
    context.closePath();
}

Game.prototype.drawUI = function(context) {
    let unit_x = this.viewport.x / 100;
    let unit_y = this.viewport.y / 100;

    let UI_digitLineWidth = 0.8;
    let UI_lefttop_x = 1.8 * unit_x;
    let UI_lefttop_y = 1.8 * unit_y;
    let UI_HPBarHeight = 2 * unit_y;
    let UI_MPBarHeight = 1.8 * unit_y;
    let UI_unitlength = 0.75 * unit_x;
    let overblood = 0.2 * UI_unitlength;
    let UI_margin_x = 0.7 * unit_x;
    let UI_margin_y = 0.7 * unit_y;

    let x, y;

    // 绘制血量条
    context.beginPath();
    context.fillStyle = UI_BarColor_underlay;
    x = UI_lefttop_x;
    y = UI_lefttop_y;
    context.fillRect(x - overblood,
        y - overblood,
        this.player.state.hp_max * UI_unitlength + overblood * 2,
        UI_HPBarHeight + overblood * 2);

    context.fillStyle = UI_HPBarColor_front;
    context.fillRect(x, y, this.player.state.hp * UI_unitlength, UI_HPBarHeight);


    context.lineWidth = UI_digitLineWidth;
    context.font = player_info_fontSize + "px Arial";
    let text = this.player.state.hp + " / " + this.player.state.hp_max;
    let textWidth = context.measureText(text).width;
    let center_x = x + this.player.state.hp_max * UI_unitlength / 2;
    let center_y = y + UI_HPBarHeight / 2;
    context.strokeStyle = "white";
    context.strokeText(text,
        center_x - textWidth / 2,
        center_y + player_info_fontSize / 2);

    // 绘制蓝条
    context.beginPath();
    context.fillStyle = UI_BarColor_underlay;
    x = UI_lefttop_x;
    y += UI_HPBarHeight + UI_margin_y;
    context.fillRect(x - overblood,
        y - overblood,
        this.player.state.mp_max * UI_unitlength + overblood * 2,
        UI_MPBarHeight + overblood * 2);

    context.fillStyle = UI_MPBarColor_front;
    context.fillRect(x, y, this.player.state.mp * UI_unitlength, UI_MPBarHeight);

    context.lineWidth = UI_digitLineWidth;
    context.font = player_info_fontSize + "px Arial";
    text = this.player.state.mp + " / " + this.player.state.mp_max;
    textWidth = context.measureText(text).width;
    center_x = x + this.player.state.mp_max * UI_unitlength / 2;
    center_y = y + UI_MPBarHeight / 2;
    context.strokeStyle = "white";
    context.strokeText(text,
        center_x - textWidth / 2,
        center_y + player_info_fontSize / 2);

    // 绘制武器
    let UI_rightbottom_x = this.viewport.x - UI_lefttop_x;
    let UI_rightbottom_y = this.viewport.y - UI_lefttop_y;

    let UI_weaponPicBox_width = 8 * unit_x;
    let UI_weaponPicBox_height = 8 * unit_y;

    x = UI_rightbottom_x - UI_weaponPicBox_width;
    y = UI_rightbottom_y - UI_weaponPicBox_height;

    context.beginPath();
    context.fillStyle = UI_BarColor_underlay;
    context.fillRect(x, y, UI_weaponPicBox_width, UI_weaponPicBox_height);

    // 绘制武器png
    if (this.player.equipment.spade.length > 0) {
        if (picDic[this.player.equipment.spade[0].pic_src]) {
            let img = new Image();
            img.src = picDic[this.player.equipment.spade[0].pic_src];
            // 居中绘制
            let scale = Math.min((UI_weaponPicBox_width - overblood * 2) / img.width, (UI_weaponPicBox_height - overblood * 2) / img.height);
            let drawWidth = img.width * scale;
            let drawHeight = img.height * scale;
            context.drawImage(img, x + UI_weaponPicBox_width / 2 - drawWidth / 2, y + UI_weaponPicBox_height / 2 - drawHeight / 2, drawWidth, drawHeight);
        } else {
            // 请求图片
            socket_file.send(JSON.stringify({ type: "item_pic", pic_src: this.player.equipment.spade[0].pic_src }));
            // 绘制默认图片
            context.fillStyle = "black";
            context.fillRect(x + overblood, y + overblood, UI_weaponPicBox_width - overblood * 2, UI_weaponPicBox_height - overblood * 2);
        }

        // 在其上绘制武器名称
        let UI_WeaponNameHeight = 2.4 * unit_y;
        y -= UI_margin_y + UI_WeaponNameHeight;
        context.fillStyle = "#eeeeee88";
        context.fillRect(x, y, UI_weaponPicBox_width, UI_WeaponNameHeight);
        context.font = UI_WeaponNameHeight + "px Arial";
        text = this.player.equipment.spade[0].name;
        textWidth = context.measureText(text).width;
        center_x = x + UI_weaponPicBox_width / 2;
        center_y = y + UI_WeaponNameHeight / 2;
        context.fillStyle = "#222";
        context.fillText(text,
            center_x - textWidth / 2,
            center_y + UI_WeaponNameHeight / 2);

        // 在武器左侧画出ammo
        let ammoBoxWidth = 2 * unit_x;
        let ammoBoxHeight = UI_weaponPicBox_height + UI_WeaponNameHeight + UI_margin_y;
        context.fillStyle = UI_BarColor_underlay;
        x -= UI_margin_x + ammoBoxWidth;
        context.fillRect(x, y, ammoBoxWidth, ammoBoxHeight);

        if (this.player.equipment.spade[0].fireState != "reloading") {
            // 画出子弹数量
            let ammo = this.player.equipment.spade[0].ammo;
            let ammo_max = this.player.equipment.spade[0].ammo_max;
            let ammoWidth = ammoBoxWidth - overblood * 2;
            let ammoHeight = (ammoBoxHeight - overblood * 2) / ammo_max * 4 / 5;
            let ammoMargin = ammoHeight / 4;
            x += overblood;
            y += ammoBoxHeight - overblood;
            context.fillStyle = "ghostwhite";
            for (let i = 0; i < ammo; i++) {
                y -= ammoHeight;
                context.fillRect(x, y, ammoWidth, ammoHeight);
                y -= ammoMargin;
            }
        } else {
            // 用绿色画出reload时间的比例
            let time = this.player.equipment.spade[0].time;
            let startReload = this.player.equipment.spade[0].startReload;
            let reload = this.player.equipment.spade[0].reload;
            let reloadWidth = ammoBoxWidth - overblood * 2;
            let reloadHeight = (ammoBoxHeight - overblood * 2) * (time - startReload) / reload;
            x += overblood;
            y += ammoBoxHeight - overblood - reloadHeight;
            context.fillStyle = "#73ca73";
            context.fillRect(x, y, reloadWidth, reloadHeight);
        }
    }
}

Game.prototype.mouseRightShowInfo = function() {
        // 从canvas坐标转换为数据坐标
        let x = this.key.mouseX + this.tile_size / 2;
        let y = this.key.mouseY + this.tile_size / 2;
        let tile_x = Math.floor(x / this.tile_size);
        let tile_y = Math.floor(y / this.tile_size);

        // 获取该tile的信息
        let tile = this.get_tile(tile_x, tile_y);

        // 展示
        let info_alert = document.querySelector("#info_alert");
        info_alert.style.display = "block";

        info_alert.innerHTML = `
            <span>
                砖块id: ${tile.id}; ${tile.solid ? "实心" : "空心"}${tile.bounce ? `; 弹力: ${tile.bounce}` : ""}${tile.friction ? `; 摩擦: {${tile.friction.x},${tile.friction.x}}` : ""}${tile.jump ? "; 可抓墙跳" : ""}
                <br>
                mouse: {x:${this.mouse.x.toFixed(1)}, y:${this.mouse.y.toFixed(1)}}; key: {x:${this.key.mouseX.toFixed(1)}, y:${this.key.mouseY.toFixed(1)}}; tile: {x:${tile_x}, y:${tile_y}}
            </span>`;

}

Game.prototype.draw = function (context, map_id, players, items, bullets) {
    // 如果地图改变, 重新加载
    if (!this.current_map || map_id != this.current_map.mapId) this.load_map(map_id);

    // 清空画布
    ctx.fillStyle = game.current_map.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画出地图
    this.draw_map(context);

    // 画出所有物品
    this.draw_items(context, items);

    // 画出所有玩家
    this.draw_all_players(context, players);

    // 画出光标
    this.draw_cursor(context);

    // 画出本玩家的行动提示
    this.draw_player_action(context);

    // 画出子弹
    this.draw_bullets(context, bullets);

    // 渲染UI
    this.drawUI(context);

    // 调整相机位置
    this.update_camera(this.player.loc.x, this.player.loc.y, false);

    // 若右键按下, 在信息栏显示实体信息
    if (this.key.mouse_r) this.mouseRightShowInfo();
    else document.getElementById("info_alert").style.display = "none";
};

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

const Loop = function () {

    ctx.fillStyle = game.current_map.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    game.update();
    game.draw(ctx);

    trapClock++;

    anim = window.requestAnimFrame(Loop);
};

// Loop();