# Jumpin-Ball 多人模式

横版跳跃游戏现已推出**多人模式**! 当前处于**Alpha**阶段, 请多提建议.
项目投入时间: [![wakatime](https://wakatime.com/badge/user/a08db52b-db5f-48ec-9b55-6d1f4a5ffea2/project/018c0f0a-d018-4edd-ae30-b03cb135902a.svg)](https://wakatime.com/badge/user/a08db52b-db5f-48ec-9b55-6d1f4a5ffea2/project/018c0f0a-d018-4edd-ae30-b03cb135902a)

- - -
目录如下

- [Jumpin-Ball 多人模式](#jumpin-ball-多人模式)
  - [Version 2.1](#version-21)
    - [使用说明](#使用说明)
      - [服务端](#服务端)
      - [客户端](#客户端)
    - [TODO清单](#todo清单)
    - [alpha测试反馈](#alpha测试反馈)
    - [新的游戏设想](#新的游戏设想)
      - [概述](#概述)
      - [游戏设定](#游戏设定)
        - [胜利/存活条件](#胜利存活条件)
        - [装备/饰品](#装备饰品)
    - [代码细节](#代码细节)
      - [玩家对象](#玩家对象)
      - [玩家信息](#玩家信息)
      - [角色对象](#角色对象)
      - [物品对象](#物品对象)
      - [Buff对象](#buff对象)
      - [Bullet对象](#bullet对象)
      - [通信信息](#通信信息)
        - [客户端向服务器发送的信息](#客户端向服务器发送的信息)
        - [服务器向客户端发送的信息](#服务器向客户端发送的信息)
      - [简易物理引擎原理](#简易物理引擎原理)
    - [开发中遇到的问题](#开发中遇到的问题)
      - [地图对象](#地图对象)
      - [视图转换](#视图转换)
      - [UI设计](#ui设计)
    - [加载地图的方法](#加载地图的方法)
      - [原地图](#原地图)
      - [地图调用的优化](#地图调用的优化)
        - [带有特殊机关的地图砖块](#带有特殊机关的地图砖块)
    - [随机地图的实现](#随机地图的实现)
      - [预制地图块](#预制地图块)
      - [宏观地图调整](#宏观地图调整)
      - [实现细节](#实现细节)
        - [框架搭建](#框架搭建)
        - [打通路](#打通路)
          - [通路与否的表示方法](#通路与否的表示方法)
          - [工具函数](#工具函数)
        - [打通criticalPath的算法](#打通criticalpath的算法)
        - [完善地图的sidPath](#完善地图的sidpath)
        - [匹配地图模块](#匹配地图模块)
  - [Version 2.2](#version-22)
    - [使用方法](#使用方法)
    - [数据收发规范](#数据收发规范)
      - [用户向服务器发送](#用户向服务器发送)
      - [服务器向用户发送](#服务器向用户发送)

## Version 2.1

核心实现:

- 实现代码的模块化和函数化
- 在原型基础上实现了游戏的战斗系统
- 实现了多人游戏
  - 用户端: 发送用户按键情况, 渲染服务器发来的地图和玩家信息
  - 服务器端: 一切逻辑处理, 并将当前的情况广播
  
由于该处理方式使得服务器负担过大, 导致主机以外的玩家延迟过高, 体验极差  

### 使用说明

#### 服务端

需要安装`Node.js`
运行`main/server.js`即可  
之后会在`432`端口开启`websocket`服务器, 请确保该端口没有被占用
![服务器启动示意图](./pic1.png)

#### 客户端

由于`cross-origin`问题, 客户要`fetch` `map.json`文件, 必须要有本地服务器  
因此采用python临时搭建小服务器提供文件传输服务, 请确保安装`Python3`
之后运行`main/client.bat`即可, 会自动打开客户端服务器*8088端口*和游戏网页
![游戏界面示意图](./pic2.png)
> 服务器地址填主机的ip地址

### TODO清单

- [x] 原本游戏中的特殊砖块*script*实现
- [x] 物理效果完善
- [x] 各个玩家的死亡判定, 死亡计次的现实, 玩家退出的时候服务器删除ta的存在
- [X] 客户端玩家面板的完善(死亡计次, 当前数值, 武器, 技能, 效果*buff*)
- [x] 战斗的方式(子弹, 近战)
- [x] 伤害计算
- [x] 延迟计算
- [x] 玩家名称, 血条头顶显示
- [x] 光圈标记或是移动时的特效等的实现
- [x] 玩家的死亡动画以及复活方式(死亡后的倒计时)
- [x] 野怪, NPC机器人的设置
- [x] 地图的改变, 在背景显示地图名称
- [x] 武器拾取
- [x] 抓墙跳
- [x] 武器更换
- [x] 右键按住后, 镜头随之有微小的跟随
- [x] 右键按住的情况下, 光标悬浮在实体上, 显示实体的名称和信息
- [x] 死亡掉落
- [x] 主页面
- [ ] 击退子弹
- [ ] 各种武器, 技能的实现
- [ ] 转场特效
- [ ] 背景音乐, 音效, 按键音的设置
- [ ] 登陆界面, 角色选择
- [ ] 断线重连和统一ip多开
- [ ] 随机地图

### alpha测试反馈

- 优点
  - 跑酷很有意思, 抓墙跳会很自然的引起玩家的攀爬欲望
  - 抢夺装备很欢乐, 有时候战斗没开始就已经激烈了
- 缺点
  - 跑酷难度过大, 引起手部不适
  - 玩家会自然的连按跳跃, 事实上这样跳不高...

### 新的游戏设想

以**酒馆机制**为框架, 实现一个多人大乱斗的游戏

#### 概述

备战环节, 每位玩家可以通过商店获取道具, 并可以调配自己的装备(饰品等)  
进入战斗阶段后, 会在地图上随机出现各种道具(或者材料/资源), 玩家自发进行抢夺, 形成混战
战斗阶段分为两个阶段, 白昼与黑夜, 因此玩家需要准备两套装备, 战斗风格也会因此而改变

#### 游戏设定

##### 胜利/存活条件

血量为0的玩家会被淘汰, 最后存活的玩家获得胜利
为避免死亡后失去游戏参与感, 死亡的玩家将化为鬼魂(借鉴游戏: ***crawl***)
鬼魂通过操作地图上的机关来干扰存货玩家, 如果造成伤害将会获得奖励, 有概率复活, 以此增强游戏性  
如果仅一位玩家幸存, 游戏结束  
考虑到鬼魂不断生成游戏无法结束的情况, 只允许鬼魂在晚上出现, 这样白天只有最后一个幸存者, 游戏结束  

##### 装备/饰品

全游戏画风统一为扑克牌, 道具也以扑克牌的形式呈现, 分为黑桃, 红桃, 方片, 梅花四个花色

- **黑桃**: 攻击类武器, 如: 宝剑 / 长枪 / 锤子 / 弓箭 ...
- **方片**: 防具, 如: 盾牌 / 铠甲 / 靴子 / 头盔 ...
- **红桃**: 主动道具, 如: 治疗药剂 / 护盾 / 药膏 ...
- **梅花**: 被动道具, 如: 生命值加成 / 攻击力加成 / 防御力加成 / 移动速度加成 ...

部分道具还有黑白之分, 限定在白昼或黑夜才能使用  
玩家可以拆散道具来获得点数, 以购买自己需要的道具
商店中随机出现道具, 价格也随机(考虑每轮备战环节提供5张牌)  
商店暂时不设置等级(tier)机制, 后续考虑升级的好处  

玩家身上只能携带各个花色各一个, 但是要准备两套装备, 一套用于白天, 一套用于黑夜  

### 代码细节

#### 玩家对象

```JavaScript
playerDic[ip] = {
  key: {控制按键情况},
  chara: {角色对象},
  info: {玩家信息},
  ws: ws
}
```

#### 玩家信息

```JavaScript
info = {
  name: "",
  colour: "#000",
}
```

#### 角色对象

```JavaScript
chara = {
  loc: {x: 0, y: 0},    // 实际坐标
  vel: {x: 0, y: 0},    // 移动速度
  
  name: "defaultPlayer",
  colour: '#000',
  current_mapId: 0,
  
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

#### 物品对象

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

#### Buff对象

```JavaScript
```

#### Bullet对象

```JavaScript
bullet = {
  loc: {x: 0, y: 0},
  vel: {x: 0, y: 0},
  acc: {x: 0, y: 0},
  owner: player,

  damage_direct: 0,
  damage_slice: 0,
  damage_continuous: 0,
  damage_explosion: 0,

  type: ENUM, // BULLET_TYPE_NORMAL, BULLET_TYPE_EXPLOSIVE, BULLET_TYPE_LASER
  class: ENUM, // BULLET_CLASS_WHITE, BULLET_CLASS_BLACK

  this.attribute = {
      pierce: false, // 穿透
  }

  // 特殊效果
  timer: 0,
  effect: ENUM, // BULLET_EFFECT_NONE, BULLET_EFFECT_FREEZE, BULLET_EFFECT_BURN

  colour: "#000",
  size: 0,
  shape: ENUM, // BULLET_SHAPE_CIRCLE, BULLET_SHAPE_RECT
}
```

#### 通信信息

##### 客户端向服务器发送的信息

```JavaScript
{
  key: {控制按键情况},
  name: "",
  color: "#000",

}
```

##### 服务器向客户端发送的信息

```JavaScript
{
  map_id: 1,
  players: Object.values(playerDic).map((player) => player.chara),
  yourIndex: {接收者的序号},
  time: new Date().getTime()
}
```

#### 简易物理引擎原理

即`move_player`函数的实现原理

 1. 由速度`vel`和当前位置`loc`计算出下一时刻的位置`tX`和`tY`
 2. 由玩家的行动确定基本加速度
 3. 确定一些变量:
    - `offset`: 其值略小于单位砖块大小的一半, 用于检查边界
    - `tile`: 玩家当前所处砖块的信息
    - 各个方向上的两个砖块(因为一个方向上会有两个砖块)
 4. 通过上下左右砖块的物理特性确定加速度
    - 摩擦力会由$a_{friction} = -\mu * a_{player}$计算得到
    - 根据当前砖块的`gravity`改变加速度
 5. 结算加速度并更新速度, 此时速度会受到地图和玩家自身的`vel_limit`的限制
 6. 玩家技能处理, 如冲刺等, 会突破速度限制
 7. 再取四周砖块的`bounce`最大值作为`bounce`的值, 直接乘在玩家的速度上  
       > 弹性会让速度**反向**, 因此放在最后处理  
       > 弹性的存在会让速度突破上限, 更具戏剧性  
 8. 结算速度并更新位置
 9. 检测出图, 玩家会被判定为坠落`fallen`状态
 10. 检测碰撞:  
    正常情况下, 玩家会和4个砖块发生碰撞*(玩家实际大小其实小于一个砖块)*  
    分别检测`x`和`y`方向上的碰撞, 如果发生碰撞, 会根据碰撞的砖块信息不断**微调玩家的位置**直至不发生碰撞  
    顺便还会有落地检测, 从而恢复玩家跳跃和冲刺的能力  
    此时位置为**最终确定的位置**  

### 开发中遇到的问题

#### 地图对象

地图信息由较小的map.json文件提供, 在实际游戏中会被转化成较大的map对象(每个砖块都会由一个数字转化为一个对象), 这会造成大量的内存占用  
为了实现一些特殊效果, 我期望在服务器修改砖块属性, 能够影响到所有的客户端  
如果传递地图对象, 会导致大量的数据传输, 造成不必要的性能占用  
> 当前想法是增量传输, 兼容性较好吧, 可以实现任意效果
每张图的砖块信息分为两种:

- 表层: 贴图 颜色 形状
- 底层: 物理属性 弹性 摩擦力
客户端看表层, 服务器看底层
如果要发生变化, 服务器就发送一个增量修改数组, 指出哪些坐标对应的砖块的新属性是什么  
也就是原地图画在*后面的图层*, 新的修改数组画在*前面的图层*

#### 视图转换

游戏中一共涉及到**4**个坐标系:

- **原始数组坐标系**: 数组形式存储的地图信息, 是以0开始的二维数组下标
- **数据坐标系**: 将原始数据乘上砖块的大小, 得到的**静态坐标系**
- **canvas坐标系**: 按照相机渲染出的canvas上的坐标系
- **html坐标系**: 实际html中窗口的坐标系

他们之间的转换关系如下:

- **原始数组坐标系**  乘上 `tilesize` -> **数据坐标系**
- **数据坐标系**  减去 `camera` -> **canvas坐标系**
- **canvas坐标系**  乘上 `zoomIndex` -> **html坐标系**

> 最重要的是**数据坐标系**, 静态且绝对
> **特别注意**: 所有实体的anchor点处在实体的正中央, 鼠标的canvas坐标在转换到数据坐标系时应当考虑到半个格子的偏移量  
> **特别注意**: 由于所有方块的anchor打在正中间, 为了确定某个数据坐标对应哪个方块, 应当将其减去半个格子的大小, 再取整数

**规定**: 地图信息使用*原始坐标*, `chara`和`item`等物体使用*数据坐标*  

其中`camera`基本跟踪玩家的静态坐标, 但是为了动态效果会有插值, 因此**canvas坐标系**是相对动态的
函数调用中:

 1. 存储下的坐标都是**数据坐标系**
 2. 绘制的坐标都是**canvas坐标系**

#### UI设计

参考了 *"死亡细胞"* 的UI  
![死亡细胞](./death_cell_ui.jpg)

### 加载地图的方法

#### 原地图

原先的实现思路: 将地图写在json中, 地图信息包括:

- 由编码表示的地图形状
- 各个编码对应的地图砖块的信息
  
服务端读取json文件, 然后逐一将地图中每个编码还原成对象, 储存在内存中  
这样, 就能随时调用地图对象, 进行碰撞检测, 物理效果等计算, 也只需要发一次给客户端就行  

但是这样的方法有两个缺点:

 1. 当地图较大时, 会占用大量内存
 2. 服务器修改地图信息后, 需要将整个地图对象传输给客户端(采取增量修改可能会好一点但不多)

#### 地图调用的优化

考虑将所有编码所对应的砖块信息确定下来, 这样不用每张地图都来一套独立的砖块信息  
然后编码由原先的数字改为字符串, 这样能拓展更多信息  
我的想法是, 每个编码写作: `"[type]_[bounce]_[friction]"`  

- 一般来说同一个`type`(比如弹力块), 就完全可以用统一的颜色(对玩家也友好), 因此颜色就不用写了
- `solid`也是基本和`type`有关的, 用`type`就能确定
- `friction`没必要两个值, 只需要一个  

> 还有像抓墙跳的方块, 完全可以新增一个`type`来表示  

这样的话, 编码表就可以写在一个`json`文件中确定下来  

##### 带有特殊机关的地图砖块

这类砖块(例如传送门)需要搭配自定义脚本, (例如机关门)会产生地图上的交互效果  
可以规定其编码为: `"#[type]_[arg1]_[arg2]_[arg3]_..."`
考虑到这些特殊砖块在不同地图中的独立性, 这些特定的脚本和编码应当写在相应的地图json文件中

### 随机地图的实现
>
> 主要参考[《Dead Cells》的随机地图生成](https://blog.csdn.net/august5291/article/details/120259340)

核心思路: **多参数的预制地图块** 和 **宏观地图调整**

#### 预制地图块

预先手工定制一些地图块(*map_module*), 包含了一些特定的特征, 如:

- 一个房间的基本构造
- 房间的出入口位置
- 房间的宽度和高度
- 房间的机关位置
- 房间内的地图特殊砖块配置

一些想法:

- 由于本游戏当前设计是多人战斗游戏, 因此要设计一些用于混战的地图块, 如:
  - 一个大房间, 多出入口, 中间有一些障碍物
  - 一些单向的房间, 将玩家引向中心房间
  - 一些狭窄的通道, 尽头是宝物
- 要有一定数量的宝物
- 玩家出生点要分散, 不能太靠近
- 整体风格统一, 地基以同一个砖块为主

#### 宏观地图调整

在整体上调整地图的连通性, 使得地图更加有趣, 更有复杂性:

- 玩家由四周向中间进发, 因此要有一定的引导性
- 重生点要分散, 不能太近
- 宝物房间应当分散给每一组玩家(相邻重生点的玩家周围要有宝物)

#### 实现细节

##### 框架搭建

 1. 先根据玩家数量确定地图的大小
 2. 选定一种地图框架(*map_frame*)(比如:大家都在高出, 集中点在下方, 或者在四周, 最后一起冲向中心)
 3. 基于框架, 确定玩家位置和集中点
 4. 随机取一些"必经点", 打上独立的`tag`

> `tag`表示地图块所属的集合, 尽量让路线独立开

##### 打通路

###### 通路与否的表示方法

对于一个 $n*m$ (n行m列) 的地图(指最小房间的数量)  
有$n-1$条水平的分隔线和$m-1$条垂直的分隔线  
每个**水平**分隔线上有$m$个可打通的位置, 可以用一个$m$位的二进制表示是否打通
所以所有**水平**分隔线的打通状态可以用一个长度为$n-1$的二进制数数组表示(竖直分隔线类似)  

```JavaScript
let n = 3, m = 5;
let horSplits = [0b01001, 0b00010]; 
let verSplits = [0b001, 0b100, 0b010, 0b001];
```

![随机地图打通路示意图][pic1]

###### 工具函数

 1. 获取一个二进制数的特定位的值

    ```JavaScript
    function getBit(num, k) {
      return (num >> k) & 1;
    }
    ```

 2. 对于坐标为`(x,y)`的房间, 返回其四周的分隔线状态

    ```JavaScript
    function getRoomSplits(x, y) {
      return {
        left: x>0 ? getBit(verSplits[x-1], y) : 0,
        right: getBit(verSplits[x], y),
        top: y>0 ? getBit(horSplits[y-1], x) : 0,
        bottom: getBit(horSplits[y], x),
      }
    }
    ```

 3. 打通或者关闭特定的分隔线

    ```JavaScript
    function switchSplit(isHor, index, k) {
      if(isHor) {
        horSplits[index] ^= 1 << k;
      } else {
        verSplits[index] ^= 1 << k;
      }
    }
    ```

##### 打通criticalPath的算法

用`BFS`算法, 从集中点开始, 按照规则打通路, 目标是打通*criticalPath*:  
规则:

- 宏观路线: 玩家出生点(*birthRoom*) > 必经点(*criticalRoom*) > 集中点(*jointRoom*); 第一部分叫探索区(*exploreArea*), 第二部分叫引导区(*guideArea*)
- 这个基本的路线称为*criticalPath*, 其他路线称为*sidePath*
- 在框架中, 各个区域互不相通, 仅由必经点互相连接
- 每个通道房间有且仅有两个出路口
- 每个房间都有一个`tag`, 用于表示它属于哪个区块
- 区块的命名规则: `P1_C1_exp`, `C1_J_gui`
  
流程:  

- 对于一个房间单元(坐标为`(x,y)`), 先检查其四周的分隔线状态
- 随便找一个方向打通
- 判断是否符合规则(对面房间的`tag`是否合适, 是否符合两个出口的规则)
- 如果不符合规则, 重新选择方向, 直到符合规则
- 无法从出发点打通到终点, 则打通失败, 整个重来(换种子重新开始)
- 打通一个就进行下一个房间(先保证是一条每个房间都只有2个出路口的通道)

##### 完善地图的sidPath

此时对于尚未打通的房间, 说明它们是sidPath, 也就是非关键路径  
选取一个房间, 设置为奖励房间/特殊房间, 用`DFS`连到*guideArea*区域  
若还有未打通的房间, 则用`BFS`连接到任意一个已经打通的房间  
循环直至所有房间都已打通

##### 匹配地图模块

现在所有通路情况和区块已经确定了, 根据通路形状决定地图模块  
在*guideArea*区域中的房间, 选取一些具有单向性的地图模块, 用于引导玩家

流程:

 1. 随机选择一个未确定的房间单元`c`
 2. 随机选择一个地图模块`m`
 3. 如果`c`作为`m`的中的某个房间时, `m`能匹配当前的通路形状, 则放置`m`在`c`的位置上, `m`覆盖的所有房间都标记为已确定, 随机调整`m`的参数, 在最终的地图数组中确定下来
 4. 如果`m`不能匹配, 重新选择`c`在`m`中的下一个位置
 5. 如果`m`的所有位置都尝试过了, 且没有一个能匹配, 则重新选择`m`
 6. 总有最基本的房间能匹配, 匹配成功后循环直至所有房间都已确定, 最终地图生成

## Version 2.2

仅专注于修改系统核心逻辑, 提升游戏性能  
用户端负责处理物理引擎, 服务器端仅处理信息收发和逻辑判定

### 使用方法

### 数据收发规范

相较于V2.1, V2.2的通信只使用一个端口, 通过详细的type定义来区分不同的信息  
`bullets`信息由`player`类代为储存, 无需另外传输

#### 用户向服务器发送

1. **类型**: `"player"`, `data`是用户的`game.player`对象(符合`player`类定义规范)  

2. **类型**: `"time"`, `data`是server发过去的时间戳
    - `time`: server当时的时间戳

#### 服务器向用户发送

大包装均为`{"type": string, "data": any}`的形式

1. **类型**: `"game"`, `data`包含当前玩家需要渲染的信息
    - `players`: 玩家信息数组
    - `items`: 物品信息数组
    > 服务器传出的players第一个必定是玩家自己

2. **类型**: `"map"`, `data`包含地图信息
    - `map_id`: 地图id
    - `map`: 地图信息数组
  
3. **类型**: `"pic"`, `data`是图片对象
    - `pic_src`: 图片的索引
    - `base64`: 图片的base64编码

4. **类型**: `"time"`, `data`包含server的时间戳和server计算出的延迟
    - `time`: server的时间戳
    - `latency`: server计算出的延迟

5. **类型**: `"signal"`, "data"用于传递一些特殊信息
    - `content`: 特殊信息
      - `"initialization_done"`: 服务器初始化该用户的信息完成
    - `augment`: 附加参数

[pic1]: <data:image/png;base64,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dv3Ta3e+dCktL/rqZ/+qVFl9/NNeqfcAX/+Pt5fntz3myS+z53Nz5/3724498TFuortZu+eU02L+wbnx14k2m81qtfqFT/7JcSc99rQz4lJBF37lH/u91jOe/4ZEIklLvnvhZ268/rvLq8ef/JB4Q8Bz3vPLv/hr70tnRJZcecm/DwfdHUc++MhjH65/vf2H36tu3IO7d8ZjX6ino9Hgztsuf9pzfsuM8eRrn/+7UnnlIWf8VLFssXbHrZddc9lnf/LM39eir8Bdt19+6bc++nOveIeeAnfe/NW1fbsf/SRbMf6i8/9lNBw86Zm/oacKa3tuvvjCc578jFcvLEtB3Wu+/7mjjnn42r5bc4XK0cc9cn3vLbfc9N0wV374Y35W76flH37fr77itWcnU2me3XPPjQ971E8jpBdXj9lxxIPvvPWyO2659NiTHnfM8Y/U+3fvum5r4+4HnfTgrWp19YiHbm3efeF5737SM1+9tHocfx30Oxed/69PesarweHTnvc7+kinXbv84k/NL2xf3fGgMx71NFf95+JvferUhz7TN8fX1/fhLujxxRecXd3a/ewXvMlxxfcuPKfbqT01qvsMXH3pZ/btufl1f/BBqKVerzfqa5/5yB+8/LUf5E/N+vp1V37xcU95xa03fTeTzh59gkgW4HsXnN3rtR79xJfkIzzT1EJp+VFP+F96ev5579q240Hl+e06mo3a3osv+NBJD37KcSfZcOeeu2+47orPP+ghP+lwclfzzg+vf/6Pj/0tpVtaotcdHHR58vcuu+TUP3/C7e+8qrevjfaRurdePAidLuFMT6er9emMJ5zuRz78uL9+R7xo7W1nveEtf/J2ezI399nPfvac9//vGRcKk9SoeFsH4p1vf+sH//kvbrtjr6/UcP7cdvrYjunkZDiOqz6g1LIm7TvSle0Am1sCq3H1BT7aGeSdtkWJV8JOtRNfwfGf2cSeD/3MTz3ult3zuvpVEJKecn0A7KulQlyjgkdG5ospCYnM81sJsYan+muKK+DGhBhOGB5gD+M1mUi0+iVaXsp2u8N4n3xQmstgGWd//3d/4xvfuvmySy9aKdRqXVuCD1jIY0UsYOF45RnG+Kn9YVqzz7/61a86+/uss84qFApveEO8+vj973//xz72MQ7oXWAiCi6bD5dxppRILioUodRy6SWX7Kxs7qnLImKx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>
