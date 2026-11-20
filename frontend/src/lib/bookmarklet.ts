/* The DealCheck browser button ("bookmarklet").

   When a shopper clicks it on an Amazon.in / Flipkart / Myntra product page, it reads — in the shopper's
   own browser — the product name, the selling price and the crossed-out MRP that the page is showing,
   then opens DealCheck with those values so the shopper can confirm them. Nothing is downloaded by a
   server and no bot visits the shop, so there is no scraping.

   Reading order (first match wins):
     1. Site-specific spots (Amazon's price block, Myntra's page data).
     2. Structured product data the page publishes for search engines (JSON-LD "offers.price").
     3. Generic fallback: the largest ₹ amount on the page = price; a crossed-out ₹ amount = MRP.
   If something can't be read, the confirm screen simply asks the shopper to type it. */

// Plain ES5 on purpose: it runs inside the shop's page, in any browser.
export const EXTRACTOR = `
function(){
  function num(t){ if(t==null) return null; var s=String(t).replace(/,/g,'').match(/(\\d+(?:\\.\\d+)?)/); var v=s?parseFloat(s[1]):null; return v&&v>0&&v<10000000?v:null; }
  function q(sel){ var e=document.querySelector(sel); return e ? (e.getAttribute('content') || e.textContent || '') : ''; }
  var h=location.hostname, price=null, mrp=null, pct=null, name='', status='', scope=document.body;
  try {
    if(/amazon\\./.test(h)){
      name=(q('#productTitle')||'').trim();
      scope=document.querySelector('#centerCol')||document.querySelector('#ppd')||document.body;
      if(/unavailable/i.test(q('#availability'))) status='unavailable';
      var C='#corePriceDisplay_desktop_feature_div ', A='#apex_desktop ';
      price=num(q(C+'.priceToPay .a-offscreen'))||num(q(C+'.priceToPay .a-price-whole'))||num(q(A+'.priceToPay .a-offscreen'))||num(q(A+'.priceToPay .a-price-whole'))||num(q(C+'.apex-pricetopay-accessibility-label'))||num(q('#corePrice_feature_div .a-price .a-offscreen'))||num(q('#priceblock_dealprice'))||num(q('#priceblock_ourprice'));
      mrp=num(q(C+'.basisPrice .a-offscreen'))||num(q(A+'.basisPrice .a-offscreen'))||num(q(C+'.a-text-price .a-offscreen'))||num(q('#corePrice_feature_div .a-text-price .a-offscreen'));
      pct=num(q(C+'.savingsPercentage'))||num(q(A+'.savingsPercentage'));
    } else if(/myntra\\./.test(h) && window.__myx && window.__myx.pdpData){
      var d=window.__myx.pdpData; name=d.name||''; if(d.price){ mrp=num(d.price.mrp); price=num(d.price.discounted)||mrp; }
    }
  } catch(e) {}
  if(!price && status!=='unavailable'){
    var ld=document.querySelectorAll('script[type="application/ld+json"]');
    for(var i=0;i<ld.length && !price;i++){
      try {
        var items=[].concat(JSON.parse(ld[i].textContent));
        for(var k=0;k<items.length;k++){
          var o=items[k]; if(!o) continue;
          if(o['@graph']) items=items.concat(o['@graph']);
          if(o.offers && /product/i.test(String(o['@type']||'Product'))){ var of=[].concat(o.offers)[0]||{}; price=num(of.price||of.lowPrice); if(!name) name=o.name||''; if(price) break; }
        }
      } catch(e) {}
    }
  }
  if(status!=='unavailable' && (!price || !mrp)){
    var amz=/amazon\\./.test(h), els=scope.querySelectorAll('*'), best=null, bestSize=0, seen=0;
    for(var j=0;j<els.length && seen<6000;j++){
      var el=els[j]; if(el.children.length>2) continue;
      if(el.closest('nav,header,footer,[role="navigation"]') || (amz && el.closest('a'))) continue;
      var t=el.textContent; if(!t || t.length>24) continue;
      var hasR=t.indexOf('\\u20B9')>=0, r=el.getBoundingClientRect(); if(!r.width || r.top+window.scrollY>1600) continue;
      var cs=getComputedStyle(el), fs=parseFloat(cs.fontSize)||0, v=num(t); if(!v) continue;
      var struck=(cs.textDecorationLine||cs.textDecoration||'').indexOf('line-through')>=0 || /^(DEL|S|STRIKE)$/.test(el.tagName);
      if(struck){ if(!mrp && fs>=12 && (hasR || fs>=16) && (!price || v>price)) mrp=v; continue; }
      if(!hasR) continue;
      seen++;
      if(!price && fs>bestSize){ bestSize=fs; best=v; }
    }
    if(!price && bestSize>=18) price=best;
  }
  if(!name) name=(document.querySelector('h1')||{}).textContent||document.title||'';
  if(price && mrp && mrp<price) mrp=null;
  return { u: location.href, n: String(name).replace(/\\s+/g,' ').trim().slice(0,200), p: status ? null : price, m: status ? null : mrp, d: status ? null : pct, s: status };
}`;

export function buildBookmarklet(origin: string): string {
  const body =
    `(function(){var x=(${EXTRACTOR})();` +
    `var j=JSON.stringify(x);var b=btoa(unescape(encodeURIComponent(j)));` +
    `window.open(${JSON.stringify(origin + "/check?obs=")}+encodeURIComponent(b),'_blank');})();`;
  // collapse whitespace so it fits comfortably in a bookmark
  return "javascript:" + body.replace(/\n\s*/g, "");
}

export interface Observation { u: string; n: string; p: number | null; m: number | null; d: number | null; s: string }

export function decodeObservation(param: string): Observation | null {
  try {
    const json = decodeURIComponent(escape(atob(param)));
    const o = JSON.parse(json);
    if (typeof o?.u !== "string") return null;
    const n = (v: unknown) => (typeof v === "number" && isFinite(v) && v > 0 ? v : null);
    return { u: o.u.slice(0, 2000), n: typeof o.n === "string" ? o.n.slice(0, 200) : "", p: n(o.p), m: n(o.m), d: n(o.d), s: typeof o.s === "string" ? o.s.slice(0, 20) : "" };
  } catch {
    return null;
  }
}
