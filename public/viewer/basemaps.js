// Workspace/publicRepos/JapanHazardMap/japanhazardmap.github.io/public/viewer/basemaps.js

export const BASEMAPS = {
  pale: {
    id: "pale",
    label: "地理院地図（淡色）",
    tiles: ["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"],
    attribution: '<a href="https://gsi.go.jp" target="_blank">国土地理院</a>',
    maxzoom: 18
  },
  std: {
    id: "std",
    label: "地理院地図（標準）",
    tiles: ["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"],
    attribution: '<a href="https://gsi.go.jp" target="_blank">国土地理院</a>',
    maxzoom: 18
  },
  seamlessphoto: {
    id: "seamlessphoto",
    label: "航空写真（全国最新）",
    tiles: ["https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg"],
    attribution: '<a href="https://gsi.go.jp" target="_blank">国土地理院</a>',
    maxzoom: 18
  },
  blank: {
    id: "blank",
    label: "白地図（単色グレー）",
    tiles: ["https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png"],
    attribution: '<a href="https://gsi.go.jp" target="_blank">国土地理院</a>',
    maxzoom: 18
  }
};

