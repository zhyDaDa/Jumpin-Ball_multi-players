/**
 * @class MapData
 * @classdesc 地图数据类
 */
class MapData {
    /**
     * 地图名
     * @type {string}
     * @default "default map name"
     * @memberof MapData
     */
    mapName;
    /**
     * 地图Id
     * @type {number}
     * @default 0
     * @memberof MapData
     */
    mapId;
    /**
     * 地图块大小
     * @type {number}
     * @default 16
     * @memberof MapData
     */
    tile_size;
    /**
     * 背景颜色
     * @type {string}
     * @default '#333'
     * @memberof MapData
     */
    BGColor;
    /**
     * 地图块的属性
     * @type {{* : {id: number, colour: string, solid: number, bounce: number, friction: {x: number, y: number}}}}
     * @default {
     *    "0": { "id": 0, "colour": "#00000000", "solid": 0 },
     *   "1": { "id": 1, "colour": "#12aaf8", "solid": 0, "friction": { "x": 0.01, "y": 0.01 } },
     *  "2": { "id": 2, "colour": "#046292", "solid": 1, "bounce": 0.2, "friction": { "x": 0.6, "y": 0.6 } },
     * }
     * @memberof MapData
     */
    keys;
    /**
     * 地图数据
     * @type {number[][]}
     * @default [
     *   [1, 1, 1],
     *  [2, 2, 2]
     * ]
     * @memberof MapData
     * @readonly
     * /
    data;
    /**
     * 重力
     * @type {{x: number, y: number}}
     * @default { "x": 0, "y": 0.24 }
     * @memberof MapData
     */
    gravity;
    /**
     * 速度限制
     * @type {{x: number, y: number}}
     * @default { "x": 4, "y": 10 }
     * @memberof MapData
     */
    vel_limit;
    /**
     * 移动速度
     * @type {{jump: number, left: number, right: number}}
     * @default { "jump": 6, "left": 0.5, "right": 0.5 }
     * @memberof MapData
     */
    movement_speed;
    /**
     * 玩家初始位置
     * @type {{x: number, y: number}}
     * @default { "x": 1, "y": -2 }
     * @memberof MapData
     */
    playerCheckPoint;
    /**
     * 地图的宽度, 以tile为单位
     * @type {number}
     * @memberof MapData
     * @readonly
     */
    width;
    /**
     * 地图的高度, 以tile为单位
     * @type {number}
     * @memberof MapData
     * @readonly
     */
    height;

    constructor(mapData) {
        this.checkValid(mapData);
        this.mapName = mapData.mapName || "default map name";
        this.mapId = mapData.mapId || 0;
        this.tile_size = mapData.tile_size || 16;
        this.BGColor = mapData.BGColor || '#333';
        this.keys = mapData.keys || {
            "0": { "id": 0, "colour": "#00000000", "solid": 0 },
            "1": { "id": 1, "colour": "#12aaf8", "solid": 0, "friction": { "x": 0.01, "y": 0.01 } },
            "2": { "id": 2, "colour": "#046292", "solid": 1, "bounce": 0.2, "friction": { "x": 0.6, "y": 0.6 } },
        };
        this.data = mapData.data || [
            [1, 1, 1],
            [2, 2, 2]
        ];
        this.getWidHei();
        this.gravity = mapData.gravity || { "x": 0, "y": 0.24 };
        this.vel_limit = mapData.vel_limit || { "x": 4, "y": 10 };
        this.movement_speed = mapData.movement_speed || { "jump": 6, "left": 0.5, "right": 0.5 };
        this.playerCheckPoint = mapData.playerCheckPoint || { "x": 1, "y": -2 };
    }

    checkValid(mapData) {
        if (typeof mapData === 'undefined' ||
            typeof mapData.data === 'undefined' ||
            typeof mapData.keys === 'undefined') {

            console.error('Error: Invalid mapData data!');
            return false;
        }
        return true;
    }

    getWidHei() {
        // if (typeof this.current_map.onLoad === "function") this.current_map.onLoad();
        this.width = 0;
        this.height = this.data.length;

        this.data.forEach((row, y) => {
            this.width = Math.max(this.width, row.length)
        });
    }

    unzip() {
        this.data.forEach((row, y) => {
            this.width = Math.max(this.width, row.length);
            row.forEach((tile, x) => {
                this.data[y][x] = this.keys[tile];
            });
        });
    }

    zip() {
        this.data.forEach((row, y) => {
            row.forEach((tile, x) => {
                this.data[y][x] = tile.id;
            });
        });
    }

}

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
 * @property {{* : Boolean}} attribute
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
        let bullet_state = player.chara.equipment.spade[0].bullet_state;
        this.current_mapId = player.chara.current_mapId;
        this.loc = deepCopy(player.chara.loc);
        // 优化射击体验, 子弹应该在玩家上方一点点的位置射出
        this.loc.y -= player.chara.size / 4;
        this.vel = deepCopy(player.chara.vel);
        // 玩家初始速度对子弹的影响要稍微小一点
        this.vel.x /= 4;
        this.vel.y /= 4;
        this.speed = bullet_state.speed || 10;
        // this.acc = { x: 0, y: 0 };
        this.owner_ip = player.chara.ip;

        this.begin_point = deepCopy(this.loc);
        this.end_point = deepCopy(player.chara.aimer);

        this.damage_direct = bullet_state.damage_direct || 0;
        this.damage_slice = bullet_state.damage_slice || 0;
        this.damage_continuous = bullet_state.damage_continuous || 0;
        this.damage_explosion = bullet_state.damage_explosion || 0;

        // type控制的是样式, 子弹的数值由枪来确定
        this.type = bullet_state.type; // BULLET_TYPE_NORMAL, BULLET_TYPE_EXPLOSIVE, BULLET_TYPE_LASER
        this.class = 0; // BULLET_CLASS_WHITE, BULLET_CLASS_BLACK

        this.attribute = {
            pierce: false, // 穿透
        }

        // 特殊效果
        this.timer = 0;
        this.effect = 0; // BULLET_EFFECT_NONE, BULLET_EFFECT_FREEZE, BULLET_EFFECT_BURN

        this.colour = "#f00";
        this.size = 20;
        this.shape = 0; // BULLET_SHAPE_CIRCLE, BULLET_SHAPE_RECT

        this.init(); // 根据type初始化
    }

    // todo: 展望: 考虑出一个子弹的json, 存储数值, 轨迹, 效果等, 发给客户端还能实现特效和音效

    init() {
            let dx, dy, d;
            switch (this.type) {
                case enums.BULLET_TYPE_NORMAL:
                default:
                    this.size = 12;
                    this.shape = enums.SHAPE_CIRCLE;
                    this.colour = "#f00";
                    this.acc = { x: 0, y: 0 };
                    // 由begin_point和end_point确定方向, 向量的模为speed
                    dx = this.end_point.x - this.begin_point.x;
                    dy = this.end_point.y - this.begin_point.y;
                    d = Math.sqrt(dx * dx + dy * dy);
                    this.vel.x += this.speed * dx / d;
                    this.vel.y += this.speed * dy / d;
                    break;
                case enums.BULLET_TYPE_GOLD:
                    this.size = 18;
                    this.shape = enums.SHAPE_CIRCLE;
                    this.colour = "#ffd745";
                    this.acc = { x: 0, y: 0 };
                    // 由begin_point和end_point确定方向, 向量的模为speed
                    dx = this.end_point.x - this.begin_point.x;
                    dy = this.end_point.y - this.begin_point.y;
                    d = Math.sqrt(dx * dx + dy * dy);
                    this.vel.x += this.speed * dx / d;
                    this.vel.y += this.speed * dy / d;
                    break;
                case enums.BULLET_TYPE_SUPER:
                    this.size = 24;
                    this.shape = enums.SHAPE_CIRCLE;
                    this.colour = "#e44d26";
                    this.acc = { x: 0, y: 0 };
                    // 由begin_point和end_point确定方向, 向量的模为speed
                    dx = this.end_point.x - this.begin_point.x;
                    dy = this.end_point.y - this.begin_point.y;
                    d = Math.sqrt(dx * dx + dy * dy);
                    this.vel.x += this.speed * dx / d;
                    this.vel.y += this.speed * dy / d;
                    break;

            }
            this.loc.x += this.vel.x;
            this.loc.y += this.vel.y;
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

    /**
     * 删除子弹
     */
    delete() {
        // 销毁子弹
        bulletDic[this.current_mapId].splice(bulletDic[this.current_mapId].indexOf(this), 1);
        // 释放内存
        delete this;
        // this = undefined;
    }
}

/**
 * @type
 * @class Item
 * @classdesc 物品类, 包括四种子类: spade, club, heart, diamond
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
class Item {
    /**
     * 
     * @param {string} _name 物品名
     * @param {string} _pic_src 图片路径
     * @param {number} _type 枚举类型
     * @param {number} _class 黑或白的枚举类型
     * @param {number} _tier 物品等级
     * @param {number} _price 商店价值
     * @param {string} _colour 颜色
     * @param {string} _info 物品的说明
     * @param {number} _mapId 地图Id
     * @param {{x:number, y:number}} _pos 位置
     */
    constructor(_name, _pic_src, _type, _class, _tier, _price, _colour, _info, _mapId, _pos) {
        this.name = _name || "default item";
        this.pic_src = _pic_src || this.name;
        this.type = _type; // ITEM_TYPE_SPADE, ITEM_TYPE_CLUB, ITEM_TYPE_HEART, ITEM_TYPE_DIAMOND
        this.class = _class; // ITEM_CLASS_WHITE, ITEM_CLASS_BLACK
        this.tier = _tier;
        this.price = _price;

        this.colour = _colour;
        this.info = _info;
        this.id = itemIterator++;
        console.log
        this.belongerIp = "";
        this.mapId = _mapId || 0;
        this.pos = deepCopy(_pos) || { x: 0, y: 0 };
        this.state = enums.ITEM_STATE_WILD; // ITEM_STATE_WILD, ITEM_STATE_EQUIPPED, ITEM_STATE_SHOP
    }

    /**
     * 更新物品的归属者
     * @param {Chara} chara
     */
    updateBelonger(chara) {
        if (chara) {
            this.belongerIp = chara.ip;
            // this.pos = deepCopy(chara.loc);
            this.state = enums.ITEM_STATE_EQUIPPED;
        } else {
            this.belongerIp = "";
            this.state = enums.ITEM_STATE_WILD;
        }
    }
}

/** 
 * @class Spade
 * @classdesc 武器类, 用于攻击
 * @extends Item
 * @inheritdoc
 * with 
 * with ammo
 * @property {number} ammo_max
 * @property {number} ammo
 * @property {number} delay
 * @property {number} reload
 * with fire
 * @property {number} time
 * @property {number} lastfire
 * @property {string} fireState - ready, firing, reloading
 * @property {number} startReload
 * with bullet
 * @property {{type: number, speed: number, damage_direct: number, damage_slice: number, damage_continuous: number, damage_explosion: number}} bullet_state
 */
class Spade extends Item {
    /**
     * 
     * @param {string} _name 物品名
     * @param {string} _pic_src 图片路径
     * @param {enums} _type 枚举类型
     * @param {emums} _class 黑或白的枚举类型
     * @param {number} _tier 物品等级
     * @param {number} _price 商店价值
     * @param {string} _colour 颜色
     * @param {string} _info 物品的说明
     * @param {{x:number, y:number}} _pos 位置
     */
    constructor(_name = "default spade", _pic_src = "default_src", _type = 0, _class = 0, _tier = 0, _price = 0, _colour = "#000", _info = "物品说明") {
        super(_name, _pic_src, _type, _class, _tier, _price, _colour, _info);
        this.type = enums.ITEM_TYPE_SPADE;

        /** @default 20 */
        this.ammo_max = 20;
        this.ammo = this.ammo_max;
        /** @default 300 */
        this.delay = 300;
        /** @default 1000 */
        this.reload = 1000;

        this.time = new Date().getTime();
        this.lastfire = 0;
        this.fireState = "ready"; // ready, firing, reloading
        this.startReload = 0;

        this.bullet_state = {
            type: enums.BULLET_TYPE_NORMAL,
            speed: 12,
            damage_direct: 1,
            damage_slice: 0,
            damage_continuous: 0,
            damage_explosion: 0,
        }
    }

    /**
     * 更新武器状态
     */
    update() {
        this.time = new Date().getTime();
        if (this.fireState == "reloading") {
            if (this.time - this.startReload >= this.reload) {
                this.ammo = this.ammo_max;
                this.fireState = "ready";
            }
        }
    }
}

/**
 * @class Chara
 * @classdesc 玩家操纵的角色
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
 * @property {Number} pickRange
 * with equipment
 * @property {{club: Item, heart: Item, spade: Item, diamond: Item}} equipment
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
        this.colour = "#FF9900";
        this.size = 16;
        this.hitBoxSize = 16;
        this.current_mapId = 0;

        this.can_jump = true;
        this.doublejumpFlag = false;
        this.can_doublejump = true;

        this.can_dash = true;

        this.can_float = true;

        this.gliding = false;

        this.doublejump_ability = true;
        this.glide_ability = true;
        this.dash_ability = true;
        this.float_ability = true;

        this.pickRange = 1.5;

        this.buff = [{}];
        this.equipment = {
            club: [],
            heart: [],
            spade: [],
            diamond: [],
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

        // this.equipment.spade[0] = new Spade("basic pistal", "basic pistal");
    }

    /**
     * 将角色的实际位置转换成数据位置
     * @param {GAME} game 
     * @returns {{x:Number,y:NamedCurve}}
     */
    getDigitPosition(game) {
        let tile_size = game.maps[this.current_mapId].tile_size;
        return {
            x: this.loc.x / tile_size,
            y: this.loc.y / tile_size,
        }
    }

    /**
     * 角色拾取物品
     * @param {Item} item
     */
    pickItem(item) {
        // 如果物品已被拾取, 则不能再次拾取
        if (item.state == enums.ITEM_STATE_EQUIPPED) return;
        // 如果物品是商店物品且玩家钱不够则不拾取, 否则扣钱
        if (item.state == enums.ITEM_STATE_SHOP && this.state.money < item.price) return;
        else this.state.money -= item.price;

        // 检查有无重合(type和class一致), 如果有则替换, 无则直接装备
        // let itemEquipped = null;
        // let itemClass = item.class - enums.ITEM_CLASS_WHITE;
        // 新思路: 战斗的时候不用管, 直接全拿上就行
        switch (item.type) {
            case enums.ITEM_TYPE_SPADE:
                this.equipment.spade.push(item);
                break;
            case enums.ITEM_TYPE_CLUB:
                this.equipment.club.push(item);
                break;
            case enums.ITEM_TYPE_HEART:
                this.equipment.heart.push(item);
                break;
            case enums.ITEM_TYPE_DIAMOND:
                this.equipment.diamond.push(item);
                break;
            default:
                console.log("item的type不规范!")
                break;
                // case enums.ITEM_TYPE_SPADE:
                //     if (item.class == enums.ITEM_CLASS_WHITE && this.equipment.spade[0]) itemEquipped = this.equipment.spade[0];
                //     else if (item.class == enums.ITEM_CLASS_BLACK && this.equipment.spade[1]) itemEquipped = this.equipment.spade[1];
                //     else this.equipment.spade[itemClass] = item;
                //     break;
                // case enums.ITEM_TYPE_CLUB:
                //     if (item.class == enums.ITEM_CLASS_WHITE && this.equipment.club[0]) itemEquipped = this.equipment.club[0];
                //     else if (item.class == enums.ITEM_CLASS_BLACK && this.equipment.club[1]) itemEquipped = this.equipment.club[1];
                //     else this.equipment.club[itemClass] = item;
                //     break;
                // case enums.ITEM_TYPE_HEART:
                //     if (item.class == enums.ITEM_CLASS_WHITE && this.equipment.heart[0]) itemEquipped = this.equipment.heart[0];
                //     else if (item.class == enums.ITEM_CLASS_BLACK && this.equipment.heart[1]) itemEquipped = this.equipment.heart[1];
                //     else this.equipment.heart[itemClass] = item;
                //     break;
                // case enums.ITEM_TYPE_DIAMOND:
                //     if (item.class == enums.ITEM_CLASS_WHITE && this.equipment.diamond[0]) itemEquipped = this.equipment.diamond[0];
                //     else if (item.class == enums.ITEM_CLASS_BLACK && this.equipment.diamond[1]) itemEquipped = this.equipment.diamond[1];
                //     else this.equipment.diamond[itemClass] = item;
                //     break;
                // default:
                break;
        }

        // 如果有重合, 则将原有物品丢弃, 并更新其状态
        // if (itemEquipped) {
        //     itemEquipped.belongerIp = "";
        //     itemEquipped.pos = deepCopy(this.loc);
        //     itemEquipped.state = enums.ITEM_STATE_WILD;
        // }
        item.updateBelonger(this);
    }

    /**
     * 角色丢弃物品
     * @param {Item} item
     */
    dropItem(item) {
        item.pos = deepCopy(this.loc);
        item.pos.x /= game.maps[this.current_mapId].tile_size;
        item.pos.y /= game.maps[this.current_mapId].tile_size;
        item.updateBelonger();

        // 从装备中删除
        switch (item.type) {
            case enums.ITEM_TYPE_SPADE:
                let i = this.equipment.spade.indexOf(item);
                if (i > -1) this.equipment.spade.splice(i, 1);
                break;
            case enums.ITEM_TYPE_CLUB:
                let j = this.equipment.club.indexOf(item);
                if (j > -1) this.equipment.club.splice(j, 1);
                break;
            case enums.ITEM_TYPE_HEART:
                let k = this.equipment.heart.indexOf(item);
                if (k > -1) this.equipment.heart.splice(k, 1);
                break;
            case enums.ITEM_TYPE_DIAMOND:
                let l = this.equipment.diamond.indexOf(item);
                if (l > -1) this.equipment.diamond.splice(l, 1);
                break;
            default:
                break;
        }

    }
}

/**
 * @type
 * @class Player
 * @classdesc 一个用户对象
 * @property {Chara} chara
 * @property {WebSocket} ws
 * @property {Boolean} isRobo
 * @property {{*:Boolean}} key
 * @property {number} time 该玩家所有的时间计算基准
 * @property {number} latency 玩家的网络延迟(来回)
 */
class Player {
    constructor() {
        this.key = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false,
            dash: false,
            pick: false,
            drop: false,
            reload: false,
            switch: false,
            mouse_l: false,
            mouse_m: false,
            mouse_r: false,
            mouseX: 0,
            mouseY: 0,
        };
        this.chara = new Chara();
        this.bullets = [];
        this.ip = "";
        this.isRobo = false;
        this.time = 0;
        this.latency = 0;

        this.pick_switch = 0;
    }
}

if (typeof(module) !== 'undefined')
    module.exports = {
        MapData,
        Bullet,
        Item,
        Spade,
        Chara,
        Player
    };