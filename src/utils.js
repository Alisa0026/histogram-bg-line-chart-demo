// 将连续显示点的最后一位组成的数组找出
export const getDisplayDotSort = (array) => {
  let res = [];
  array.forEach((item, i) => {
    let temp = res[res.length - 1] || [];
    // console.log(222, item, res, temp);

    if (item.index - temp[temp.length - 1]?.index === 1) {
      temp.push(item);
    } else {
      res.push([item]);
    }
  });
  // 连续点切割成数组，并取每个数组最后一个点返回
  return res.map((v) => v[v.length - 1]);
};
