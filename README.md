# Jumpin-Ball 多人模式
横版跳跃游戏现已推出**多人模式**! 当前处于**Alpha**阶段, 请多提建议.

# 使用说明
## 服务端
需要安装`Node.js`   
运行`main/server.js`即可  
之后会在`432`端口开启`websocket`服务器, 请确保该端口没有被占用
![](./pic1.png)


## 客户端
由于`cross-origin`问题, 客户要`fetch` `map.json`文件, 必须要有本地服务器  
因此采用python临时搭建小服务器提供文件传输服务, 请确保安装`Python3`   
之后运行`main/client.bat`即可, 会自动打开客户端服务器*8088端口*和游戏网页
![](./pic2.png)
> 服务器地址填主机的ip地址

# TODO清单
 + [ ] 原本游戏中的特殊砖块*script*实现
 + [ ] 各个玩家的死亡判定, 死亡计次的现实, 玩家退出的时候服务器删除ta的存在
 + [ ] 客户端玩家面板的完善(死亡计次, 当前数值, 武器, 技能, 效果*buff*)
 + [ ] 战斗的方式(子弹, 近战)
 + [ ] 玩家名称, 血条头顶显示
 + [ ] 光圈标记或是移动时的特效等的实现
 + [ ] 玩家的死亡动画以及复活方式(死亡后的倒计时)
 + [ ] 各种武器, 技能的实现
 + [ ] 野怪, NPC机器人的设置
 + [ ] 转场, 地图的改变
 + [ ] 背景音乐, 音效, 按键音的设置
 + [ ] 登陆界面, 角色选择 

# 新的游戏设想
以**酒馆机制**为框架, 实现一个多人大乱斗的游戏

## 概述
备战环节, 每位玩家可以通过商店获取道具, 并可以调配自己的装备(饰品等)  
进入战斗阶段后, 会在地图上随机出现各种道具(或者材料/资源), 玩家自发进行抢夺, 形成混战   
战斗阶段分为两个阶段, 白昼与黑夜, 因此玩家需要准备两套装备, 战斗风格也会因此而改变

## 游戏设定 
### 胜利/存活条件
血量为0的玩家会被淘汰, 最后存活的玩家获得胜利   
为避免死亡后失去游戏参与感, 死亡的玩家将化为鬼魂(借鉴游戏: ***crawl***)   
鬼魂通过操作地图上的机关来干扰存货玩家, 如果造成伤害将会获得奖励, 有概率复活, 以此增强游戏性  
如果仅一位玩家幸存, 游戏结束  
考虑到鬼魂不断生成游戏无法结束的情况, 只允许鬼魂在晚上出现, 这样白天只有最后一个幸存者, 游戏结束  

### 装备/饰品
全游戏画风统一为扑克牌, 道具也以扑克牌的形式呈现, 分为黑桃, 红桃, 方片, 梅花四个花色
 + **黑桃**: 攻击类武器, 如: 宝剑 / 长枪 / 锤子 / 弓箭 ...
 + **方片**: 防具, 如: 盾牌 / 铠甲 / 靴子 / 头盔 ...
 + **红桃**: 主动道具, 如: 治疗药剂 / 护盾 / 药膏 ...
 + **梅花**: 被动道具, 如: 生命值加成 / 攻击力加成 / 防御力加成 / 移动速度加成 ...

部分道具还有黑白之分, 限定在白昼或黑夜才能使用  
玩家可以拆散道具来获得点数, 以购买自己需要的道具
商店中随机出现道具, 价格也随机(考虑每轮备战环节提供5张牌)  
商店暂时不设置等级(tier)机制, 后续考虑升级的好处  

玩家身上只能携带各个花色各一个, 但是要准备两套装备, 一套用于白天, 一套用于黑夜  

# 代码细节
## 玩家对象
```JavaScript
playerDic[ip] = {
  key: {控制按键情况},
  chara: {角色对象},
  info: {玩家信息},
  ws: ws
}
```

## 玩家信息
```JavaScript
info = {
  name: "",
  colour: "#000",
}
```

## 角色对象
```JavaScript
chara = {
  loc: {x: 0, y: 0},    // 实际坐标
  vel: {x: 0, y: 0},    // 移动速度
  colour: "#000",
  
  can_jump: true,
  doublejumpFlag: false,
  can_doublejump: true,
  can_dash: true,
  doublejump_ability: true,
  glide_ability: true,
  dash_ability: true,
  float_ability: true,

  buff: [{buff效果}],
  equipment: {
    club: item,
    heart: item,
    spade: item,
    diamond: item,
  },

  state: {
    hp: 30,
    mp: 10,
    hp_max: 30,
    mp_max: 10,
    money: 0,
  },


}
```

## 物品对象
```JavaScript
item = {
  name: "",
  type: ENUM, // ITEM_TYPE_SPADE, ITEM_TYPE_CLUB, ITEM_TYPE_HEART, ITEM_TYPE_DIAMOND
  class: ENUM, // ITEM_CLASS_WHITE, ITEM_CLASS_BLACK
  // colour: "#000",
  info: "效果说明",
  id: 0,
  tier: 0,
  price: 0,
}
```

## Buff对象
```JavaScript
```

## 通信信息
### 客户端向服务器发送的信息
```JavaScript
{
  key: {控制按键情况},
  name: "",
  color: "#000",

}
```

### 服务器向客户端发送的信息
```JavaScript
{
  map_id: 1,
  players: Object.values(playerDic).map((player) => player.chara),
  yourIndex: {接收者的序号},
  time: new Date().getTime()
}
```
