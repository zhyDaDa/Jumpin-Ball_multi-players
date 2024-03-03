/* 对象 深度复制 */

var deepCopy = function(source, kaiguan) {
    var result = {};
    if (kaiguan == 1) var result = [];
    for (var key in source) {
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

/* 初始化 */
if (localStorage.getItem("doublejump_ability") === null) { localStorage.setItem("doublejump_ability", "0"); }
if (localStorage.getItem("glide_ability") === null) { localStorage.setItem("glide_ability", "0"); }
if (localStorage.getItem("dash_ability") === null) { localStorage.setItem("dash_ability", "0"); }
if (localStorage.getItem("float_ability") === null) { localStorage.setItem("float_ability", "0"); }
if (localStorage.getItem("passFlags") === null) { localStorage.setItem("passFlags", "[false,false,false,false,false,false,false]"); }
if (localStorage.getItem("eggFlags") === null) { localStorage.setItem("eggFlags", "[false,false,false,false,false,false,false,false]"); }
if (localStorage.getItem("deathCount") === null) { localStorage.setItem("deathCount", "0"); }


function checkDoubleJumpFlag() {
    if (localStorage.getItem("doublejump_ability") << 0) return true;
    else return false;
}

function checkGlide() {
    if (localStorage.getItem("glide_ability") << 0) return true;
    else return false;
}

function checkDash() {
    if (localStorage.getItem("dash_ability") << 0) return true;
    else return false;
}

function checkFloat() {
    if (localStorage.getItem("float_ability") << 0) return true;
    else return false;
}

function getMapSave_x(map) {
    if (localStorage.getItem("mapName") == map.mapName) {
        return localStorage.getItem("mapSave_x") << 0;
    }
    return map.player.x;
}

function getMapSave_y(map) {
    if (localStorage.getItem("mapName") == map.mapName) {
        return localStorage.getItem("mapSave_y") << 0;
    }
    return map.player.y;
}