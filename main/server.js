console.log('Server.js 开始运行');


const FALLEN_DAMAGE = 10; // 坠落伤害
const VEL_STILL = 0.05; // 停止速度
/**
 * 地图边界的检测范围, 注意要乘上当前地图的tile_size
 * @property {number} x
 * @property {number} y
 */
const MAP_BOUNDARY_UNIT = { x: 30, y: 20 };

/**
 * 常量ENUM生成器
 */
const createConstants = (function() {
    let privateConstants = {};

    return function() {
        for (let i = 0; i < arguments.length; i++) {
            privateConstants[arguments[i]] = i;
        }
        return privateConstants;
    };
})();
const _enumConstants = [
    "BULLET_TYPE_NORMAL",
    "BULLET_TYPE_EXPLOSIVE",
    "BULLET_TYPE_LASER",
    "SHAPE_CIRCLE",
    "SHAPE_RECT",
    "SHAPE_TRIANGLE",
];
const enums = createConstants(..._enumConstants);


const fs = require('fs');
const WebSocketServer = require('ws').Server;
// const tween = require('tween.js');

/* div: 对象设定 */
/**
 * @class Bullet
 * with movement
 * @property {number} current_mapId
 * @property {number} owner_ip
 * @property {{x: Number, y: Number}} loc   
 * @property {{x: Number, y: Number}} vel
 * @property {{x: Number, y: Number}} acc
 * @property {{x: Number, y: Number}} begin_point
 * @property {{x: Number, y: Number}} end_point 未必是终点, 对于激光类的子弹来说是射线的方向上的一点
 * with damage
 * @property {number} damage_direct
 * @property {number} damage_slice
 * @property {number} damage_continuous
 * @property {number} damage_explosion
 * @property {number} timer
 * @property {number} effect
 * with info
 * @property {number} type
 * @property {number} class
 * @property {string} colour
 * @property {number} size
 * @property {number} shape
 */
class Bullet {
    /**
     * 生成一颗子弹对象, 预设基于玩家信息
     * @param {Player} player 发出者的player对象
     */
    constructor(player) {
        this.current_mapId = player.chara.current_mapId;
        this.loc = deepCopy(player.chara.loc);
        this.vel = deepCopy(player.chara.vel);
        this.speed = 10;
        // this.acc = { x: 0, y: 0 };
        this.owner_ip = player.chara.ip;

        this.begin_point = deepCopy(this.loc);
        this.end_point = deepCopy(player.chara.aimer);

        this.damage_direct = 0;
        this.damage_slice = 0;
        this.damage_continuous = 0;
        this.damage_explosion = 0;

        this.type = enums.BULLET_TYPE_NORMAL; // BULLET_TYPE_NORMAL, BULLET_TYPE_EXPLOSIVE, BULLET_TYPE_LASER
        this.class = 0; // BULLET_CLASS_WHITE, BULLET_CLASS_BLACK

        // 特殊效果
        this.timer = 0;
        this.effect = 0; // BULLET_EFFECT_NONE, BULLET_EFFECT_FREEZE, BULLET_EFFECT_BURN

        this.colour = "#f00";
        this.size = 50;
        this.shape = 0; // BULLET_SHAPE_CIRCLE, BULLET_SHAPE_RECT

        this.init(); // 根据type初始化
    }

    // todo: 展望: 考虑出一个子弹的json, 存储数值, 轨迹, 效果等, 发给客户端还能实现特效和音效

    init() {
        switch (this.type) {
            case enums.BULLET_TYPE_NORMAL:
            default:
                this.size = 50;
                this.shape = enums.SHAPE_CIRCLE;
                this.colour = "#f00";
                this.acc = { x: 0, y: 0 };
                // 由begin_point和end_point确定方向, 向量的模为speed
                let dx = this.end_point.x - this.begin_point.x;
                let dy = this.end_point.y - this.begin_point.y;
                let d = Math.sqrt(dx * dx + dy * dy);
                this.vel.x = this.speed * dx / d;
                this.vel.y = this.speed * dy / d;
                break;
        }
    }


    /**
     * 计算子弹的下一个位置
     * @param {{x: Number, y: Number}} current_gravity 当前地图的重力
     */
    update(current_gravity) {
        switch (this.type) {
            default: this.vel.x += this.acc.x;
            this.vel.y += this.acc.y;
            case enums.BULLET_TYPE_NORMAL:
                    this.loc.x += this.vel.x;
                this.loc.y += this.vel.y;
                break;
        }
    }
}

/**
 * @class Chara
 * with movement
 * @property {{x: Number, y: Number}} loc
 * @property {{x: Number, y: Number}} vel
 * @property {{x: Number, y: Number}} acc
 * @property {{jump: Number, left: Number, right: Number}} speed
 * @property {{x: Number, y: Number}} aimer
 * with info
 * @property {String} ip
 * @property {String} name
 * @property {String} colour
 * @property {Number} current_mapId
 * with flags
 * @property {Boolean} can_jump
 * @property {Boolean} doublejumpFlag
 * @property {Boolean} can_doublejump
 * @property {Boolean} can_dash
 * @property {Boolean} gliding
 * with abilities
 * @property {Boolean} doublejump_ability
 * @property {Boolean} glide_ability
 * @property {Boolean} dash_ability
 * @property {Boolean} float_ability
 * with state
 * @property {{hp: Number, mp: Number, hp_max: Number, mp_max: Number, money: Number, condtion: String, timer_begin: Number, timer_current: Number, timer_end: Number, reviveCooldown: Number}} state
 */
class Chara {
    constructor() {
        this.loc = {
            x: 0,
            y: 0
        };

        this.vel = {
            x: 0,
            y: 0
        };

        this.vel_limit = {
            x: 4,
            y: 10
        };

        this.acc = {
            x: 0,
            y: 0
        };

        this.speed = {
            jump: 6,
            left: 0.5,
            right: 0.5,
        };

        this.aimer = {
            x: 0,
            y: 0
        };

        this.name = "defaultPlayer";
        this.colour = '#000';
        this.current_mapId = 0;

        this.can_jump = true;
        this.doublejumpFlag = false;
        this.can_doublejump = true;

        this.can_dash = true;

        this.gliding = false;

        this.doublejump_ability = true;
        this.glide_ability = true;
        this.dash_ability = true;
        this.float_ability = true;

        this.buff = [{}];
        this.equipment = {
            club: {},
            heart: {},
            spade: {},
            diamond: {},
        };

        this.state = {
            hp: 30,
            mp: 10,
            hp_max: 30,
            mp_max: 10,
            money: 0,
            condtion: "normal",
            timer_begin: 0,
            timer_current: 0,
            timer_end: 0,
            // reviveCooldown: 3000,  // 考虑到一些角色可能复活时间不同
        };
        this.ip = "";
    }
}

/**
 * @class Player
 * @property {Chara} chara
 * @property {WebSocket} ws
 * @property {{left: Boolean, right: Boolean, up: Boolean, down: Boolean, space: Boolean, key_j: Boolean, key_k: Boolean, mouse_l: Boolean, mouse_m: Boolean, mouse_r: Boolean}} key
 */
class Player {
    constructor() {
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
            mouseX: 0,
            mouseY: 0,
        };
        this.chara = new Chara();
        this.ws = undefined;
    }
}

/**
 * 字典: 索引是ip -> 值为Player对象
 * @type {Object}
 * @member {Player} playerDic[ip]
 */
const playerDic = {};
/**
 * 字典: mapId -> [Bullet]
 * @type {Array<Array<Bullet>}
 */
const bulletDic = [];


// div:初始化websocket
// 以wifi的ip地址作为服务器的ip地址, port: 432 作为端口号
const wss = new WebSocketServer({
    host: '0.0.0.0',
    port: 432
});

// wss 开启时console一下
wss.on('listening', function() {
    console.log(`服务器开启, 地址是: ${wss.address().address}`);
    console.log(wss.address());
});

wss.on('connection', function(ws) {

    console.log(`client ${ws._socket.remoteAddress} connected`);

    // div: 在playerDic中记录
    let ip = ws._socket.remoteAddress;
    playerDic[ip] = new Player();
    playerDic[ip].ws = ws;
    playerDic[ip].chara.ip = ip;

    playerDic[ip].name = ip + "";
    playerDic[ip].chara.loc.x = game.maps[playerDic[ip].chara.current_mapId].player.x;
    playerDic[ip].chara.loc.y = game.maps[playerDic[ip].chara.current_mapId].player.y;
    playerDic[ip].chara.colour = game.maps[playerDic[ip].chara.current_mapId].player.colour;

    // 为其设置监听
    ws.on('message', function(message) {
        // console.log("收到消息了");
        // 获得消息来源的ip和端口号
        let ip = ws._socket.remoteAddress;
        // console.log("Received: " + message + " from " + ip);
        data = JSON.parse(message);
        // 更新玩家字典中的数据
        playerDic[ip].key = deepCopy(data.key);
        playerDic[ip].chara.name = data.name;
        playerDic[ip].chara.colour = data.color;
    });

    // 链接关闭
    ws.on('close', function() {
        console.log(`client ${ws._socket.remoteAddress} disconnected`);
        // 删除playerDic中的数据
        delete playerDic[ip];
    });
});

//SIGINT这个信号是系统默认信号，代表信号中断，就是ctrl+c
process.on('SIGINT', function() {
    console.log("Closing things");
    process.exit();
});

function sendMessage(ws, message) {
    wss.clients.forEach(function(client) {
        // 获取client的ip
        let thisIp = client._socket.remoteAddress;
        // 如果不是自己
        if (thisIp != ip) {
            console.log(`client:${thisIp} ip:${ip}`);
            let j = JSON.parse(message);
            j.ip = ip;
            message = JSON.stringify(j);
            client.send(message + "");
        } else {
            let j = JSON.parse(message);
            j.ip = "你自己";
            message = JSON.stringify(j);
            client.send(message + "");

        }
    });
}

function sendAll(message) {
    wss.clients.forEach(function(client) {
        // 获取client的ip
        let thisIp = client._socket.remoteAddress;
        client.send(message);
    })
}


const deepCopy = function(source, kaiguan) {
    let result = {};
    if (kaiguan == 1) result = [];
    for (let key in source) {
        if (Object.prototype.toString.call(source[key]) === '[object Object]') {
            result[key] = deepCopy(source[key])
        }
        if (Object.prototype.toString.call(source[key]) === '[object Array]') {
            result[key] = deepCopy(source[key], 1)
        } else {
            result[key] = source[key]
        }
    }
    return result;
}



class GAME {
    constructor() {
        this.alert_errors = false;
        this.log_info = true;
        this.tile_size = 16;
        this.maps = [];
        this.load_map();
    }


    load_map = function() {
        const data = JSON.parse(fs.readFileSync('main/json/map.json'));
        Object.values(data).forEach((map) => { this._load_map(map) });
        console.log(`已成功装载地图, 地图mapName: ${this.maps.map(e => e.mapName)}`);
    }

    _load_map = function(map) {
        const _this = (this); // 保存this的引用

        if (typeof map === 'undefined' ||
            typeof map.data === 'undefined' ||
            typeof map.keys === 'undefined') {

            this.error('Error: Invalid map data!');

            return false;
        }

        // 基本与原本一致, 只处理一些数值问题和合法性检查
        // _this.current_map = deepCopy(map);
        _this.maps[map.mapId] = map

        // if (typeof current_maponLoad === "function") current_maponLoad();


        _this.maps[map.mapId].background = map.background || map.BGColor;
        _this.maps[map.mapId].gravity = map.gravity || { x: 0, y: 0.3 };
        this.tile_size = map.tile_size || 16;

        _this.maps[map.mapId].width = 0;
        _this.maps[map.mapId].height = 0;

        // 把data地图中所有的数字转换为tile对象, 同时记录地图的宽度和高度
        // TODO: 有改动
        _this.maps[map.mapId].height = map.data.length;

        map.data.forEach(function(row, y) {

            _this.maps[map.mapId].width = Math.max(_this.maps[map.mapId].width, row.length);

            row.forEach(function(tile, x) {

                // _this.maps[map.mapId].data[y][x] = map.keys[map.data[y][x]];
            });
        });

        _this.maps[map.mapId].width_p = _this.maps[map.mapId].width * this.tile_size;
        _this.maps[map.mapId].height_p = _this.maps[map.mapId].height * this.tile_size;

        console.log(`Successfully loaded map: ${_this.maps[map.mapId].mapName}.`);

        return true;
    }

    map_script = function(player, argumentList) {
        switch (argumentList[0]) {
            case "teleport_map":
                // teleport_map(mapId);
                let mapId = parseInt(argumentList[1]);
                this.teleport_player(player, this.maps[mapId].player.x, this.maps[mapId].player.y, mapId);
                break;
        }
    }

    get_tile_from_mapId = function(mapId) {
        let _this = (this)
        return function(x, y) {
            let current_map = _this.maps[mapId];
            return (current_map.data[y] && current_map.data[y][x]) ? deepCopy(current_map.keys[current_map.data[y][x]]) : 0;
        };
    }

    teleport_player = function(player, x, y, mapId) {
        // 单纯意义上的传送只会改变位置
        if (typeof mapId !== "undefined") {
            // 如果传入了mapId, 则切换地图
            player.chara.current_mapId = mapId;
        }
        player.chara.loc.x = x;
        player.chara.loc.y = y;
        // player.chara.vel.x = 0;
        // player.chara.vel.y = 0;
        // player.chara.can_jump = true;
        // player.chara.can_doublejump = true;
        // player.chara.can_dash = true;
        // player.chara.can_float = true;
        // player.chara.glide_ability = true;
        // player.chara.dash_ability = true;
    }

    teleport_player_to_savePoint = function(player) {
        // 存档点就是地图默认玩家位置
        let current_map = this.maps[player.chara.current_mapId];
        this.teleport_player(player, current_map.player.x, current_map.player.y);
        player.chara.vel.x = 0;
        player.chara.vel.y = 0;
        player.chara.can_jump = true;
        player.chara.can_doublejump = true;
        player.chara.can_dash = true;
        player.chara.can_float = true;
        player.chara.glide_ability = true;
        player.chara.dash_ability = true;
    }

    /**
     * 检查obj是否碰到了地图实体
     * @param {{current_mapId: Number, size: Number, loc: {x: Number, y: Number}}} obj
     * @return {Boolean}
     */
    collisionCheck = function(obj) {
        let _this = (this);
        let current_map = _this.maps[obj.current_mapId];
        let tile_size = current_map.tile_size;
        let offset = obj.size / 2;

        let get_tile = this.get_tile_from_mapId(obj.current_mapId);

        let t_y_up = Math.floor(obj.loc.y / tile_size);
        let t_y_down = Math.ceil(obj.loc.y / tile_size);
        let y_near1 = Math.round((obj.loc.y - offset) / tile_size);
        let y_near2 = Math.round((obj.loc.y + offset) / tile_size);

        let t_x_left = Math.floor(obj.loc.x / tile_size);
        let t_x_right = Math.ceil(obj.loc.x / tile_size);
        let x_near1 = Math.round((obj.loc.x - offset) / tile_size);
        let x_near2 = Math.round((obj.loc.x + offset) / tile_size);

        let top1 = get_tile(x_near1, t_y_up);
        let top2 = get_tile(x_near2, t_y_up);
        let bottom1 = get_tile(x_near1, t_y_down);
        let bottom2 = get_tile(x_near2, t_y_down);
        let left1 = get_tile(t_x_left, y_near1);
        let left2 = get_tile(t_x_left, y_near2);
        let right1 = get_tile(t_x_right, y_near1);
        let right2 = get_tile(t_x_right, y_near2);

        return ((left1.solid && left2.solid) ||
            (right1.solid && right2.solid) ||
            (top1.solid && top2.solid) ||
            (bottom1.solid && bottom2.solid));
    }

    /**
     * 检查obj是否出了地图边界
     * @param {{current_mapId: Number, loc: {x: Number, y: Number}}} obj
     * @return {Boolean}
     */
    fallenCheck = function(obj) {
        let _this = (this);
        let current_map = _this.maps[obj.current_mapId];
        let tile_size = current_map.tile_size;
        return (obj.loc.y > current_map.height_p + MAP_BOUNDARY_UNIT.y * tile_size ||
            obj.loc.y < -MAP_BOUNDARY_UNIT.y * tile_size ||
            obj.loc.x < -MAP_BOUNDARY_UNIT.x * tile_size ||
            obj.loc.x > current_map.width_p + MAP_BOUNDARY_UNIT.x * tile_size);
    }


    /**
     * 负责处理玩家的移动, 确定最终位置
     * @param {Player} player 玩家
     */
    move_player = function(player) {

        if (player.chara.state.condtion != "normal") {
            switch (player.chara.state.condtion) {
                case "fallen":
                    if (player.chara.state.timer_current > player.chara.state.timer_end) {
                        player.chara.state.condtion = "normal";
                        this.teleport_player_to_savePoint(player);
                    } else {
                        player.chara.state.timer_current = new Date().getTime();
                    }
                    break;
                default:
                    break;
            }
            return;
        }


        let _this = (this);

        // TODO: 是否需要提前将移动产生的加速度加到速度上
        let tX = player.chara.loc.x + player.chara.vel.x;
        let tY = player.chara.loc.y + player.chara.vel.y;

        let get_tile = this.get_tile_from_mapId(player.chara.current_mapId);
        let current_map = _this.maps[player.chara.current_mapId];
        let tile_size = current_map.tile_size;
        let offset = Math.round((tile_size / 2) - 1);

        let tile = get_tile(
            Math.round(player.chara.loc.x / tile_size),
            Math.round(player.chara.loc.y / tile_size)
        );

        player.chara.acc.x += tile.gravity ? tile.gravity.x : current_map.gravity.x;
        player.chara.acc.y += tile.gravity ? tile.gravity.y : current_map.gravity.y;

        // if (tile.acceleration) {
        //     player.chara.vel.x *= tile.acceleration.x;
        //     player.chara.vel.y *= tile.acceleration.y;
        // }

        let t_y_up = Math.floor(tY / tile_size);
        let t_y_down = Math.ceil(tY / tile_size);
        let y_near1 = Math.round((player.chara.loc.y - offset) / tile_size);
        let y_near2 = Math.round((player.chara.loc.y + offset) / tile_size);

        let t_x_left = Math.floor(tX / tile_size);
        let t_x_right = Math.ceil(tX / tile_size);
        let x_near1 = Math.round((player.chara.loc.x - offset) / tile_size);
        let x_near2 = Math.round((player.chara.loc.x + offset) / tile_size);

        let top1 = get_tile(x_near1, t_y_up);
        let top2 = get_tile(x_near2, t_y_up);
        let bottom1 = get_tile(x_near1, t_y_down);
        let bottom2 = get_tile(x_near2, t_y_down);
        let left1 = get_tile(t_x_left, y_near1);
        let left2 = get_tile(t_x_left, y_near2);
        let left3 = get_tile(t_x_left - 1, y_near1);
        let left4 = get_tile(t_x_left - 1, y_near2);
        let right1 = get_tile(t_x_right, y_near1);
        let right2 = get_tile(t_x_right, y_near2);
        let right3 = get_tile(t_x_right + 1, y_near1);
        let right4 = get_tile(t_x_right + 1, y_near2);

        // 摩擦系数导致的加速度 a = -μg
        if (player.chara.vel.y > 0 && player.chara.acc.y > 0) {
            let friction1 = bottom1.friction ? bottom1.friction.x : 0;
            let friction2 = bottom2.friction ? bottom2.friction.x : 0;
            let frictionX = (friction1 + friction2) / 2;
            let a = frictionX * player.chara.acc.y;
            if (Math.abs(player.chara.vel.x) > VEL_STILL)
                player.chara.acc.x -= a * Math.sign(player.chara.vel.x);
        }

        if (player.chara.vel.y < 0 && player.chara.acc.y < 0) {
            let friction1 = top1.friction ? top1.friction.x : 0;
            let friction2 = top2.friction ? top2.friction.x : 0;
            let frictionX = (friction1 + friction2) / 2;
            let a = frictionX * Math.abs(player.chara.acc.y);
            if (Math.abs(player.chara.vel.x) > VEL_STILL)
                player.chara.acc.x -= a * Math.sign(player.chara.vel.x);
        }

        if (player.chara.vel.x > 0 && player.chara.acc.x > 0) {
            let friction3 = right1.friction ? right1.friction.y : 0;
            let friction4 = right2.friction ? right2.friction.y : 0;
            let frictionY = (friction3 + friction4) / 2;
            let a = frictionY * player.chara.acc.x;
            if (Math.abs(player.chara.vel.y) > VEL_STILL)
                player.chara.acc.y -= a * Math.sign(player.chara.vel.y);
        }

        if (player.chara.vel.x < 0 && player.chara.acc.x < 0) {
            let friction3 = left1.friction ? left1.friction.y : 0;
            let friction4 = left2.friction ? left2.friction.y : 0;
            let frictionY = (friction3 + friction4) / 2;
            let a = frictionY * Math.abs(player.chara.acc.x);
            if (Math.abs(player.chara.vel.y) > VEL_STILL)
                player.chara.acc.y -= a * Math.sign(player.chara.vel.y);
        }

        if (tile.jump && player.jump_switch > 15) {

            player.chara.can_jump = true;
            player.chara.doublejumpFlag = false;
            player.chara.can_doublejump = true;

            player.chara.can_dash = true;

            player.jump_switch = 0;

        } else player.jump_switch++;

        // 普通方式的速度修改在这里结算
        player.chara.vel.x += player.chara.acc.x;
        player.chara.vel.y += player.chara.acc.y;
        player.chara.vel.x = Math.min(Math.max(player.chara.vel.x, -current_map.vel_limit.x), current_map.vel_limit.x);
        player.chara.vel.y = Math.min(Math.max(player.chara.vel.y, -current_map.vel_limit.y), current_map.vel_limit.y);
        if (Math.abs(player.chara.vel.x) < VEL_STILL) player.chara.vel.x = 0;
        if (Math.abs(player.chara.vel.y) < VEL_STILL) player.chara.vel.y = 0;

        /* dash技能处理 */
        if (left1.solid || left2.solid || right1.solid || right2.solid || left3.solid || left4.solid || right3.solid || right4.solid) { player.dash_switch = 0; }
        if (player.dash_switch > 0) {
            player.chara.vel.x = 2.5 * player.chara.vel_limit.x * Math.sign(player.chara.vel.x);
            player.dash_switch--;
        }

        /* float技能处理 */
        // TODO: 还有一些问题, 有空再处理
        if (player.chara.float_ability && player.chara.can_float && player.key.key_k == true) {
            for (let p = -3; p < 3; p++) {
                for (let q = -2; q < 4; q++) {
                    let localTile = get_tile(t_x_left + q, t_y_up + p);
                    if (localTile.solid) { continue; }
                    if (!(current_map.data[t_y_up + p] && current_map.data[t_y_up + p][t_x_left + q])) { continue; }
                    current_map.data[t_y_up + p][t_x_left + q] = deepCopy({ colour: '#EADBC5', solid: 0, gravity: { x: 0, y: -0.3 } });
                    //colour: '#EADBC5', solid: 0, gravity: { x: 0, y: -0.3 }
                }
            }
            player.chara.can_float = false;
            player.chara.can_dash = true;
            player.chara.can_jump = true;
            player.chara.can_doublejump = true;
            player.chara.doublejumpFlag = false;
        }

        /* 瓷砖反弹 */
        if (left1.solid || left2.solid || right1.solid || right2.solid) {
            let bounceX = 0;

            if (left1.solid && left1.bounce > bounceX) bounceX = left1.bounce;
            if (left2.solid && left2.bounce > bounceX) bounceX = left2.bounce;
            if (right1.solid && right1.bounce > bounceX) bounceX = right1.bounce;
            if (right2.solid && right2.bounce > bounceX) bounceX = right2.bounce;

            player.chara.vel.x *= -bounceX || 0;
        }
        if (top1.solid || top2.solid || bottom1.solid || bottom2.solid) {
            let bounceY = 0;

            if (top1.solid && top1.bounce > bounceY) bounceY = top1.bounce;
            if (top2.solid && top2.bounce > bounceY) bounceY = top2.bounce;
            if (bottom1.solid && bottom1.bounce > bounceY) bounceY = bottom1.bounce;
            if (bottom2.solid && bottom2.bounce > bounceY) bounceY = bottom2.bounce;

            player.chara.vel.y *= -bounceY || 0;
        }
        /* 速度结算, 得到下一个理想位置 */
        player.chara.loc.x += player.chara.vel.x;
        player.chara.loc.y += player.chara.vel.y;

        /* 出图判断 */
        if (this.fallenCheck(player.chara)) {

            // player坠落死亡
            player.chara.state.hp -= FALLEN_DAMAGE;
            player.chara.state.condtion = "fallen";
            player.chara.state.timer_end = this.maps[player.chara.current_mapId].reviveCooldown + new Date().getTime();
            player.chara.state.timer_begin = new Date().getTime();
            player.chara.state.timer_current = new Date().getTime();
            return;
        }

        if (left1.solid || left2.solid || right1.solid || right2.solid) {

            /* 解决重叠 */

            while (get_tile(Math.floor(player.chara.loc.x / tile_size), y_near1).solid ||
                get_tile(Math.floor(player.chara.loc.x / tile_size), y_near2).solid)
                player.chara.loc.x += 0.1;

            while (get_tile(Math.ceil(player.chara.loc.x / tile_size), y_near1).solid ||
                get_tile(Math.ceil(player.chara.loc.x / tile_size), y_near2).solid)
                player.chara.loc.x -= 0.1;

        }

        if (top1.solid || top2.solid || bottom1.solid || bottom2.solid) {

            /* 解决重叠 */

            while (get_tile(x_near1, Math.floor(player.chara.loc.y / tile_size)).solid ||
                get_tile(x_near2, Math.floor(player.chara.loc.y / tile_size)).solid)
                player.chara.loc.y += 0.1;

            while (get_tile(x_near1, Math.ceil(player.chara.loc.y / tile_size)).solid ||
                get_tile(x_near2, Math.ceil(player.chara.loc.y / tile_size)).solid)
                player.chara.loc.y -= 0.1;

            /* 着地判断 */
            if ((bottom1.solid || bottom2.solid) && !tile.jump) {

                player.chara.on_floor = true;
                player.chara.can_jump = true;
                player.chara.can_doublejump = true;
                player.chara.doublejumpFlag = false;

                player.chara.can_dash = true;

            }

        }

        // 脚本处理
        if (player.last_tile != tile.id && tile.script) {
            // 如果当前的tile与上一个不同, 则执行这个tile的脚本
            this.map_script(player, tile.script);
        }
        player.last_tile = tile.id;

        // 如果当前地图有trap, 则执行
        if (typeof current_map.trap === "function") current_map.trap();
    }

    /**
     * 处理玩家的按键操作, 转化为函数调用
     * @param {Player} player 玩家
     */
    update_player = function(player) {
        // 负责通过玩家按键来确定当前的速度和技能使用
        let _this = (this);
        let current_map = _this.maps[player.chara.current_mapId];
        player.chara.acc = { x: 0, y: 0 };
        player.chara.aimer = { x: player.key.mouseX, y: player.key.mouseY };

        // console.log(`player update\nposition: (${player.chara.loc.x},${player.chara.loc.y}); velocity: (${player.chara.vel.x},${player.chara.vel.y})`);

        // 移动相关

        if (player.key.left) {
            // 玩家自身的速度限制优先于地图速度限制
            if (player.chara.vel.x > -player.chara.vel_limit.x && player.chara.vel.x > -current_map.vel_limit.x)
                player.chara.acc.x -= player.chara.speed.left;
        }
        if (player.key.up) {
            if (player.chara.can_jump && !player.chara.doublejumpFlag && player.chara.can_doublejump && player.chara.vel.y > -player.chara.vel_limit.y && player.chara.vel.y > -current_map.vel_limit.y) {

                player.chara.vel.y -= player.chara.speed.jump;
                player.chara.can_jump = false;

                player.jump_switch = 0; // TODO: jump_switch 的作用分析和优化
            }
            if (player.chara.doublejump_ability && !player.chara.can_jump && player.chara.doublejumpFlag && player.chara.can_doublejump && player.chara.vel.y > -player.chara.vel_limit.y && player.chara.vel.y > -current_map.vel_limit.y && player.jump_switch > 20) {

                player.chara.vel.y *= 0.8;
                player.chara.vel.y -= current_map.movement_speed.jump;
                player.chara.can_doublejump = false;
            }
        } else {
            if (!player.chara.can_jump && !player.chara.doublejumpFlag && player.chara.can_doublejump || player.chara.can_jump && player.chara.doublejumpFlag && player.chara.can_doublejump) player.chara.doublejumpFlag = true;
            player.jump_switch++;
        }
        if (player.key.right) {
            if (player.chara.vel.x < player.chara.vel_limit.x && player.chara.vel.x < current_map.vel_limit.x)
                player.chara.acc.x += player.chara.speed.right;
        }
        if (player.key.down && player.chara.glide_ability) {

            player.chara.vel.y *= 0.8;
            player.chara.gliding = true;
        } else {
            player.chara.gliding = false;
        }
        if (player.key.key_j && player.chara.dash_ability && player.chara.can_dash) {
            player.chara.can_dash = false;
            player.dash_switch = 5;
        }
        if (player.key.key_k && player.chara.float_ability && player.chara.can_float) {
            player.chara.can_float = false;
        }

        // 行动相关
        if (player.key.mouse_l) {
            // 射击
            // TODO: 能否攻击的判断(涉及到reload)
            if (true) {
                // 生成一颗子弹
                let bullet = new Bullet(player);
                if (bulletDic[player.chara.current_mapId]) {
                    bulletDic[player.chara.current_mapId].push(bullet);
                } else {
                    bulletDic[player.chara.current_mapId] = [bullet];
                }
            }
        }

        this.move_player(player);
    }

    /**
     * 处理子弹的移动
     * @param {Bullet} bullet 子弹
     */
    move_bullet = function(bullet) {
        let _this = (this);
        let current_map = _this.maps[bullet.current_mapId];
        bullet.update(current_map.gravity);
        if (this.collisionCheck(bullet) || this.fallenCheck(bullet)) {
            // 删除子弹, 释放内存
            bulletDic[bullet.current_mapId].splice(bulletDic[bullet.current_mapId].indexOf(bullet), 1);
            bullet = null;
        }
        // todo: 展望: 对于特殊子弹, 需要判断撞墙是否弹跳等...
    }

    update = function() {
        for (let player in playerDic) {
            game.update_player(playerDic[player]);
        }
        let count = 0;
        bulletDic.forEach((bulletListInMap, mapId) => {
            bulletListInMap.forEach(bullet => {
                this.move_bullet(bullet);
                count++;
            });
        });
    }

    broadcast = function() {
        // client端: game.draw(ctx, data.map_id, data.players);
        let _this = (this);
        let allCharas = Object.values(playerDic).map((player) => player.chara);
        let data = {
            map_id: 0,
            players: [],
            items: [],
            bullets: [],
            time: new Date().getTime()
        }

        // 提前按地图将三个数组分类
        let dic = {};
        _this.maps.forEach(map => {
            let map_id = map.mapId;
            dic[map_id] = {
                players: allCharas.filter((player) => player.current_mapId == map_id),
                items: [],
                bullets: bulletDic[map_id] || [],
            };
        });

        wss.clients.forEach(function(client) {
            // 获取client的ip
            let thisIp = client._socket.remoteAddress;
            if (!playerDic[thisIp]) return;
            data.map_id = playerDic[thisIp].chara.current_mapId;
            data.players = dic[data.map_id].players;
            data.items = dic[data.map_id].items;
            data.bullets = dic[data.map_id].bullets;
            // 将自己放到数组的第一个位置
            let index = data.players.findIndex((player) => player.ip === thisIp);
            if (index != -1) {
                data.players.unshift(data.players.splice(index, 1)[0]);
            } else { console.log(`broadcast函数中: IP为${thisIp}的玩家没找到本人`); }

            let message = JSON.stringify(data);
            client.send(message);
        })
    }


}

let game = new GAME();
// game.load_map();

setInterval(() => {
    game.update();
    game.broadcast();
}, 1000 / 70);

const wss_file = new WebSocketServer({
    host: '0.0.0.0',
    port: 4320
});

wss_file.on('connection', function(ws) {
    console.log(`file client ${ws._socket.remoteAddress} connected`);
    ws.on('message', function(message) {
        let mapId = JSON.parse(message).map_id;
        let map = game.maps[mapId];
        ws.send(JSON.stringify(map));
    })
    ws.on('close', function() {
        console.log(`file client ${ws._socket.remoteAddress} disconnected`);
    })
})