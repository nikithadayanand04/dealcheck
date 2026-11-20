import pytest

from backend.app.urls import LinkError, parse_product_url


@pytest.mark.parametrize("url,expected", [
    ("https://www.amazon.in/boAt-Rockerz/dp/B0ABCDE123/ref=sr_1_1?keywords=x", ("amazon", "B0ABCDE123")),
    ("amazon.in/dp/b0abcde123", ("amazon", "B0ABCDE123")),
    ("https://www.amazon.in/gp/product/B0ABCDE123", ("amazon", "B0ABCDE123")),
    ("https://www.flipkart.com/some-phone/p/itm123abc?pid=MOBGTAGPTB3VS24W&lid=x", ("flipkart", "MOBGTAGPTB3VS24W")),
    ("https://www.flipkart.com/some-phone/p/itm123abc", ("flipkart", "itm123abc")),
    ("https://www.myntra.com/tshirts/brand/brand-men-tshirt/12345678/buy", ("myntra", "12345678")),
])
def test_valid_links(url, expected):
    assert parse_product_url(url) == expected


@pytest.mark.parametrize("url,msg", [
    ("", "paste a product link"),
    ("https://amzn.in/d/abc", "Shortened"),
    ("https://www.amazon.com/dp/B0ABCDE123", "Amazon India"),
    ("https://www.ebay.com/itm/1", "only"),
    ("https://www.amazon.in/s?k=headphones", "/dp/"),
    ("https://www.flipkart.com/search?q=x", "Flipkart"),
])
def test_invalid_links(url, msg):
    with pytest.raises(LinkError, match=msg):
        parse_product_url(url)
