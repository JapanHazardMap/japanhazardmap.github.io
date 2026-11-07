// Workspace/your_open_repos/ViewerServer/bin/getJST.js
// ------------------------------------------------------------
// JST Utility Functions
// 日本標準時（JST）を扱うためのユーティリティ関数群。
// ------------------------------------------------------------
/**
 * getJSTParts()
 * ------------------------------------------------------------
 * 現在時刻の JST 構成要素を取得する。
 * Returns decomposed date/time parts in JST.
 */
function getJSTParts() {
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

  const parts = formatter.formatToParts(new Date());

  const get = (type) =>
    parts.find((p) => p.type === type)?.value ?? '';

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
/**
 * getJSTISOString()
 * ------------------------------------------------------------
 * 日本時間（JST）の ISO8601 文字列（ミリ秒あり）を返す。
 * Returns an ISO8601 timestamp in JST with milliseconds.
 *
 * 例 / Example:
 *   2026-10-11T06:19:10.414+09:00
 *
 * 用途 / Usage:
 * - 精密ログ
 * - API 出力
 * - 時刻の厳密比較が必要な場面
 */
export function getJSTISOString() {
  const { yyyy, mm, dd, hh, mi, ss, ms } = getJSTParts();
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}+09:00`;
}
/**
 * getJSTISOStringNoMs()
 * ------------------------------------------------------------
 * 日本時間（JST）の ISO8601 文字列（ミリ秒なし）を返す。
 * Returns an ISO8601 timestamp in JST without milliseconds.
 *
 * 例 / Example:
 *   2026-10-11T06:19:10+09:00
 *
 * 用途 / Usage:
 * - ミリ秒不要のログ
 * - ファイル名や簡易的な時刻表現
 */
export function getJSTISOStringNoMs() {
  const { yyyy, mm, dd, hh, mi, ss } = getJSTParts();
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+09:00`;
}
/**
 * getJSTTimestamp()
 * ------------------------------------------------------------
 * ログ向けの読みやすい JST タイムスタンプを返す。
 * Returns a human‑readable JST timestamp for logs.
 *
 * 例 / Example:
 *   2026-10-11_06:19:10
 *
 * 用途 / Usage:
 * - ログファイル名
 * - 人間が読むログ出力
 */
export function getJSTTimestamp() {
  const { yyyy, mm, dd, hh, mi, ss } = getJSTParts();
  return `${yyyy}-${mm}-${dd}_${hh}:${mi}:${ss}`;
}
/**
 * getJSTCptTs()
 * ------------------------------------------------------------
 * コンパクトな JST タイムスタンプ（ファイル名向け）。
 * Returns a compact ISO8601-like JST timestamp for filenames.
 *
 * 例 / Example:
 *   20261011T061910_jst
 *
 * 用途 / Usage:
 * - ファイル名
 * - ZIP 情報のスナップショット
 */
export function getJSTCptTs() {
  const { yyyy, mm, dd, hh, mi, ss } = getJSTParts();
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}_jst`;
}
/**
 * getJSTDate()
 * ------------------------------------------------------------
 * 日本時間（JST）の日付（YYYYMMDD）を返す。
 * Returns a JST date string in YYYYMMDD format.
 *
 * 例 / Example:
 *   20261011
 *
 * 用途 / Usage:
 * - zipList.json の scanDate
 * - 日付単位の処理識別子
 * - 差分処理・途中再開の基準
 */
export function getJSTDate() {
  const { yyyy, mm, dd } = getJSTParts();
  return `${yyyy}${mm}${dd}`;
}
/**
 * getJSTMillSec()
 * ------------------------------------------------------------
 * 日本時間（JST）の時刻（HHMMSSmmm）を返す（ミリ秒まで）。
 * Returns a compact JST time string including milliseconds (HHMMSSmmm).
 *
 * 例 / Example:
 *   061910416
 *
 * 用途 / Usage:
 * - zipList.json の scanTime（ZIP スキャン時刻の一意性確保）
 * - 並列処理時の衝突回避
 * - ZIP の順序管理（order と組み合わせて完全一意化）
 */
export function getJSTMillSec() {
  const { hh, mi, ss, ms } = getJSTParts();
  return `${hh}${mi}${ss}${ms}`;
}

export function getJSTDateMillSec() {
  const { yyyy, mm, dd, hh, mi, ss, ms } = getJSTParts();
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}${ms}_jst`;
}

