# antv/f2 实现柱状底色背景和折线图叠加显示效果

> 版权声明：本文为博主原创文章，未经博主允许不得转载。欢迎 Issues 留言。

# 一、背景

实际开发过程中，有时候 UI 的设计稿为了图表显示美观，可能发现设计稿上的图表与官方示例图表有很大差别。就比如我遇到的，以柱状图作为背景，每个柱形和折线图上每个点的数据一一对应，并显示出来。如下图效果，下面我们就讲解一下如何实现。

![示意图.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dba1da8178284789b3a1621c70cc63c7~tplv-k3u1fbpfcp-watermark.image?)

# 二、图形实现

首先，因为我是在移动端开发的，所以使用的 [antv/f2](https://f2.antv.vision/zh/examples/gallery#category-%E5%9F%BA%E7%A1%80%E6%8A%98%E7%BA%BF%E5%9B%BE) 这个库进行开发的。因为 F2 是针对移动端的可视化方案，非常方便。

## 1.安装

```js
npm install @antv/f2 --save
```

## 2.引入

```js
import F2 from "@antv/f2";
```

在 F2 引入页面后，我们就已经做好了创建一个图表的准备了。

## 3.创建图表

在页面上创建一个  `<canvas>`  并指定  `id`：

```js
<canvas id="chart" style={{ width: "90%", height: "200px" }} />
```

### 1）创建 Chart 图表对象，指定图表 ID、指定图表的宽高、边距等信息

我 demo 中只下面我设置了[pixelRatio](https://f2.antv.vision/zh/docs/api/chart/chart#pixelratio)，其他属性可以根据自己需要进行设置，参考文档 [Chart](https://f2.antv.vision/zh/docs/api/chart/chart#%E5%88%9B%E5%BB%BA-chart-%E5%AE%9E%E4%BE%8B)

```js
const lineChart = new F2.Chart({
  id: `chart`, // 指定对应 canvas 的 id
  // pixelRatio屏幕画布的像素比
  // 由于 canvas 在高清屏上显示时会模糊，所以需要设置 `pixelRatio`，一般情况下设置如下
  pixelRatio: window.devicePixelRatio
});
```

### 2）数据源处理

这里由于图形的特殊性，需要对数据源进行特殊处理再使用。先看一下我们要使用的数据源格式：

```js
const resData = [
    {
        date: "02.01",    // 日期：2月1日
        number: 0,        // 值
        isDisplay: false  // 标记这个点是否显示
    },
    {
        date: "02.02",
        number: 119,
        isDisplay: true
    }
    ...
]
```

首先我们需要从获取的数据源中找到`最大值`的项，如果返回的数据为空，我们需要设置一个`默认的最大值`，这里设置的是 `20`，如果最大值项存在则将最大值覆盖为我们找到的值。

```js
import { maxBy } from "lodash";
...
     // 数组
    let newDataArr = [];
    let maxDataItem = maxBy(resData, (o) => o.number); // 找到值最大项
    let maximum = 20; // 默认最大值

    if (maxDataItem && maxDataItem.number) {
      maximum = maxDataItem.number; // 最大值存在就把取最大值
    }
```

做完这个准备工作以后，肯定要疑惑要最大值干什么用呢？

> 因为当数据返回为空，我们默认只显示灰色背景的柱状图，默认最大值其实是给灰色背景数据做填充使用的，效果如下图。

![数据为空的情况.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ad794f3735f7432c9ede8203c5f6b822~tplv-k3u1fbpfcp-watermark.image?)

所以，如果返回的数据存在时，我们需要对数据进行改造，将灰色柱状图的数据的值用 `backupNumber` 来进行填充：

```js
// 返回数据不为空
if (resData.length) {
  resData.map((item) => {
    // 给每个数据源添加灰色背景数据，这里加 10 的作用是为了让柱状图可以比折线图的最大值点可以高一些距离
    newDataArr.push({ ...item, backupNumber: maximum + 10 });
  });
}
```

如果数据是空的话，`newDataArr`则是空数组，为了显示一个上面图所示的灰色柱状背景图作为缺省图，所以要手动对数据做个填充。默认显示 14 个柱。

```js
// 数据为空使用灰色数据部位
if (!newDataArr.length) {
  for (let i = 0; i < 14; i++) {
    newDataArr.push({
      date: i,
      isDisplay: false,
      backupNumber: maximum + 10
    });
  }
}
```

上面的数据处理完，下面针对一些特殊日期显示效果做个处理：

> 我们用数组 `xAxisTicks`来记录横坐标显示点，在后面载入数据源的时候会用到。

1. 第一天和最后一天的日期要显示在图上

   - 数据源存在的时候，第一天(`[resData[0].date]`)和最后一天(`resData[arrLength - 1].date`)的日期分别放入数组 `xAxisTicks`。

2. 针对 `isDisplay` 为 `true` 的点要显示日期，并在折线图中做标记
   - 对数据源进行`map`遍历，给每个数据家里索引`index`字段，对下一步有用
   - 然后过滤出 `isDisplay` 为 `true` 的数据，得到 `displayDotArr`。
3. 如果有多个连续日期需要显示，只显示连续日期中最后的一个日期
   - 实现一个 `getDisplayDotSort` 方法，可以把连续点的日期处理后只返回最有一点的日期

具体实现如下：

```js
// 具体实现
let arrLength; //数组长度
let xAxisTicks = []; //横坐标显示点

// 数据源存在
if (resData.length) {
  // 记录数据源长度
  arrLength = resData.length;
  // 第一天日期
  xAxisTicks = [resData[0].date];

  // 找到要显示坐标点的数组
  let displayDotArr = resData
    .map((item, i) => ({ ...item, index: i }))
    .filter((d) => d.isDisplay);

  // 横坐标要显示点的日期数组
  getDisplayDotSort(displayDotArr).forEach((d) => {
    xAxisTicks.push(d.date);
  });

  // 最后一天的日期
  xAxisTicks.push(resData[arrLength - 1].date);
}
```

`getDisplayDotSort`方法实现：

```js
export const getDisplayDotSort = (array) => {
  let res = [];
  // 遍历要显示的日期数组
  array.forEach((item, i) => {
    // 设置一个临时变量，可以取到数组的最后1位
    let temp = res[res.length - 1] || [];
    // 遍历的数据的索引 和 临时变量temp中最后一位数据的索引相差1则证明两数相邻，则temp改完遍历的当前的这个数据
    if (item.index - temp[temp.length - 1].index === 1) {
      // 相邻的数据都放到一个数组中
      temp.push(item);
    }
    // 其他的情况才放到res这个数组中
    else {
      //这里存的是[] 主要是为了将每个连续的点作为一组数据存放到一个数组中，和不相邻的区分开，最后形成2维数组
      res.push([item]);
    }
  });
  // 连续点切割成数组，并取每个数组最后一个点返回
  return res.map((v) => v[v.length - 1]);
};
```

最后处理的`res` 是一个二维数组，可以看到 `res[2]` 表示的是一个相邻的日期集合，针对相邻的日期，我们只取最后一个日期。
![数据处理示意图.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2edd9d96ecd04a888cff0c3611fae7f7~tplv-k3u1fbpfcp-watermark.image?)

处理后的数据源：

```js
const newDataArr = [
    {
        date: "02.01",    // 日期：2月1日
        number: 0,        // 值
        backupNumber: 432, // 灰色背景最大值
        isDisplay: false  // 标记这个点是否显示
    },
    {
        date: "02.02",
        number: 119,
        isDisplay: true,
        backupNumber: 432
    }
    ...
]
```

处理后的`xAxisTicks` 横坐标显示点数据如下：

```js
const xAxisTicks = ["02.01", "02.03", "02.07", "02.15", "02.18"];
```

这样我们就把 横坐标要显示的点处理完毕了。

### 3）载入数据源

针对数据的设置，参考[scale](https://f2.antv.vision/zh/docs/tutorial/scale)

```js
// newDataArr处理后的数据
lineChart.source(newDataArr, {
  // 各个属性配置
  number: {
    tickCount: 5, // 坐标轴上刻度点的个数，不同的度量类型对应不同的默认值。
    min: 0 // 手动指定最小值
  },
  date: {
    type: "cat", // 分类, ['男','女']；
    range: [0, 1], //输出数据的范围，数值类型的默认值为 [0, 1]，
    tickCount: 3, // 定义坐标轴刻度线的条数
    ticks: xAxisTicks // 用于指定坐标轴上刻度点的文本信息，这里是首尾点和连续点的最后一个点
  }
});
```

### 4）图表其他配置

参考文档中 [axis](https://f2.antv.vision/zh/docs/api/chart/axis) 和[tooltip](https://f2.antv.vision/zh/docs/api/chart/tooltip) 使用

![axis说明.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d69cd362297c4370bb625b748893775e~tplv-k3u1fbpfcp-watermark.image?)

```js
lineChart.tooltip(false); // 隐藏配置提示信息
lineChart.axis("number", false); // 关闭 number 对应的Y轴坐标轴。折线图要显示值的
lineChart.axis("backupNumber", false); // 关闭 backupNumber 对应的Y轴坐标轴。灰色柱状图的

lineChart.axis("date", {
  label: (text, index, total) => {
    // 底部日期x轴坐标文本设置
    const config = {};
    if (index === 0) {
      config.textAlign = "left"; // 第一个靠左显示
    } else if (index === total - 1) {
      config.textAlign = "right"; // 最后一个靠右显示
    }

    return config;
  },
  line: null, // 轴线隐藏
  labelOffset: 1 // 坐标轴文本距离轴线的距离
});
```

### 5）创建图形语法

参考文档[几何标记和图表类型](https://f2.antv.vision/zh/docs/tutorial/geometry/#%E5%87%A0%E4%BD%95%E6%A0%87%E8%AE%B0%E5%92%8C%E5%9B%BE%E8%A1%A8%E7%B1%BB%E5%9E%8B)，

![几何标记.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49d3a4177edd4aa980c75cf61703f61b~tplv-k3u1fbpfcp-watermark.image?)

![图表类型.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/aa3ec13513c64ff3a64c3b2fc3ae0a7f~tplv-k3u1fbpfcp-watermark.image?)

#### 1. `interval` 创建柱状背景图

几何标记 `interval` 创建柱状图，[position](https://f2.antv.vision/zh/docs/tutorial/attribute/#position-%E4%BD%8D%E7%BD%AE%E5%B1%9E%E6%80%A7) 确定 x 轴和 y 轴的数据字段，
[color](https://www.yuque.com/antv/f2/canvas#zrhdmb)渐变色设置。

这里 color 用的是线性渐变：

![color线性渐变.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c6f6622643354e1facfb335763b792bc~tplv-k3u1fbpfcp-watermark.image?)

```js
lineChart
  .interval()
  // 将 'date' 数据值映射至 x 轴坐标点，'backupNumber' 数据值映射至 y 轴坐标点
  .position("date*backupNumber")
  .color("l(90) 0:rgba(245,245,245,0.18) 1:#eee");
```

效果如下：
![柱状背景.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/75c32a2d6fa04b90862150d207357d2d~tplv-k3u1fbpfcp-watermark.image?)

#### 2. `line` 创建折线图

这里使用的属性同上，[style 参考这里](https://f2.antv.vision/zh/docs/api/chart/geometry#style) ，统一为所有 shape 设置固定的样式，具体设置内容可以看[绘图属性](https://www.yuque.com/antv/f2/canvas)

```js
lineChart.line().position("date*number").color("#096dd9").style({
  lineWidth: 1 // 设置线段厚度的属性
});
```

叠加折线图后效果如下：
![叠加折线图后.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/88605f80b8734e5c8d3ea14d0676d063~tplv-k3u1fbpfcp-watermark.image?)

#### 3. `point` 创建点图

这里的属性 [size](https://f2.antv.vision/zh/docs/api/chart/geometry#size) 是将数据值映射到图形的大小上的方法

**注意：**   不同图形的 size 的含义有所差别：

- point 图形的 size 影响点的半径大小；
- line, area, path 中的 size 影响线的粗细；
- interval 的 size 影响柱状图的宽度。

```js
lineChart
  .point()
  .position("date*number")
  .color("#096dd9")
  .size("date*isDisplay", (date, isDisplay) => {
    if (isDisplay) return 3; // 要显示的点大小
    return 0; // 不显示的带你大小为0
  })
  .style({
    // 统一为所有 shape 设置固定的样式
    lineWidth: 1,
    stroke: "#fff" // 绘制图形颜色
  });
```

叠加点图后效果如下：
![叠加点图后.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6b2e534df7404fd5aad9bd54ea2739c3~tplv-k3u1fbpfcp-watermark.image?)

#### 4. `area` 创建面积图

```js
lineChart
  .area()
  .position("date*number")
  .color("l(90) 0:#096dd9 1:rgba(9,109,217,.4)");
```

叠加面积图后：

![叠加面积图后.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c93a62321bbd4f0a82c5de3e14241287~tplv-k3u1fbpfcp-watermark.image?)

### 6）渲染图表

渲染图表，在最后调用，这样我们的图表就绘制完成了：

```js
lineChart.render();
```

最终效果如妥所示：
![叠加面积图后.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c93a62321bbd4f0a82c5de3e14241287~tplv-k3u1fbpfcp-watermark.image?)

[点击查看以上完整 demo 代码](https://codesandbox.io/s/zhu-zhuang-bei-jing-zhe-xian-tu-4lphj)

# 参考文献

- [antv/f2](https://f2.antv.vision/zh/docs/tutorial/getting-started)
- [f2 基础折线图示例](https://f2.antv.vision/zh/examples/line/line#basic)
