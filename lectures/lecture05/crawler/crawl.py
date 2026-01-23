import requests
import time
from bs4 import BeautifulSoup


class WebPageInfo(object):

    def __init__(self, url, links: list, title: str, headings: list):
        self.url = url
        self.links = links
        self.title = title
        self.headings = headings

    def __str__(self):
        formatted_links = "\n* ".join([link for link in self.links[:20]])
        return f"""
{'*' * 80}
url: {self.url}
title: {self.title}
headings: {', '.join(self.headings)}
links: 
* {formatted_links}
{'*' * 80}


    """


links_to_crawl = ["https://new.unca.edu"]
crawled_pages = []


def crawl(url):
    global links_to_crawl
    response = requests.get(url)

    # parse HTML:
    soup = BeautifulSoup(response.text, "html.parser")

    # Find and print all links on the page
    title = soup.title.string if soup.title else "No title found"
    page_links = []
    headings = [h1.get_text(strip=True) for h1 in soup.find_all("h1")]

    # extract links:
    for link in soup.find_all("a", href=True):
        full_link = link["href"]

        if full_link.lower().startswith("https://"):
            page_links.append(full_link)

    links_to_crawl += page_links

    crawled_pages.append(WebPageInfo(url, page_links, title, headings))


num_requests = 0

while len(links_to_crawl) > 0 and num_requests < 10:
    url = links_to_crawl.pop(0)
    print(f"Crawling {url}....")
    crawl(url)

    # Pausing for 1 second so this doesn't seem like a DOS attack :)
    time.sleep(1)
    num_requests += 1


# after the crawler completes, show all of the webpage data:
for page in crawled_pages:
    print(page)


# show all of the links that still need to be crawled:
print(
    f"\n\n{len(links_to_crawl)} links still need to be crawled. I'll print the first 20:"
)
for link in links_to_crawl[:20]:
    print(f"    * {link}")
