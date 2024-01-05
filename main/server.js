console.log('Server.js 开始运行');

const fs = require('fs');
const WebSocketServer = require('ws').Server;
// const tween = require('tween.js');

//初始化websocket
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

const playerDic = {};

wss.on('connection', function(ws) {

    console.log(`client ${ws._socket.remoteAddress} connected`);

    // div: 在playerDic中记录
    let ip = ws._socket.remoteAddress;
    playerDic[ip] = {
        key: {
            left: false,
            right: false,
            up: false,
            down: false,
            key_j: false,
            key_k: false
        },
        chara: {

            loc: {
                x: 0,
                y: 0
            },

            vel: {
                x: 0,
                y: 0
            },

            name: "defaultPlayer",
            colour: '#000',
            current_mapId: 0,

            can_jump: true,
            doublejumpFlag: false,
            can_doublejump: true,

            can_dash: true,

            gliding: false,

            doublejump_ability: true,
            glide_ability: true,
            dash_ability: true,
            float_ability: true,

            buff: [{}],
            equipment: {
                club: {},
                heart: {},
                spade: {},
                diamond: {},
            },

            state: {
                hp: 30,
                mp: 10,
                hp_max: 30,
                mp_max: 10,
                money: 0,
                condtion: "normal",
                timer: 0,
            },
            ip: ip,
        },
        ws: ws
    }

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
        // todo: 有改动
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

    get_tile_from_id = function(mapId) {
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

    move_player = function(player) {

        if (player.chara.state.condtion != "normal") {
            switch (player.chara.state.condtion) {
                case "fallen":
                    if (player.chara.state.timer < new Date().getTime()) {
                        player.chara.state.condtion = "normal";
                        this.teleport_player_to_savePoint(player);
                    }
                    break;
                default:
                    break;
            }
            return;
        }


        let _this = (this);

        let tX = player.chara.loc.x + player.chara.vel.x;
        let tY = player.chara.loc.y + player.chara.vel.y;

        let offset = Math.round((this.tile_size / 2) - 1);

        let get_tile = this.get_tile_from_id(player.chara.current_mapId);
        let current_map = _this.maps[player.chara.current_mapId];

        let tile = get_tile(
            Math.round(player.chara.loc.x / this.tile_size),
            Math.round(player.chara.loc.y / this.tile_size)
        );

        if (tile.gravity) {

            player.chara.vel.x += tile.gravity.x;
            player.chara.vel.y += tile.gravity.y;

        } else {

            player.chara.vel.x += current_map.gravity.x;
            player.chara.vel.y += current_map.gravity.y;
        }

        if (tile.friction) {

            player.chara.vel.x *= tile.friction.x;
            player.chara.vel.y *= tile.friction.y;
        }

        let t_y_up = Math.floor(tY / this.tile_size);
        let t_y_down = Math.ceil(tY / this.tile_size);
        let y_near1 = Math.round((player.chara.loc.y - offset) / this.tile_size);
        let y_near2 = Math.round((player.chara.loc.y + offset) / this.tile_size);

        let t_x_left = Math.floor(tX / this.tile_size);
        let t_x_right = Math.ceil(tX / this.tile_size);
        let x_near1 = Math.round((player.chara.loc.x - offset) / this.tile_size);
        let x_near2 = Math.round((player.chara.loc.x + offset) / this.tile_size);

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


        if (tile.jump && player.jump_switch > 15) {

            player.chara.can_jump = true;
            player.chara.doublejumpFlag = false;
            player.chara.can_doublejump = true;

            player.chara.can_dash = true;

            player.jump_switch = 0;

        } else player.jump_switch++;

        player.chara.vel.x = Math.min(Math.max(player.chara.vel.x, -current_map.vel_limit.x), current_map.vel_limit.x);
        player.chara.vel.y = Math.min(Math.max(player.chara.vel.y, -current_map.vel_limit.y), current_map.vel_limit.y);

        /* dash技能处理 */
        if (left1.solid || left2.solid || right1.solid || right2.solid || left3.solid || left4.solid || right3.solid || right4.solid) { player.dash_switch = 0; }
        if (player.dash_switch > 0) {
            player.chara.vel.x = player.key.left ? -10 : 10;
            player.dash_switch--;
        }

        /* float技能处理 */
        // todo: 还有一些问题, 有空再处理
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

        /* 坠落判断 */
        if (player.chara.loc.y > current_map.height_p + 100) {
            // player坠落死亡
            player.chara.state.hp -= 2;
            player.chara.state.condtion = "fallen";
            player.chara.state.timer = 3000 + new Date().getTime();
            return;
        }

        player.chara.loc.x += player.chara.vel.x;
        player.chara.loc.y += player.chara.vel.y;

        player.chara.vel.x *= .9;

        if (left1.solid || left2.solid || right1.solid || right2.solid) {

            /* 解决重叠 */

            while (get_tile(Math.floor(player.chara.loc.x / this.tile_size), y_near1).solid ||
                get_tile(Math.floor(player.chara.loc.x / this.tile_size), y_near2).solid)
                player.chara.loc.x += 0.1;

            while (get_tile(Math.ceil(player.chara.loc.x / this.tile_size), y_near1).solid ||
                get_tile(Math.ceil(player.chara.loc.x / this.tile_size), y_near2).solid)
                player.chara.loc.x -= 0.1;

            /* 瓷砖反弹 */

            let bounce = 0;

            if (left1.solid && left1.bounce > bounce) bounce = left1.bounce;
            if (left2.solid && left2.bounce > bounce) bounce = left2.bounce;
            if (right1.solid && right1.bounce > bounce) bounce = right1.bounce;
            if (right2.solid && right2.bounce > bounce) bounce = right2.bounce;

            player.chara.vel.x *= -bounce || 0;

        }

        if (top1.solid || top2.solid || bottom1.solid || bottom2.solid) {

            /* 解决重叠 */

            while (get_tile(x_near1, Math.floor(player.chara.loc.y / this.tile_size)).solid ||
                get_tile(x_near2, Math.floor(player.chara.loc.y / this.tile_size)).solid)
                player.chara.loc.y += 0.1;

            while (get_tile(x_near1, Math.ceil(player.chara.loc.y / this.tile_size)).solid ||
                get_tile(x_near2, Math.ceil(player.chara.loc.y / this.tile_size)).solid)
                player.chara.loc.y -= 0.1;

            /* 瓷砖反弹 */

            let bounce = 0;

            if (top1.solid && top1.bounce > bounce) bounce = top1.bounce;
            if (top2.solid && top2.bounce > bounce) bounce = top2.bounce;
            if (bottom1.solid && bottom1.bounce > bounce) bounce = bottom1.bounce;
            if (bottom2.solid && bottom2.bounce > bounce) bounce = bottom2.bounce;

            player.chara.vel.y *= -bounce || 0;

            if ((bottom1.solid || bottom2.solid) && !tile.jump) {

                player.chara.on_floor = true;
                player.chara.can_jump = true;
                player.chara.can_doublejump = true;
                player.chara.doublejumpFlag = false;

                player.chara.can_dash = true;

            }

        }

        if (player.last_tile != tile.id && tile.script) {
            // 如果当前的tile与上一个不同, 则执行这个tile的脚本
            this.map_script(player, tile.script);
        }

        player.last_tile = tile.id;

        // 如果当前地图有trap, 则执行
        if (typeof current_map.trap === "function") current_map.trap();
    }

    update_player = function(player) {
        // 负责通过玩家按键来确定当前的速度和技能使用
        let _this = (this);
        let current_map = _this.maps[player.chara.current_mapId];

        // console.log(`player update\nposition: (${player.chara.loc.x},${player.chara.loc.y}); velocity: (${player.chara.vel.x},${player.chara.vel.y})`);

        if (player.key.left) {

            if (player.chara.vel.x > -current_map.vel_limit.x)
                player.chara.vel.x -= current_map.movement_speed.left;
        }
        if (player.key.up) {
            if (player.chara.can_jump && !player.chara.doublejumpFlag && player.chara.can_doublejump && player.chara.vel.y > -current_map.vel_limit.y) {

                player.chara.vel.y -= current_map.movement_speed.jump;
                player.chara.can_jump = false;

                player.jump_switch = 0;
            }
            if (player.chara.doublejump_ability && !player.chara.can_jump && player.chara.doublejumpFlag && player.chara.can_doublejump && player.chara.vel.y > -current_map.vel_limit.y && player.jump_switch > 20) {

                player.chara.vel.y *= 0.8;
                player.chara.vel.y -= current_map.movement_speed.jump;
                player.chara.can_doublejump = false;
            }
        } else {
            if (!player.chara.can_jump && !player.chara.doublejumpFlag && player.chara.can_doublejump || player.chara.can_jump && player.chara.doublejumpFlag && player.chara.can_doublejump) player.chara.doublejumpFlag = true;
            player.jump_switch++;
        }
        if (player.key.right) {

            if (player.chara.vel.x < current_map.vel_limit.x)
                player.chara.vel.x += current_map.movement_speed.left;
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

        this.move_player(player);
    }

    update = function() {
        for (let player in playerDic) {
            game.update_player(playerDic[player]);
        }
    }

    broadcast = function() {
        // client端: game.draw(ctx, data.map_id, data.players);
        let _this = (this);
        let allPlayers = Object.values(playerDic).map((player) => player.chara);
        let data = {
            map_id: 0,
            players: [],
            time: new Date().getTime()
        }
        wss.clients.forEach(function(client) {
            // 获取client的ip
            let thisIp = client._socket.remoteAddress;
            if (!playerDic[thisIp]) return;
            data.map_id = playerDic[thisIp].chara.current_mapId;
            data.players = allPlayers.filter((player) => player.current_mapId == data.map_id);
            let index = data.players.findIndex((player) => player.ip === thisIp);
            if (index != -1) {
                // 将自身移动到数组的第一个位置
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