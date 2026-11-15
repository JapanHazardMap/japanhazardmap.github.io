// public/viewer/citizen-geo.js

export const PREF_NAMES = {
  '01': '北海道',
  '02': '青森県',
  '03': '岩手県',
  '04': '宮城県',
  '05': '秋田県',
  '06': '山形県',
  '07': '福島県',
  '08': '茨城県',
  '09': '栃木県',
  10: '群馬県',
  11: '埼玉県',
  12: '千葉県',
  13: '東京都',
  14: '神奈川県',
  15: '新潟県',
  16: '富山県',
  17: '石川県',
  18: '福井県',
  19: '山梨県',
  20: '長野県',
  21: '岐阜県',
  22: '静岡県',
  23: '愛知県',
  24: '三重県',
  25: '滋賀県',
  26: '京都府',
  27: '大阪府',
  28: '兵庫県',
  29: '奈良県',
  30: '和歌山県',
  31: '鳥取県',
  32: '島根県',
  33: '岡山県',
  34: '広島県',
  35: '山口県',
  36: '徳島県',
  37: '香川県',
  38: '愛媛県',
  39: '高知県',
  40: '福岡県',
  41: '佐賀県',
  42: '長崎県',
  43: '熊本県',
  44: '大分県',
  45: '宮崎県',
  46: '鹿児島県',
  47: '沖縄県',
};

export function createCircleGeoJSON(lon, lat, radiusMeters = 500, steps = 64) {
  const coords = [];
  const earthRadius = 6378137;
  const latRad = (lat * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const dLat = (dy / earthRadius) * (180 / Math.PI);
    const dLon = (dx / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
    coords.push([lon + dLon, lat + dLat]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { radius: radiusMeters },
        geometry: { type: 'Polygon', coordinates: [coords] },
      },
    ],
  };
}

export function getCircleBBox(circleGeoJSON) {
  const ring = circleGeoJSON.features[0].geometry.coordinates[0];
  const lons = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

export function intersectsBBox(bboxA, bboxB) {
  if (!Array.isArray(bboxA) || !Array.isArray(bboxB) || bboxA.length < 4 || bboxB.length < 4) {
    return false;
  }
  return !(
    bboxA[2] < bboxB[0] ||
    bboxA[0] > bboxB[2] ||
    bboxA[3] < bboxB[1] ||
    bboxA[1] > bboxB[3]
  );
}
