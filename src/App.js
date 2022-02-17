import "./styles.css";
import F2 from "@antv/f2";
import { maxBy } from "lodash";
import { useEffect } from "react";
import { resData } from "./data";
import { getDisplayDotSort } from "./utils";
const resData1 = [];
export default function App() {
  useEffect(() => {
    const lineChart = new F2.Chart({
      id: `chart`,
      pixelRatio: window.devicePixelRatio
    });

    // 数组
    let newDataArr = [];
    let maxDataItem = maxBy(resData, (o) => o.number); // 找到值最大项
    let maximum = 20; // 默认最大值
    if (maxDataItem && maxDataItem.number) {
      maximum = maxDataItem.number; // 最大值存在就把取最大值
    }

    if (resData.length) {
      resData.map((item) => {
        // 灰色背景数据
        newDataArr.push({ ...item, backupNumber: maximum + 10 });
      });
    }

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

    let arrLength; //数组长度
    let xAxisTicks = []; //横坐标显示点

    if (resData.length) {
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
    console.log(xAxisTicks);

    lineChart.source(newDataArr, {
      number: {
        tickCount: 5,
        min: 0
      },
      date: {
        type: "cat",
        range: [0, 1],
        tickCount: 3,
        ticks: xAxisTicks // 首尾点和连续点的最后一个点
      }
    });
    lineChart.tooltip(false);
    lineChart.axis("number", false);
    lineChart.axis("backupNumber", false);
    lineChart.axis("date", {
      label: (text, index, total) => {
        const config = {};
        if (index === 0) {
          config.textAlign = "left";
        } else if (index === total - 1) {
          config.textAlign = "right";
        }

        return config;
      },
      line: null,
      labelOffset: 1
    });

    lineChart
      .area()
      .position("date*number")
      .color("l(90) 0:#096dd9 1:rgba(9,109,217,.4)");

    lineChart
      .interval()
      .position("date*backupNumber")
      .color("l(90) 0:rgba(245,245,245,0.18) 1:#eee");

    lineChart.line().position("date*number").color("#096dd9").style({
      lineWidth: 1
    });

    lineChart
      .point()
      .position("date*number")
      .color("#096dd9")
      .size("date*isDisplay", (date, isDisplay) => {
        if (isDisplay) return 3;
        return 0; // 根据文本长度返回长度
      })
      .style({
        // 统一为所有 shape 设置固定的样式
        lineWidth: 1,
        stroke: "#fff"
      });

    lineChart.render();

    return () => {
      lineChart && lineChart.destroy();
    };
  }, [resData]);

  useEffect(() => {
    window.onresize = function () {
      window.location.reload();
    };
  }, []);

  return (
    <div className="App">
      <canvas id="chart" style={{ width: "90%", height: "200px" }} />
    </div>
  );
}
