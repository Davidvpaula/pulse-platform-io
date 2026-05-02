import DOMPurify from "dompurify";

/** Sanitiza HTML para renderização segura */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["h1","h2","h3","h4","h5","h6","p","ol","ul","li","strong","em","b","i","u","a","br","hr","table","thead","tbody","tr","th","td","blockquote","code","pre","span","div","img"],
    ALLOWED_ATTR: ["href","target","rel","src","alt","class","style"],
  });
}
