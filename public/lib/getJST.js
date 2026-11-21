// Runtime/core/lib/getJST.js
/* global fetch, console */
// ------------------------------------------------------------
// JST Utility Functions (with NTP/HTTP Clock Sync)
// 日本標準時（JST）を扱うためのユーティリティ関数群（時刻ズレ補正機能付き）
// ------------------------------------------------------------

// 端末の時計と正確な時刻の差分（ミリ秒）
let clockOffsetMs = 0;
let isSynced = false;

/**
 * syncJST()
 * ------------------------------------------------------------
 * 外部の公開時刻API（デフォルトは Cloudflare エッジ、フォールバックに WorldTimeAPI）
 * から正確な現在時刻を取得し、端末の時計とのズレ（オフセット）を計算して保存する。
 * Syncs with public time APIs (Cloudflare edge by default, falling back to WorldTimeAPI)
 * and stores the clock offset against the local device clock.
 *
 * @param {string} [customApiUrl] 任意の時刻同期エンドポイントURL（省略時は内蔵のフォールバックリストを使用）
 * @returns {Promise<number>} 計算されたオフセット値（ミリ秒）
 */
export async function syncJST(customApiUrl) {
  // コピー時のURL短縮・パス欠落を防ぐためパスを結合して生成
  const endpoints = customApiUrl
    ? [customApiUrl]
    : [
        'https://www.cloudflare.com' + '/cdn-cgi/trace',
        'https://worldtimeapi.org' + '/api/timezone/Asia/Tokyo',
      ];

  for (const url of endpoints) {
    try {
      const t0 = Date.now();
      const response = await fetch(url, { cache: 'no-store' });
      const t3 = Date.now();

      if (!response.ok) continue;

      const text = await response.text();
      let serverTimeMs = null;

      if (text.trim().startsWith('{')) {
        // JSON形式（WorldTimeAPI など）
        const data = JSON.parse(text);
        if (typeof data.unix_timestamp === 'number') {
          serverTimeMs = data.unix_timestamp;
        } else if (typeof data.unixtime === 'number') {
          serverTimeMs = data.unixtime * 1000;
        }
      } else {
        // Cloudflare cdn-cgi/trace 形式（ts=1795272795.331）
        const match = text.match(/ts=([0-9.]+)/);
        if (match) {
          serverTimeMs = parseFloat(match[1]) * 1000;
        }
      }

      if (typeof serverTimeMs === 'number' && !isNaN(serverTimeMs)) {
        const roundTripTime = t3 - t0;
        clockOffsetMs = serverTimeMs - (t0 + roundTripTime / 2);
        isSynced = true;
        return clockOffsetMs;
      }
    } catch {
      // 次のエンドポイントへフォールバック
    }
  }

  console.warn('[getJST] すべての時刻同期APIに失敗しました。端末の時計を使用します。');
  return clockOffsetMs;
}

/**
 * getClockOffset()
 * ------------------------------------------------------------
 * 現在の補正値（ミリ秒）と同期状態を返す。
 */
export function getClockOffset() {
  return {
    offsetMs: Math.round(clockOffsetMs),
    isSynced,
  };
}

/**
 * 補正済みの現在時刻（Dateオブジェクト）を生成する内部ヘルパー
 */
function getCorrectedDate() {
  return new Date(Date.now() + clockOffsetMs);
}

/**
 * getJSTParts()
 * ------------------------------------------------------------
 * 現在時刻（補正済み）の JST 構成要素を取得する。
 */
export function getJSTParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  });

  // ここで補正済みの Date を使用
  const parts = formatter.formatToParts(getCorrectedDate());

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';

  return {
    yyyy: get('year'),
    mm: get('month'),
    dd: get('day'),
    hh: get('hour'),
    mi: get('minute'),
    ss: get('second'),
    ms: get('fractionalSecond'),
  };
}

export function getJSTISOString() {
  const { yyyy, mm, dd, hh, mi, ss, ms } = getJSTParts();
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}+09:00`;
}

export function getJSTISOStringNoMs() {
  const { yyyy, mm, dd, hh, mi, ss } = getJSTParts();
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+09:00`;
}

export function getJSTTimestamp() {
  const { yyyy, mm, dd, hh, mi, ss } = getJSTParts();
  return `${yyyy}-${mm}-${dd}_${hh}:${mi}:${ss}`;
}

export function getJSTCptTs() {
  const { yyyy, mm, dd, hh, mi, ss } = getJSTParts();
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}_jst`;
}

export function getJSTDate() {
  const { yyyy, mm, dd } = getJSTParts();
  return `${yyyy}${mm}${dd}`;
}

export function getJSTMillSec() {
  const { hh, mi, ss, ms } = getJSTParts();
  return `${hh}${mi}${ss}${ms}`;
}

export function getJSTDateMillSec() {
  const { yyyy, mm, dd, hh, mi, ss, ms } = getJSTParts();
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}${ms}_jst`;
}
