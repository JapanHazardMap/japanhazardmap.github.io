var getJST = (() => {
  var y = Object.defineProperty;
  var f = Object.getOwnPropertyDescriptor;
  var d = Object.getOwnPropertyNames;
  var h = Object.prototype.hasOwnProperty;
  var p = (n, e) => {
      for (var t in e) y(n, t, { get: e[t], enumerable: !0 });
    },
    l = (n, e, t, s) => {
      if ((e && typeof e == 'object') || typeof e == 'function')
        for (let o of d(e))
          !h.call(n, o) &&
            o !== t &&
            y(n, o, { get: () => e[o], enumerable: !(s = f(e, o)) || s.enumerable });
      return n;
    };
  var T = (n) => l(y({}, '__esModule', { value: !0 }), n);
  var C = {};
  p(C, {
    getClockOffset: () => S,
    getJSTCptTs: () => M,
    getJSTDate: () => k,
    getJSTDateMillSec: () => _,
    getJSTISOString: () => w,
    getJSTISOStringNoMs: () => J,
    getJSTMillSec: () => O,
    getJSTParts: () => c,
    getJSTTimestamp: () => D,
    syncJST: () => g,
  });
  var u = 0,
    $ = !1;
  async function g(n) {
    let e = n
      ? [n]
      : [
          'https://www.cloudflare.com/cdn-cgi/trace',
          'https://worldtimeapi.org/api/timezone/Asia/Tokyo',
        ];
    for (let t of e)
      try {
        let s = Date.now(),
          o = await fetch(t, { cache: 'no-store' }),
          r = Date.now();
        if (!o.ok) continue;
        let m = await o.text(),
          a = null;
        if (m.trim().startsWith('{')) {
          let i = JSON.parse(m);
          typeof i.unix_timestamp == 'number'
            ? (a = i.unix_timestamp)
            : typeof i.unixtime == 'number' && (a = i.unixtime * 1e3);
        } else {
          let i = m.match(/ts=([0-9.]+)/);
          i && (a = parseFloat(i[1]) * 1e3);
        }
        if (typeof a == 'number' && !isNaN(a)) {
          let i = r - s;
          return ((u = a - (s + i / 2)), ($ = !0), u);
        }
      } catch {}
    return (
      console.warn(
        '[getJST] \u3059\u3079\u3066\u306E\u6642\u523B\u540C\u671FAPI\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u7AEF\u672B\u306E\u6642\u8A08\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002',
      ),
      u
    );
  }
  function S() {
    return { offsetMs: Math.round(u), isSynced: $ };
  }
  function x() {
    return new Date(Date.now() + u);
  }
  function c() {
    let e = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        hour12: !1,
      }).formatToParts(x()),
      t = (s) => e.find((o) => o.type === s)?.value ?? '';
    return {
      yyyy: t('year'),
      mm: t('month'),
      dd: t('day'),
      hh: t('hour'),
      mi: t('minute'),
      ss: t('second'),
      ms: t('fractionalSecond'),
    };
  }
  function w() {
    let { yyyy: n, mm: e, dd: t, hh: s, mi: o, ss: r, ms: m } = c();
    return `${n}-${e}-${t}T${s}:${o}:${r}.${m}+09:00`;
  }
  function J() {
    let { yyyy: n, mm: e, dd: t, hh: s, mi: o, ss: r } = c();
    return `${n}-${e}-${t}T${s}:${o}:${r}+09:00`;
  }
  function D() {
    let { yyyy: n, mm: e, dd: t, hh: s, mi: o, ss: r } = c();
    return `${n}-${e}-${t}_${s}:${o}:${r}`;
  }
  function M() {
    let { yyyy: n, mm: e, dd: t, hh: s, mi: o, ss: r } = c();
    return `${n}${e}${t}T${s}${o}${r}_jst`;
  }
  function k() {
    let { yyyy: n, mm: e, dd: t } = c();
    return `${n}${e}${t}`;
  }
  function O() {
    let { hh: n, mi: e, ss: t, ms: s } = c();
    return `${n}${e}${t}${s}`;
  }
  function _() {
    let { yyyy: n, mm: e, dd: t, hh: s, mi: o, ss: r, ms: m } = c();
    return `${n}${e}${t}T${s}${o}${r}${m}_jst`;
  }
  return T(C);
})();
