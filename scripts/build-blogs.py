#!/usr/bin/env python3
"""Generate /blogs/*.html pages and a posts manifest from assets/blogs/."""
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
BLOGS_DIR = ROOT / "assets" / "blogs"
OUT_DIR = ROOT / "blogs"


def slugify(title: str) -> str:
    s = title.lower().strip()
    s = (
        s.replace('"', "")
        .replace("'", "")
        .replace("“", "")
        .replace("”", "")
        .replace("—", "-")
        .replace("–", "-")
    )
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def md_to_html(body: str) -> str:
    """Lightweight markdown: paragraphs, bullets, hashtags, source line."""
    lines = body.splitlines()
    blocks: list[str] = []
    list_items: list[str] = []
    tags: list[str] = []
    source = ""

    def flush_list():
        nonlocal list_items
        if list_items:
            items = "".join(f"<li>{esc(i)}</li>" for i in list_items)
            blocks.append(f"<ul>{items}</ul>")
            list_items = []

    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped:
            flush_list()
            continue
        if stripped.startswith("Source:"):
            flush_list()
            source = stripped
            continue
        if stripped.startswith("#") and all(t.startswith("#") for t in stripped.split()):
            # hashtag line like #DevOps #Kubernetes
            flush_list()
            tags = [t for t in stripped.split() if t.startswith("#")]
            continue
        if stripped.startswith("- "):
            list_items.append(stripped[2:])
            continue
        flush_list()
        blocks.append(f"<p>{esc(stripped)}</p>")

    flush_list()
    if tags:
        tag_html = " ".join(f'<span class="blog-tag">{esc(t)}</span>' for t in tags)
        blocks.append(f'<div class="blog-tags">{tag_html}</div>')
    if source:
        blocks.append(f'<p class="blog-source">{esc(source)}</p>')
    return "\n".join(blocks)


def parse_blog(folder: Path) -> dict:
    title = folder.name
    md = folder / "blog.md"
    body_lines: list[str] = []
    if md.exists():
        lines = md.read_text(encoding="utf-8").splitlines()
        start = 1 if lines and lines[0].strip() else 0
        body_lines = lines[start:]
        while body_lines and not body_lines[0].strip():
            body_lines.pop(0)

    img = None
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        candidate = folder / f"{title}{ext}"
        if candidate.exists():
            img = candidate
            break
    if not img:
        for p in folder.iterdir():
            if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
                img = p
                break

    body = "\n".join(body_lines).strip()
    excerpt = "Read the full article."
    for para in body.split("\n"):
        p = para.strip()
        if not p or p.startswith("#") or p.startswith("Source:") or p.startswith("- "):
            continue
        excerpt = p
        break
    if len(excerpt) > 160:
        excerpt = excerpt[:157].rsplit(" ", 1)[0] + "…"

    return {
        "title": title,
        "slug": slugify(title),
        "folder": title,
        "image": img.name if img else None,
        "body": body,
        "excerpt": excerpt,
        "mtime": folder.stat().st_mtime,
    }


ARTICLE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Majd Rezik</title>
  <meta name="description" content="{excerpt}">
  <link href="../assets/img/favicon.ico" rel="icon">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="../assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
  <link href="../assets/css/command-center.css" rel="stylesheet">
</head>
<body class="blog-page">
  <nav class="cc-nav" aria-label="Primary">
    <a href="../index.html" class="cc-nav__brand">
      <span class="cc-nav__status" aria-hidden="true"></span>
      majdrezik@cloud:~
    </a>
    <ul class="cc-nav__links">
      <li><a href="../index.html#hero">/boot</a></li>
      <li><a href="../index.html#about">/about</a></li>
      <li><a href="../index.html#blogs" class="active">/blogs</a></li>
      <li><a href="../index.html#skills">/skills</a></li>
      <li><a href="../index.html#broadcasts">/radio</a></li>
    </ul>
  </nav>

  <main class="blog-article">
    <div class="cc-container blog-article__inner">
      <a class="blog-back" href="index.html"><i class="bi bi-arrow-left"></i> Back to blogs</a>
      <article class="blog-post panel">
        <div class="panel-header">
          <div class="panel-dots"><span></span><span></span><span></span></div>
          <span>~/blogs/{slug}.md</span>
        </div>
        <div class="panel-body blog-post__body">
          {hero_img}
          <div class="section-label">blog.post</div>
          <h1 class="blog-post__title">{title}</h1>
          <div class="blog-post__content">
            {content}
          </div>
        </div>
      </article>
    </div>
  </main>

  <footer id="footer">
    <div class="cc-container">
      <h3>majdrezik@cloud:~$</h3>
      <div class="copyright">&copy; Copyright <strong>Majd Rezik</strong>. All Rights Reserved</div>
    </div>
  </footer>
</body>
</html>
"""

INDEX_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blogs — Majd Rezik</title>
  <meta name="description" content="DevOps, cloud, Kubernetes, and AI infrastructure notes by Majd Rezik.">
  <link href="../assets/img/favicon.ico" rel="icon">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="../assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
  <link href="../assets/css/command-center.css" rel="stylesheet">
</head>
<body class="blog-page">
  <nav class="cc-nav" aria-label="Primary">
    <a href="../index.html" class="cc-nav__brand">
      <span class="cc-nav__status" aria-hidden="true"></span>
      majdrezik@cloud:~
    </a>
    <ul class="cc-nav__links">
      <li><a href="../index.html#hero">/boot</a></li>
      <li><a href="../index.html#about">/about</a></li>
      <li><a href="../index.html#blogs" class="active">/blogs</a></li>
      <li><a href="../index.html#skills">/skills</a></li>
    </ul>
  </nav>

  <main class="blog-index">
    <div class="cc-container">
      <div class="section-label">blog.stream</div>
      <h1 class="section-title">Blogs</h1>
      <p class="section-lead">Notes on DevOps, cloud, Kubernetes, and AI infrastructure.</p>
      <div class="blog-index-grid">
        {cards}
      </div>
    </div>
  </main>

  <footer id="footer">
    <div class="cc-container">
      <h3>majdrezik@cloud:~$</h3>
      <div class="copyright">&copy; Copyright <strong>Majd Rezik</strong>. All Rights Reserved</div>
    </div>
  </footer>
</body>
</html>
"""


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    posts = []
    for folder in BLOGS_DIR.iterdir():
        if folder.is_dir():
            posts.append(parse_blog(folder))
    posts.sort(key=lambda p: p["mtime"], reverse=True)

    # Clean old generated html (keep posts.json optional)
    for old in OUT_DIR.glob("*.html"):
        old.unlink()

    cards = []
    for p in posts:
        img_html = ""
        if p["image"]:
            # Encode each path segment so spaces / special chars work in browsers
            folder_enc = quote(p["folder"])
            img_enc = quote(p["image"])
            src = f"../assets/blogs/{folder_enc}/{img_enc}"
            img_html = f'<div class="blog-card__img"><img src="{src}" alt="{esc(p["title"])}"></div>'
            hero = f'<div class="blog-post__hero"><img src="{src}" alt="{esc(p["title"])}"></div>'
        else:
            hero = ""
            img_html = ""

        page = ARTICLE_TEMPLATE.format(
            title=esc(p["title"]),
            excerpt=esc(p["excerpt"]),
            slug=esc(p["slug"]),
            hero_img=hero,
            content=md_to_html(p["body"]),
        )
        (OUT_DIR / f"{p['slug']}.html").write_text(page, encoding="utf-8")

        cards.append(
            f"""
        <a class="blog-card" href="{esc(p['slug'])}.html">
          {img_html}
          <div class="blog-card__content">
            <div class="blog-card__meta">POST · ARTICLE</div>
            <h2>{esc(p['title'])}</h2>
            <p>{esc(p['excerpt'])}</p>
            <span class="blog-card__cta">Read article <i class="bi bi-arrow-right"></i></span>
          </div>
        </a>"""
        )

    index = INDEX_TEMPLATE.format(cards="\n".join(cards))
    (OUT_DIR / "index.html").write_text(index, encoding="utf-8")

    # Manifest for homepage carousel (paths relative to site root)
    manifest = []
    for p in posts:
        manifest.append(
            {
                "title": p["title"],
                "slug": p["slug"],
                "href": f"blogs/{p['slug']}.html",
                "image": f"assets/blogs/{p['folder']}/{p['image']}" if p["image"] else None,
                "excerpt": p["excerpt"],
            }
        )
    (OUT_DIR / "posts.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Generated {len(posts)} blog pages + index + posts.json")


if __name__ == "__main__":
    main()
