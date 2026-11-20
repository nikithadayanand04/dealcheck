"""Extract (platform, product_id) from Amazon.in / Flipkart / Myntra links."""
import re
from urllib.parse import parse_qs, urlparse


class LinkError(ValueError):
    pass


AMAZON_HOSTS = {"amazon.in", "www.amazon.in", "m.amazon.in"}
FLIPKART_HOSTS = {"flipkart.com", "www.flipkart.com", "dl.flipkart.com"}
MYNTRA_HOSTS = {"myntra.com", "www.myntra.com"}
SHORT_HOSTS = {"amzn.in", "amzn.to", "fkrt.it", "fkrt.co", "myntr.it"}

ASIN_RE = re.compile(r"/(?:dp|gp/product|gp/aw/d|product)/([A-Z0-9]{10})(?:[/?]|$)", re.I)
FLIPKART_ITM_RE = re.compile(r"/p/(itm[a-z0-9]+)", re.I)


def parse_product_url(raw: str) -> tuple[str, str]:
    url = (raw or "").strip()
    if not url:
        raise LinkError("Please paste a product link.")
    if len(url) > 2000:
        raise LinkError("That link is too long. Please paste the product page link.")
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    if host in SHORT_HOSTS:
        raise LinkError("Shortened links can't be read. Open the link in your browser and paste the full product page address.")

    if host in AMAZON_HOSTS:
        m = ASIN_RE.search(parsed.path + "/")
        if not m:
            raise LinkError("We couldn't find the product code in this Amazon link. Please paste the product page link (it contains /dp/).")
        return "amazon", m.group(1).upper()

    if host in FLIPKART_HOSTS:
        pid = parse_qs(parsed.query).get("pid", [None])[0]
        if pid and re.fullmatch(r"[A-Za-z0-9]{8,20}", pid):
            return "flipkart", pid.upper()
        m = FLIPKART_ITM_RE.search(parsed.path)
        if m:
            return "flipkart", m.group(1).lower()
        raise LinkError("We couldn't find the product code in this Flipkart link. Please paste the product page link.")

    if host in MYNTRA_HOSTS:
        segments = [s for s in parsed.path.split("/") if s]
        if "buy" in segments:
            i = segments.index("buy")
            if i > 0 and segments[i - 1].isdigit():
                return "myntra", segments[i - 1]
        nums = [s for s in segments if s.isdigit() and len(s) >= 5]
        if nums:
            return "myntra", nums[-1]
        raise LinkError("We couldn't find the product code in this Myntra link. Please paste the product page link.")

    if host.endswith("amazon.com") or host.startswith("amazon."):
        raise LinkError("Only Amazon India (amazon.in) links are supported.")
    raise LinkError("We support Amazon.in, Flipkart and Myntra product links only.")


def normalise_product_id(platform: str, ppid: str) -> str:
    """Same ID format whether it came from a link or a CSV upload."""
    ppid = ppid.strip()
    if platform == "amazon":
        return ppid.upper()
    if platform == "flipkart":
        return ppid.lower() if ppid.lower().startswith("itm") else ppid.upper()
    return ppid
