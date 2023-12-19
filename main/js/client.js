var h6_1 = document.getElementById("h6_1");
var h6_2 = document.getElementById("h6_2");
var h6_3 = document.getElementById("h6_3");

var BGColor = '#333';

function setServer() {
    window.socket = new WebSocket("ws://127.0.0.1:432");
    socket.onopen = function() {
        console.log("连接成功");
        alert("成功连接到服务器");
    };
    socket.onmessage = function(e) {
        let data = JSON.parse(e.data);
        console.log(data);
        game.draw(ctx, data.map_id, data.players);
    };
    socket.onclose = function() {
        console.log("连接关闭");
    };
}

function tellServer(key) {
    let message = JSON.stringify(key);
    console.log(`发送给服务器: ${message}`);
    socket.send(message);
}

/* Clarity 引擎 */

var Clarity = function() {

    this.alert_errors = false;
    this.log_info = true;
    this.tile_size = 16;
    this.limit_viewport = false;
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

    this.key = {
        left: false,
        right: false,
        up: false,
        down: false,
        key_j: false,
        key_k: false
    };

    this.player = {

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
};

Clarity.prototype.error = function(message) {

    if (this.alert_errors) alert(message);
    if (this.log_info) console.log(message);
};

Clarity.prototype.log = function(message) {

    if (this.log_info) console.log(message);
};

Clarity.prototype.set_viewport = function(x, y) {

    this.viewport.x = x;
    this.viewport.y = y;
};

Clarity.prototype.keydown = function(e) {

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
        case 83:
            _this.key.down = true;
            break;
        case 32:
            if (_this.pauseFlag) {
                Loop();
                _this.pauseFlag = false;
            } else {
                cancelAnimationFrame(anim);
                _this.pauseFlag = true;
            }
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
    tellServer(_this.key);
};

Clarity.prototype.keyup = function(e) {

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
        case 74: //j
            _this.key.key_j = false;
            break;
        case 75: //k
            _this.key.key_k = false;
            break;
    }
    tellServer(_this.key);
};

Clarity.prototype.load_map = function(map_id) {
    fetch("json/map.json").then(res => res.json()).then(data => {
        game._load_map(data[map_id]);
    });
}


Clarity.prototype._load_map = function(map) {


    if (typeof map === 'undefined' ||
        typeof map.data === 'undefined' ||
        typeof map.keys === 'undefined') {

        this.error('Error: Invalid map data!');

        return false;
    }

    this.current_map = deepCopy(map);

    if (typeof this.current_map.onLoad === "function") this.current_map.onLoad();
    this.player.can_float = true;


    this.current_map.background = map.background || map.BGColor;
    this.current_map.gravity = map.gravity || { x: 0, y: 0.3 };
    this.tile_size = map.tile_size || 16;

    var _this = (this);

    this.current_map.width = 0;
    this.current_map.height = 0;

    // 把data地图中所有的数字转换为tile对象, 同时记录地图的宽度和高度
    // todo: 有改动
    _this.current_map.height = map.data.length;

    map.data.forEach(function(row, y) {

        _this.current_map.width = Math.max(_this.current_map.width, row.length);

        row.forEach(function(tile, x) {

            _this.current_map.data[y][x] = map.keys[map.data[y][x]];
        });
    });

    this.current_map.width_p = this.current_map.width * this.tile_size;
    this.current_map.height_p = this.current_map.height * this.tile_size;

    this.player.loc.x = getMapSave_x(this.current_map) * this.tile_size || 0;
    this.player.loc.y = getMapSave_y(this.current_map) * this.tile_size || 0;
    this.player.colour = map.player.colour || '#000';

    this.key.left = false;
    this.key.up = false;
    this.key.right = false;
    this.key.down = false;
    this.key.key_j = false;
    this.key.key_k = false;

    this.camera = {
        x: this.player.loc.x - 900,
        y: this.player.loc.y - 800
    };

    this.player.vel = {
        x: 0,
        y: 0
    };

    this.log('Successfully loaded map data.');

    return true;
};

Clarity.prototype.get_tile = function(x, y) {

    return (this.current_map.data[y] && this.current_map.data[y][x]) ? deepCopy(this.current_map.data[y][x]) : 0;
};

Clarity.prototype.draw_tile = function(x, y, tile, context) {

    if (!tile || !tile.colour) return;

    context.fillStyle = tile.colour;
    context.fillRect(
        x,
        y,
        this.tile_size,
        this.tile_size
    );
};

Clarity.prototype.draw_map = function(context, fore) {
    // 如果fore为true表示画前景, 否则画底层, 输入false两层都会画
    for (var y = 0; y < this.current_map.data.length; y++) {
        for (var x = 0; x < this.current_map.data[y].length; x++) {

            if ((!fore && !this.current_map.data[y][x].fore) || (fore && this.current_map.data[y][x].fore)) {
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

    if (!fore) this.draw_map(context, true);
};

Clarity.prototype.move_player = function() {

    var tX = this.player.loc.x + this.player.vel.x;
    var tY = this.player.loc.y + this.player.vel.y;

    var offset = Math.round((this.tile_size / 2) - 1);

    var tile = this.get_tile(
        Math.round(this.player.loc.x / this.tile_size),
        Math.round(this.player.loc.y / this.tile_size)
    );

    if (tile.gravity) {

        this.player.vel.x += tile.gravity.x;
        this.player.vel.y += tile.gravity.y;

    } else {

        this.player.vel.x += this.current_map.gravity.x;
        this.player.vel.y += this.current_map.gravity.y;
    }

    if (tile.friction) {

        this.player.vel.x *= tile.friction.x;
        this.player.vel.y *= tile.friction.y;
    }

    var t_y_up = Math.floor(tY / this.tile_size);
    var t_y_down = Math.ceil(tY / this.tile_size);
    var y_near1 = Math.round((this.player.loc.y - offset) / this.tile_size);
    var y_near2 = Math.round((this.player.loc.y + offset) / this.tile_size);

    var t_x_left = Math.floor(tX / this.tile_size);
    var t_x_right = Math.ceil(tX / this.tile_size);
    var x_near1 = Math.round((this.player.loc.x - offset) / this.tile_size);
    var x_near2 = Math.round((this.player.loc.x + offset) / this.tile_size);

    var top1 = this.get_tile(x_near1, t_y_up);
    var top2 = this.get_tile(x_near2, t_y_up);
    var bottom1 = this.get_tile(x_near1, t_y_down);
    var bottom2 = this.get_tile(x_near2, t_y_down);
    var left1 = this.get_tile(t_x_left, y_near1);
    var left2 = this.get_tile(t_x_left, y_near2);
    var left3 = this.get_tile(t_x_left - 1, y_near1);
    var left4 = this.get_tile(t_x_left - 1, y_near2);
    var right1 = this.get_tile(t_x_right, y_near1);
    var right2 = this.get_tile(t_x_right, y_near2);
    var right3 = this.get_tile(t_x_right + 1, y_near1);
    var right4 = this.get_tile(t_x_right + 1, y_near2);


    if (tile.jump && this.jump_switch > 15) {

        this.player.can_jump = true;
        this.player.doublejumpFlag = false;
        this.player.can_doublejump = true;

        this.player.can_dash = true;

        this.jump_switch = 0;

    } else this.jump_switch++;

    this.player.vel.x = Math.min(Math.max(this.player.vel.x, -this.current_map.vel_limit.x), this.current_map.vel_limit.x);
    this.player.vel.y = Math.min(Math.max(this.player.vel.y, -this.current_map.vel_limit.y), this.current_map.vel_limit.y);

    /* dash技能处理 */
    if (left1.solid || left2.solid || right1.solid || right2.solid || left3.solid || left4.solid || right3.solid || right4.solid) { this.dash_switch = 0; }
    if (this.dash_switch > 0) {
        this.player.vel.x = this.key.left ? -10 : 10;
        this.dash_switch--;
    }

    /* float技能处理 */
    if (this.player.float_ability && this.player.can_float && this.key.key_k == true) {
        for (var p = -3; p < 3; p++) {
            for (var q = -2; q < 4; q++) {
                var localTile = this.get_tile(t_x_left + q, t_y_up + p);
                if (localTile.solid) { continue; }
                if (!(this.current_map.data[t_y_up + p] && this.current_map.data[t_y_up + p][t_x_left + q])) { continue; }
                this.current_map.data[t_y_up + p][t_x_left + q] = deepCopy({ colour: '#EADBC5', solid: 0, gravity: { x: 0, y: -0.3 } });
                //colour: '#EADBC5', solid: 0, gravity: { x: 0, y: -0.3 }
            }
        }
        this.player.can_float = false;
        this.player.can_dash = true;
        this.player.can_jump = true;
        this.player.can_doublejump = true;
        this.player.doublejumpFlag = false;
    }

    if (this.player.loc.y > this.current_map.height_p + 100) {
        // player坠落死亡
    }

    // h6_1.innerHTML = this.player.loc.x/this.tile_size;
    // h6_2.innerHTML = this.player.loc.y/this.tile_size;
    h6_3.innerHTML = "死亡计次: " + this.player.deaths;


    this.player.loc.x += this.player.vel.x;
    this.player.loc.y += this.player.vel.y;

    this.player.vel.x *= .9;

    if (left1.solid || left2.solid || right1.solid || right2.solid) {

        /* 解决重叠 */

        while (this.get_tile(Math.floor(this.player.loc.x / this.tile_size), y_near1).solid ||
            this.get_tile(Math.floor(this.player.loc.x / this.tile_size), y_near2).solid)
            this.player.loc.x += 0.1;

        while (this.get_tile(Math.ceil(this.player.loc.x / this.tile_size), y_near1).solid ||
            this.get_tile(Math.ceil(this.player.loc.x / this.tile_size), y_near2).solid)
            this.player.loc.x -= 0.1;

        /* 瓷砖反弹 */

        var bounce = 0;

        if (left1.solid && left1.bounce > bounce) bounce = left1.bounce;
        if (left2.solid && left2.bounce > bounce) bounce = left2.bounce;
        if (right1.solid && right1.bounce > bounce) bounce = right1.bounce;
        if (right2.solid && right2.bounce > bounce) bounce = right2.bounce;

        this.player.vel.x *= -bounce || 0;

    }

    if (top1.solid || top2.solid || bottom1.solid || bottom2.solid) {

        /* 解决重叠 */

        while (this.get_tile(x_near1, Math.floor(this.player.loc.y / this.tile_size)).solid ||
            this.get_tile(x_near2, Math.floor(this.player.loc.y / this.tile_size)).solid)
            this.player.loc.y += 0.1;

        while (this.get_tile(x_near1, Math.ceil(this.player.loc.y / this.tile_size)).solid ||
            this.get_tile(x_near2, Math.ceil(this.player.loc.y / this.tile_size)).solid)
            this.player.loc.y -= 0.1;

        /* 瓷砖反弹 */

        var bounce = 0;

        if (top1.solid && top1.bounce > bounce) bounce = top1.bounce;
        if (top2.solid && top2.bounce > bounce) bounce = top2.bounce;
        if (bottom1.solid && bottom1.bounce > bounce) bounce = bottom1.bounce;
        if (bottom2.solid && bottom2.bounce > bounce) bounce = bottom2.bounce;

        this.player.vel.y *= -bounce || 0;

        if ((bottom1.solid || bottom2.solid) && !tile.jump) {

            this.player.on_floor = true;
            this.player.can_jump = true;
            this.player.can_doublejump = true;
            this.player.doublejumpFlag = false;

            this.player.can_dash = true;

        }

    }

    // 调整相机
    // 基于player的loc和viewport的调整相机的位置
    {
        var c_x = Math.round(this.player.loc.x - this.viewport.x / 2);
        var c_y = Math.round(this.player.loc.y - this.viewport.y / 2);
        var x_dif = Math.abs(c_x - this.camera.x);
        var y_dif = Math.abs(c_y - this.camera.y);

        if (x_dif > 8) {

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

        if (y_dif > 8) {

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
    }

    if (this.last_tile != tile.id && tile.script) {
        // 如果当前的tile与上一个不同, 则执行这个tile的脚本
        eval(this.current_map.scripts[tile.script]);
    }

    this.last_tile = tile.id;

    // 如果当前地图有trap, 则执行
    if (typeof this.current_map.trap === "function") this.current_map.trap();
};

Clarity.prototype.update_player = function() {

    if (this.key.left) {

        if (this.player.vel.x > -this.current_map.vel_limit.x)
            this.player.vel.x -= this.current_map.movement_speed.left;
    }
    if (this.key.up) {
        if (this.player.can_jump && !this.player.doublejumpFlag && this.player.can_doublejump && this.player.vel.y > -this.current_map.vel_limit.y) {

            this.player.vel.y -= this.current_map.movement_speed.jump;
            this.player.can_jump = false;

            this.jump_switch = 0;
        }
        if (this.player.doublejump_ability && !this.player.can_jump && this.player.doublejumpFlag && this.player.can_doublejump && this.player.vel.y > -this.current_map.vel_limit.y && this.jump_switch > 20) {

            this.player.vel.y *= 0.8;
            this.player.vel.y -= this.current_map.movement_speed.jump;
            this.player.can_doublejump = false;
        }
    } else {
        if (!this.player.can_jump && !this.player.doublejumpFlag && this.player.can_doublejump || this.player.can_jump && this.player.doublejumpFlag && this.player.can_doublejump) this.player.doublejumpFlag = true;
        this.jump_switch++;
    }
    if (this.key.right) {

        if (this.player.vel.x < this.current_map.vel_limit.x)
            this.player.vel.x += this.current_map.movement_speed.left;
    }
    if (this.key.down && this.player.glide_ability) {

        this.player.vel.y *= 0.8;
    }
    if (this.key.key_j && this.player.dash_ability && this.player.can_dash) {
        this.player.can_dash = false;
        this.dash_switch = 5;
    }
    // if (this.key.key_k && this.player.float_ability && this.player.can_float) {
    //     this.player.can_float = false;
    // }

    this.move_player();
};

Clarity.prototype.draw_all_players = function(context, players) {
    for (let player of players)
        this.draw_player(context, player);
}

Clarity.prototype.draw_player = function(context, player) {

    context.fillStyle = this.player.colour;

    context.beginPath();

    context.arc(
        this.player.loc.x + this.tile_size / 2 - this.camera.x,
        this.player.loc.y + this.tile_size / 2 - this.camera.y,
        this.tile_size / 2 - 1,
        0,
        Math.PI * 2
    );

    context.fill();
};

Clarity.prototype.update = function() {

    this.update_player();
};

Clarity.prototype.update_camera = function() {
    var c_x = Math.round(this.player.loc.x - this.viewport.x / 2);
    var c_y = Math.round(this.player.loc.y - this.viewport.y / 2);
    var x_dif = Math.abs(c_x - this.camera.x);
    var y_dif = Math.abs(c_y - this.camera.y);

    if (x_dif > 8) {

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

    if (y_dif > 8) {

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

Clarity.prototype.draw = function(context, map_id, players) {
    // 如果地图改变, 重新加载
    if (map_id != this.current_map.mapId) this.load_map(map_id);

    // 清空画布
    ctx.fillStyle = game.current_map.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画出地图
    this.draw_map(context, false);

    // 画出所有玩家
    this.draw_all_players(context, players);
};


var canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d');

canvas.width = 1800;
canvas.height = 1600;

var game = new Clarity();
game.set_viewport(canvas.width, canvas.height);

var tipBoard = document.getElementById("tipBoard");
var playerColour = '#FF9900';
game.load_map(0);
let trapClock = 0;

game.pauseFlag = false;
var anim;

/* 将viewport限制在地图的范围内*/
game.limit_viewport = false;
/* camera开始移动的距离差 */
game.camera.movement_limit = { x: 48, y: 8 };

var Loop = function() {

    ctx.fillStyle = game.current_map.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    game.update();
    game.draw(ctx);

    trapClock++;

    anim = window.requestAnimFrame(Loop);
};

// Loop();