// /js/logic/os_detect.js
// Phase 0-3: OS detect (mobile guard)
// 責務：OS/UA判定だけ（UIやi18nには触らない）

window.OSDetect = {
  /**
   * iOS / Android / Mobi などをざっくり判定
   * - iPadOS (Macintosh + Mobile) も拾う
   */
  isMobile() {
    const ua = (navigator.userAgent || "").toLowerCase();

    const isAndroid = ua.includes("android");
    const isIPhone = ua.includes("iphone");
    const isIPad = ua.includes("ipad");
    const isIPod = ua.includes("ipod");

    // iPadOS 13+ は "Macintosh" を名乗りつつ "Mobile" が入るケースがある
    const isIPadOS = ua.includes("macintosh") && ua.includes("mobile");

    // 一般的な "mobi"（Android以外のスマホブラウザ）も補助的に拾う
    const isMobi = ua.includes("mobi");

    return isAndroid || isIPhone || isIPad || isIPod || isIPadOS || isMobi;
  }
};