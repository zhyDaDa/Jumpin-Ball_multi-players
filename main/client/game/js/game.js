// 渲染常量
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
// 物理常量
const defaultPlayerSize = 16; // 玩家的默认尺寸
const defaultHitBoxSize = 10; // 玩家的默认碰撞箱尺寸
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
 * @return {Object.<string, number>}
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
    "BULLET_TYPE_GOLD",
    "BULLET_TYPE_SUPER",
    "BULLET_TYPE_EXPLOSIVE",
    "BULLET_TYPE_LASER",
    "SHAPE_CIRCLE",
    "SHAPE_RECT",
    "SHAPE_TRIANGLE",
    "ITEM_TYPE_SPADE", "ITEM_TYPE_CLUB", "ITEM_TYPE_HEART", "ITEM_TYPE_DIAMOND",
    "ITEM_CLASS_WHITE", "ITEM_CLASS_BLACK",
    "ITEM_STATE_WILD", "ITEM_STATE_EQUIPPED", "ITEM_STATE_SHOP",
];
/**
 * @readonly
 * @enum {number}
 */
const enums = createConstants(..._enumConstants);

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

/**
 * 获得两个{x,y}之间的距离
 * @param {{x:Number, y:Number}} A
 * @param {{x:Number, y:Number}} B
 * @returns {Number}
 */
const getDistance = function(A, B) {
    return Math.sqrt(Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2));
}

/**
 * 物理引擎
 */
class Engine {
    constructor() {
        this.alert_errors = false;
        this.log_info = true;
        this.tile_size = 16;
        this.maps = [];
    }

    /**
     * 输入压缩的地图数据, 转存在engine的maps中
     * @param {Object} mapData 压缩的地图数据
     * @return {Boolean} 是否成功加载
     */
    load_map(mapData) {
        try {
            let m = new MapData(mapData);
            m.zip();
            this.maps[m.mapId] = m;
            return true;
        } catch (e) {
            console.error("Engine类加载地图时遇到报错\n" + e);
        }
    }

    get_tile_from_mapId(mapId) {
        let _this = (this)
        return function(x, y) {
            return _this.maps[mapId].getTile(x, y);
        };
    }

    /** x,y为原始坐标 */
    teleport_player(player, x, y, mapId) {
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

    teleport_player_to_savePoint(player) {
        // 存档点就是地图默认玩家位置
        let current_map = this.maps[player.chara.current_mapId];
        this.teleport_player(player, current_map.playerCheckPoint.x * current_map.tile_size, current_map.playerCheckPoint.y * current_map.tile_size, player.chara.current_mapId);
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
    collisionCheck(obj) {
        let _this = (this);
        let current_map = _this.maps[obj.current_mapId];
        let tile_size = current_map.tile_size;
        let offset = Math.round((obj.size / 2) - 1);

        let relative_X = obj.loc.x + tile_size / 2;
        let relative_Y = obj.loc.y + tile_size / 2;

        let get_tile = this.get_tile_from_mapId(obj.current_mapId);

        let left = get_tile((relative_X - offset) / tile_size, relative_Y / tile_size);
        let right = get_tile((relative_X + offset) / tile_size, relative_Y / tile_size);
        let top = get_tile(relative_X / tile_size, (relative_Y - offset) / tile_size);
        let bottom = get_tile(relative_X / tile_size, (relative_Y + offset) / tile_size);

        return left.solid || right.solid || top.solid || bottom.solid;
    }

    /**
     * 检查obj是否出了地图边界
     * 默认使用原始坐标, 也可以传入true来使用数字坐标
     * @param {{current_mapId: Number, loc: {x: Number, y: Number}}} obj
     * @param {Boolean} isDigit 是否使用数字坐标
     * @return {Boolean}
     */
    fallenCheck(obj, isDigit = false) {
        let _this = (this);
        let current_map = _this.maps[obj.current_mapId];
        let tile_size = current_map.tile_size;
        let s = isDigit ? tile_size : 1;
        return (obj.loc.y > (current_map.height + MAP_BOUNDARY_UNIT.y) * s ||
            obj.loc.y < -MAP_BOUNDARY_UNIT.y * s ||
            obj.loc.x < -MAP_BOUNDARY_UNIT.x * s ||
            obj.loc.x > (current_map.width + MAP_BOUNDARY_UNIT.x) * s);
    }

    abilityRefresh(player) {
        player.chara.can_jump = true;
        player.chara.doublejumpFlag = false;
        player.chara.can_doublejump = true;

        player.chara.can_dash = true;
    }

    /**
     * 负责处理玩家的移动, 确定最终位置
     * @param {Player} player 玩家
     */
    move_player(player) {
        /* div:异常状态判定 */
        if (player.chara.state.condtion != "normal") {
            player.chara.state.timer_current = new Date().getTime();
            switch (player.chara.state.condtion) {
                case "fallen":
                    if (player.chara.state.timer_current > player.chara.state.timer_end) {
                        player.chara.state.condtion = "normal";
                        this.teleport_player_to_savePoint(player);
                    }
                    break;
                case "dead":
                    if (player.chara.state.timer_current > player.chara.state.timer_end) {
                        player.chara.state.condtion = "normal";
                        player.chara.state.hp = player.chara.state.hp_max;
                        this.teleport_player_to_savePoint(player);
                    }
                    break;
                default:
                    break;
            }
            return;
        }

        if (player.chara.state.hp <= 0) {
            // 玩家状态由normal变为dead, 视为死亡
            player.chara.state.hp = 0;
            player.chara.state.condtion = "dead";
            player.chara.state.timer_end = this.maps[player.chara.current_mapId].reviveCooldown + new Date().getTime();
            player.chara.state.timer_begin = new Date().getTime();
            player.chara.state.timer_current = new Date().getTime();

            // 死亡掉落
            player.chara.dropItem(player.chara.equipment.spade[0]);
            return;
        }

        /* div:物理信息获取 */
        let _this = (this);

        // TODO: 由于玩家和砖块大小一致, 所以不用考虑anchor点的差距, 实际上还是要算上size/2的偏差
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
        if (player.chara.float_ability && player.chara.can_float && player.key.float == true) {
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
        if (this.fallenCheck(player.chara, true)) {
            // player坠落死亡
            player.chara.state.hp -= FALLEN_DAMAGE;
            player.chara.state.condtion = "fallen";
            player.chara.state.timer_end = this.maps[player.chara.current_mapId].reviveCooldown + new Date().getTime();
            player.chara.state.timer_begin = new Date().getTime();
            player.chara.state.timer_current = new Date().getTime();
            return;
        }

        if ((left1.jump || left2.jump || right1.jump || right2.jump) && player.jump_switch > 15) {
            engine.abilityRefresh(player);
            player.jump_switch = 0;

        } else player.jump_switch++;

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
            if ((bottom1.solid || bottom2.solid)) {
                // player.chara.on_floor = true; // TODO: 若有需要的话还要额外补充不在floor的情况
                engine.abilityRefresh(player);
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
     * 处理robo, 模拟玩家控件的行为
     * @param {Player} player 玩家
     */
    update_robo(player) {
        if (player.chara.vel.x > 0) {
            player.key.left = false;
            player.key.right = true;
        } else {
            player.key.left = true;
            player.key.right = false;
        }

    }

    /**
     * 更新所有item
     * @param {Item} item
     */
    update_item(item) {
        switch (item.state) {
            case enums.ITEM_STATE_WILD:
                break;
            case enums.ITEM_STATE_SHOP:
                break;
            case enums.ITEM_STATE_EQUIPPED:
                item.mapId = playerDic[item.belongerIp].chara.current_mapId;
                item.update();
                break;
        }
    }

    update_items() {
            for (let item in Object.values(itemDic)) {
                this.update_item(item);
            }
        }
        /**
         * 处理玩家的按键操作, 转化为函数调用
         * @param {Player} player 玩家
         */
    update_player(player) {
        player.time = new Date().getTime();
        if (player.isRobo) {
            this.update_robo(player);
        }
        // 负责通过玩家按键来确定当前的速度和技能使用
        let _this = (this);
        let current_map = _this.maps[player.chara.current_mapId];
        player.chara.acc = { x: 0, y: 0 };
        player.chara.aimer = { x: player.key.mouseX, y: player.key.mouseY };

        // console.log(`player update\nposition: (${player.chara.loc.x},${player.chara.loc.y}); velocity: (${player.chara.vel.x},${player.chara.vel.y})`);

        /* 移动相关 */

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
        if (player.key.dash && player.chara.dash_ability && player.chara.can_dash) {
            player.chara.can_dash = false;
            player.dash_switch = 5;
        }
        // if (player.key.pick && player.chara.float_ability && player.chara.can_float) {
        //     player.chara.can_float = false;
        // }

        /* 行动相关 */
        // 攻击
        if (player.key.mouse_l) {
            // 射击
            let spade = player.chara.equipment.spade[0];
            if (spade) {
                // 1. 有子弹 2. 不在"reloading"状态 3. delay 之后
                if (spade.ammo < 1) {
                    // 提醒玩家reload
                } else if (spade.fireState == "reloading") {
                    // 提醒玩家正在reload
                } else if (player.time < spade.lastfire + spade.delay) {
                    // 提醒玩家需要等待
                } else { // 能生成一颗子弹
                    let bullet = new Bullet(player);
                    if (bulletDic[player.chara.current_mapId]) {
                        bulletDic[player.chara.current_mapId].push(bullet);
                    } else {
                        bulletDic[player.chara.current_mapId] = [bullet];
                    }

                    spade.ammo--;
                    spade.lastfire = player.time;
                    spade.fireState = "firing";
                }
            }
        }
        // 装填
        if (player.key.reload) {
            let spade = player.chara.equipment.spade[0];
            if (spade && spade.ammo < spade.ammo_max && spade.fireState != "reloading") {
                // 开始reload
                spade.fireState = "reloading";
                spade.startReload = spade.time;
            }
        }
        // 拾取
        if (!player.pick_switch && player.key.pick) {
            console.log("can pick");
            // 检查当前位置是否有道具
            let items = Object.values(itemDic).filter(item => item.mapId == player.chara.current_mapId && item.state != enums.ITEM_STATE_EQUIPPED);
            items.forEach(item => {
                console.log(`${item.name} at (${item.pos.x},${item.pos.y}), distance: ${getDistance(item.pos, player.chara.getDigitPosition(this))}`);
                if (getDistance(item.pos, player.chara.getDigitPosition(this)) < player.chara.pickRange) {
                    // 拾取道具
                    // console.log(`玩家${player.chara.name}拾取了道具${item.name}`);
                    player.chara.pickItem(item);
                }
            });
            player.pick_switch = true;
        } else if (!player.key.pick) player.pick_switch = false;
        // 掉落
        if (!player.drop_switch && player.key.drop) {
            // 掉落道具
            let item = player.chara.equipment.spade[0];
            if (item) {
                player.chara.dropItem(item);
            }
            player.drop_switch = true;
        } else if (!player.key.drop) player.drop_switch = false;
        // 切换武器
        if (!player.switch_switch && player.key.switch) {
            if (player.chara.equipment.spade.length > 1) {
                // 0和1位置的武器互换
                let temp = player.chara.equipment.spade[0];
                player.chara.equipment.spade[0] = player.chara.equipment.spade[1];
                player.chara.equipment.spade[1] = temp;
            }
            player.switch_switch = true;
        } else if (!player.key.switch) player.switch_switch = false;

        this.move_player(player);
    }

    /**
     * 处理子弹的移动
     * @param {Bullet} bullet 子弹
     */
    move_bullet(bullet) {
        let _this = (this);
        let current_map = _this.maps[bullet.current_mapId];
        bullet.update(current_map.gravity);
        if (this.collisionCheck(bullet) || this.fallenCheck(bullet)) {
            bullet.delete();
        }
        // 伤害计算
        // 对于玩家的伤害
        Object.values(playerDic).map(player => {
            if (player.chara.current_mapId != bullet.current_mapId) return;
            if (bullet.owner_ip == player.chara.ip) return;
            let dist = Math.sqrt((player.chara.loc.x - bullet.loc.x) ** 2 + (player.chara.loc.y - bullet.loc.y) ** 2);
            if (dist < player.chara.hitBoxSize / 2 + bullet.size / 2) {
                // 玩家受伤
                switch (bullet.type) {
                    case enums.BULLET_TYPE_NORMAL:
                        if (bullet.attribute.pierce) {
                            player.chara.state.hp -= bullet.damage_slice;
                        } else {
                            player.chara.state.hp -= bullet.damage_direct;
                            bullet.delete();
                        }
                        break;
                    default:
                        player.chara.state.hp -= bullet.damage_direct;
                        bullet.delete();
                }
            }
        });

        // todo: 展望: 对于特殊子弹, 需要判断撞墙是否弹跳等...
    }

    update() {
        bulletDic.forEach((bulletListInMap, mapId) => {
            bulletListInMap.forEach(bullet => {
                this.move_bullet(bullet);
            });
        });
        for (let player in playerDic) {
            this.update_player(playerDic[player]);
        }
        this.update_items();
    }

    /**
     * 作为本地引擎处理, 只计算自己(和自己的子弹)的移动
     */
    updateSelf() {
        for (let bullet in game.player.bullets) {
            this.move_bullet(bullet);
        }
        this.update_player(game.player);
    }

}

/**
 * 用于处理游戏的类, 主要负责渲染和逻辑
 */
class Game {
    constructor() {
        this.alert_errors = false;
        this.log_info = true;
        this.tile_size = 16;
        this.limit_viewport = true;

        this.viewport = {
            x: 200,
            y: 200
        };

        this.camera = {
            x: 0,
            y: 0
        };

        this.camera_movement_limit = { x: 10, y: 8 };

        /**
         * 光标位置是canvas坐标
         */
        this.mouse = { x: 0, y: 0 };

        this.player = new Player();

        this.current_map = null;

        // 用于接收服务器的数据
        this.players = [];
        this.items = [];

        window.onkeydown = this.keydown.bind(this);
        window.onkeyup = this.keyup.bind(this);
        window.onmousemove = this.mouseMove.bind(this);
        window.onmousedown = this.mouseDown.bind(this);
        window.onmouseup = this.mouseUp.bind(this);
    }
    error(message) {
        if (this.alert_errors) alert(message);
        if (this.log_info) console.log(message);
    }
    log(message) {
        if (this.log_info) console.log(message);
    }
    set_viewport(x, y) {
        this.viewport.x = x;
        this.viewport.y = y;
    }
    keydown(e) {
        var _this = this;

        switch (e.keyCode) {
            case 37:
                _this.player.key.left = true;
                break;
            case 65:
                _this.player.key.left = true;
                break;
            case 38:
                _this.player.key.up = true;
                break;
            case 87:
                _this.player.key.up = true;
                break;
            case 39:
                _this.player.key.right = true;
                break;
            case 68:
                _this.player.key.right = true;
                break;
            case 40:
                _this.player.key.down = true;
                break;
            case 83: //s
                _this.player.key.down = true;
                break;
            case 32: //space
                _this.player.key.space = true;
                break;
            case 74: //j
            case 16: //shift
                _this.player.key.dash = true;
                break;
            case 69: //e
                _this.player.key.pick = true;
                break;
            case 71: //g
                _this.player.key.drop = true;
                break;
            case 82: //r
                _this.player.key.reload = true;
                break;
            case 9: //tab
                e.preventDefault();
                _this.player.key.switch = true;
                break;
            default:
                // case 79: //o
                //     this.load_map(0);
                //     break;
        }
    }
    keyup(e) {

        var _this = this;

        switch (e.keyCode) {
            case 37:
                _this.player.key.left = false;
                break;
            case 65:
                _this.player.key.left = false;
                break;
            case 38:
                _this.player.key.up = false;
                break;
            case 87:
                _this.player.key.up = false;
                break;
            case 39:
                _this.player.key.right = false;
                break;
            case 68:
                _this.player.key.right = false;
                break;
            case 40:
                _this.player.key.down = false;
                break;
            case 83:
                _this.player.key.down = false;
                break;
            case 32: //space
                _this.player.key.space = false;
                break;
            case 74: //j
            case 16: //shift
                _this.player.key.dash = false;
                break;
            case 69: //e
                _this.player.key.pick = false;
                break;
            case 71: //g
                _this.player.key.drop = false;
                break;
            case 82: //r
                _this.player.key.reload = false;
                break;
            case 9: //tab
                e.preventDefault();
                _this.player.key.switch = false;
                break;
            default:
        }
    }
    mouseMove(e) {
        const _this = (this);
        // 光标位置是canvas坐标
        _this.mouse = {
            x: e.clientX / zoomIndex,
            y: e.clientY / zoomIndex
        };
        // player.key的mouse是绝对坐标
        _this.player.key.mouseX = _this.mouse.x + _this.camera.x;
        _this.player.key.mouseY = _this.mouse.y + _this.camera.y;
    }
    mouseDown(e) {
        const _this = (this);
        switch (e.button) {
            case 0: //左键
                _this.player.key.mouse_l = true;
                break;
            case 1: //中键
                _this.player.key.mouse_m = true;
                break;
            case 2: //右键
                _this.player.key.mouse_r = true;
                break;
        }
    }
    mouseUp(e) {
        const _this = (this);
        switch (e.button) {
            case 0: //左键
                _this.player.key.mouse_l = false;
                break;
            case 1: //中键
                _this.player.key.mouse_m = false;
                break;
            case 2: //右键
                _this.player.key.mouse_r = false;
                break;
        }
    }

    set_map(mapId) {
        this.current_map = (engine.maps[mapId]);
        this.current_map.unZip();
        if (typeof this.current_map === "undefined") {
            this.error(`Failed to set map to mapId: ${mapId}`);
            return false;
        }

        this.current_map.width_p = this.current_map.width * this.current_map.tile_size;
        this.current_map.height_p = this.current_map.height * this.current_map.tile_size;

        this.log('Successfully loaded map data.');
        return true;
    }
    get_tile(x, y) {
        return (this.current_map.data[y] && this.current_map.data[y][x]) ? deepCopy(this.current_map.data[y][x]) : 0;
    }

    /* div: 渲染相关 */
    draw_tile(x, y, tile, context) {

        if (!tile || !tile.colour) return;

        context.fillStyle = tile.colour;
        context.fillRect(
            x - this.tile_size / 2,
            y - this.tile_size / 2,
            this.tile_size,
            this.tile_size
        );
    }
    draw_map(context) {

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

    }
    draw_items(context, items) {
        for (let item in items) {
            this.draw_item(context, item);
        }
    }
    draw_item(context, item) {
        let x = item.pos.x * this.current_map.tile_size - this.camera.x;
        let y = item.pos.y * this.current_map.tile_size - this.camera.y;

        let len = this.current_map.tile_size * 3 / 4;

        if (picDic[item.pic_src]) {
            let img = new Image();
            img.src = picDic[item.pic_src];
            // 居中绘制 取物品的高度作为参考
            let scale = len / img.height;
            let drawWidth = img.width * scale;
            let drawHeight = img.height * scale;
            context.drawImage(img, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
        } else {
            // 绘制默认图片
            context.fillStyle = "#00000066";
            context.fillRect(x, y, this.tile_size / 2, this.tile_size / 2);
        }
    }
    draw_all_players(context, players) {
        players.forEach(player => {
            this.draw_player(context, player);
        });
    }
    draw_player(context, player) {
        let span = player_info_fontSize * nameMaxLength / 2; // 显示名字的矩形的宽度
        // 绘制圆球本体
        context.fillStyle = player.chara.colour;
        context.beginPath();
        context.arc(
            player.chara.loc.x - this.camera.x,
            player.chara.loc.y - this.camera.y,
            player.chara.size / 2 - 1,
            0,
            Math.PI * 2
        );
        context.fill();
        context.closePath();
        // 绘制特效
        // 静态特效_特殊状态
        if (player.chara.state.condtion == "fallen" || player.chara.state.condtion == "dead") {
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
                player.chara.loc.x - this.camera.x,
                player.chara.loc.y - this.camera.y,
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
                player.chara.loc.x - this.camera.x - span / 4,
                player.chara.loc.y - this.camera.y + this.tile_size / 2 + 8,
                span / 2 * (player.chara.state.timer_current - player.chara.state.timer_begin) / (player.chara.state.timer_end - player.chara.state.timer_begin),
                HPBarHeight);
            context.closePath();
        }

        // 动态特效_悬浮
        if (player.chara.gliding) {
            // 在其上方绘制半圆弧
            context.beginPath();
            context.strokeStyle = "white";
            context.lineWidth = 2;
            let radius = this.tile_size * .5 + 3;
            let c = 2 * Math.PI * radius;
            context.arc(
                player.chara.loc.x - this.camera.x,
                player.chara.loc.y - this.camera.y,
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
        let textWidth = context.measureText(player.chara.name).width;
        // 为了让文字更清晰, 在文字下方画一个白色矩形
        context.beginPath();
        context.fillStyle = "#ffffff66";
        context.fillRect(player.chara.loc.x - this.camera.x - span / 2, player.chara.loc.y - this.camera.y - this.tile_size - player_info_fontSize - 1, span, player_info_fontSize + 2);
        // context.closePath();
        // 居中绘制玩家名字, 黑字白色描边
        context.fillStyle = "black";
        // x方向正中间是 loc.x - camera.x
        // y方向正中间是 loc.y - camera.y
        // 向左挪半个文字宽度, 向上挪一个格子
        context.fillText(
            player.chara.name,
            player.chara.loc.x - this.camera.x - textWidth / 2,
            player.chara.loc.y - this.camera.y - this.tile_size);
        context.closePath();
        // 在最上面绘制血条
        context.beginPath();
        context.fillStyle = HPBarColor;
        context.fillRect(
            player.chara.loc.x - this.camera.x - span / 2,
            player.chara.loc.y - this.camera.y - this.tile_size - player_info_fontSize - HPBarHeight,
            span * player.chara.state.hp / player.chara.state.hp_max,
            HPBarHeight);
        context.closePath();
    }
    draw_cursor(context) {
        const _this = (this);
        // 画出准星, 由四个矩形组成
        if (!this.player.key.mouse_l) {
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
    draw_player_action(context) {
        const _this = (this);

        if (_this.player.key.mouse_r) {
            // 画出玩家和光标的连线, 虚线
            context.beginPath();
            context.strokeStyle = "white";
            context.lineWidth = TRACER_LINE_WIDTH;
            // 表示玩家和光标的canvas坐标
            let p_X = _this.player.chara.loc.x - _this.camera.x;
            let p_Y = _this.player.chara.loc.y - _this.camera.y;
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
    draw_bullets(context, bullets) {
        for (let bullet in bullets) {
            this.draw_bullet(context, bullet);
        }
    }
    draw_bullet(context, bullet) {
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
    drawUI(context) {
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
            this.player.chara.state.hp_max * UI_unitlength + overblood * 2,
            UI_HPBarHeight + overblood * 2);

        context.fillStyle = UI_HPBarColor_front;
        context.fillRect(x, y, this.player.chara.state.hp * UI_unitlength, UI_HPBarHeight);
        context.lineWidth = UI_digitLineWidth;
        context.font = player_info_fontSize + "px Arial";
        let text = this.player.chara.state.hp + " / " + this.player.chara.state.hp_max;
        let textWidth = context.measureText(text).width;
        let center_x = x + this.player.chara.state.hp_max * UI_unitlength / 2;
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
            this.player.chara.state.mp_max * UI_unitlength + overblood * 2,
            UI_MPBarHeight + overblood * 2);

        context.fillStyle = UI_MPBarColor_front;
        context.fillRect(x, y, this.player.chara.state.mp * UI_unitlength, UI_MPBarHeight);

        context.lineWidth = UI_digitLineWidth;
        context.font = player_info_fontSize + "px Arial";
        text = this.player.chara.state.mp + " / " + this.player.chara.state.mp_max;
        textWidth = context.measureText(text).width;
        center_x = x + this.player.chara.state.mp_max * UI_unitlength / 2;
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
        if (this.player.chara.equipment.spade.length > 0) {
            if (picDic[this.player.chara.equipment.spade[0].pic_src]) {
                let img = new Image();
                img.src = picDic[this.player.chara.equipment.spade[0].pic_src];
                // 居中绘制
                let scale = Math.min((UI_weaponPicBox_width - overblood * 2) / img.width, (UI_weaponPicBox_height - overblood * 2) / img.height);
                let drawWidth = img.width * scale;
                let drawHeight = img.height * scale;
                context.drawImage(img, x + UI_weaponPicBox_width / 2 - drawWidth / 2, y + UI_weaponPicBox_height / 2 - drawHeight / 2, drawWidth, drawHeight);
            } else {
                // 请求图片
                socket_file.send(JSON.stringify({ type: "item_pic", pic_src: this.player.chara.equipment.spade[0].pic_src }));
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
            text = this.player.chara.equipment.spade[0].name;
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

            if (this.player.chara.equipment.spade[0].fireState != "reloading") {
                // 画出子弹数量
                let ammo = this.player.chara.equipment.spade[0].ammo;
                let ammo_max = this.player.chara.equipment.spade[0].ammo_max;
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
                let time = this.player.chara.equipment.spade[0].time;
                let startReload = this.player.chara.equipment.spade[0].startReload;
                let reload = this.player.chara.equipment.spade[0].reload;
                let reloadWidth = ammoBoxWidth - overblood * 2;
                let reloadHeight = (ammoBoxHeight - overblood * 2) * (time - startReload) / reload;
                x += overblood;
                y += ammoBoxHeight - overblood - reloadHeight;
                context.fillStyle = "#73ca73";
                context.fillRect(x, y, reloadWidth, reloadHeight);
            }
        }
    }
    draw_all(context, map_id, players, items, bullets) {
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
        this.update_camera(this.player.chara.loc.x, this.player.chara.loc.y, false);

        // 若右键按下, 在信息栏显示实体信息
        if (this.player.key.mouse_r) this.mouseRightShowInfo();
        else document.getElementById("info_alert").style.display = "none";
    }
    draw(context) {
        let bullets = [];
        for (let p in this.players) {
            bullets = bullets.concat(p.bullets);
        }
        this.draw_all(context, this.player.chara.current_mapId, this.players, this.items, this.player.bullets);
    }

    /* 响应函数 */
    update() {
        engine.updateSelf();
    }
    update_situation(players, items) {
        // console.log(`接收服务器的情况更新, players: ${players.length}, items: ${items.length}`);
        this.players = deepCopy(players, true);
        this.items = deepCopy(items, true);
    }
    update_camera(target_x, target_y, direct) {
        // 相机位置是数据坐标位置
        var c_x = (target_x);
        var c_y = (target_y);
        if (this.player.key.mouse_r) {
            let sightLevel = .2; // 视野越大, 能看的越远
            c_x = c_x * (1 - sightLevel) + this.player.key.mouseX * sightLevel;
            c_y = c_y * (1 - sightLevel) + this.player.key.mouseY * sightLevel;
        }
        // 平移到屏幕正中间
        c_x -= this.viewport.x / 2;
        c_y -= this.viewport.y / 2;

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
    }
    update_leaderBoard(players) {
        // 更新leaderBoard
        let leaderBoard = document.getElementById("leaderBoard");
        let leaderHTML = "";
        // 排序
        players.sort((a, b) => b.chara.state.hp - a.chara.state.hp);
        for (let player of players) {
            leaderHTML += `
            <tr>
                <td>${player.chara.name}</td>
                <td>${player.chara.state.hp}</td>
            </tr>
            `;
        }
        leaderBoard.innerHTML = leaderHTML;
    }
    mouseRightShowInfo() {
            // 从canvas坐标转换为数据坐标
            let x = this.player.key.mouseX + this.tile_size / 2;
            let y = this.player.key.mouseY + this.tile_size / 2;
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
                mouse: {x:${this.mouse.x.toFixed(1)}, y:${this.mouse.y.toFixed(1)}}; key: {x:${this.player.key.mouseX.toFixed(1)}, y:${this.player.key.mouseY.toFixed(1)}}; tile: {x:${tile_x}, y:${tile_y}}
            </span>`;
    }

    /* 与服务器交互 */
    start() {
        // 根据当前currentMap, 启动物理引擎
        engine.teleport_player_to_savePoint(this.player);
        game.runningFlag = true;

        console.log("Game start!");
        console.log(`当前地图: ${this.current_map.mapName}`);
        console.log(`当前玩家所在位置: ${this.player.chara.loc.x}, ${this.player.chara.loc.y}`);
    }
}