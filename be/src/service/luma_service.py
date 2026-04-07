"""
luma_service.py
---------------
Fetches a public Luma event page and extracts structured event data.

Confirmed __NEXT_DATA__ structure (luma.com, 2025):
  props.pageProps.initialData.data  (51 keys)
    .event {22}           ← name, end_at, geo_address_info, …
    .start_at             ← start time IS at data level, not inside .event
    .hosts[]              ← hosts at data level
    .cover_image {url, …} ← object, not plain string
    .description_mirror   ← ProseMirror JSON (the "이벤트 소개" section)

Extraction strategy (priority order):
  0. Luma internal API  api.lu.ma/public/v1/event/get?api_id={slug}
  1. __NEXT_DATA__ — confirmed path  props.pageProps.initialData.data
  2. __NEXT_DATA__ — dehydratedState.queries[] deep search
  3. __NEXT_DATA__ — full recursive event-object search
  4. JSON-LD  <script type="application/ld+json">
  5. Open Graph / meta tags  (title/description/image only — no times)
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx
from bs4 import BeautifulSoup

try:
    from markdownify import markdownify as _md_convert
    _MARKDOWNIFY_AVAILABLE = True
except ImportError:
    _MARKDOWNIFY_AVAILABLE = False

from src.schema.seminar import LumaPreviewResponse

logger = logging.getLogger(__name__)

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
_API_HEADERS = {
    "User-Agent": "kpai-seminar-import/1.0",
    "Accept": "application/json",
}
_FETCH_TIMEOUT = 12.0


class LumaService:

    async def preview(self, url: str) -> LumaPreviewResponse:
        source_url = url.strip()
        warnings: list[str] = []

        # ── Strategy 0: Luma internal API ────────────────────────────────────
        slug = _slug_from_url(source_url)
        if slug:
            result = await _fetch_luma_api(slug, warnings)
            if result:
                return _build_response(result, source_url, warnings)

        # ── Fetch HTML ────────────────────────────────────────────────────────
        html: str | None = None
        try:
            async with httpx.AsyncClient(
                headers=_BROWSER_HEADERS,
                follow_redirects=True,
                timeout=_FETCH_TIMEOUT,
            ) as client:
                resp = await client.get(source_url)
                resp.raise_for_status()
                html = resp.text
        except httpx.HTTPStatusError as exc:
            warnings.append(f"HTTP {exc.response.status_code} fetching page")
        except httpx.RequestError as exc:
            warnings.append(f"Network error fetching page: {exc}")
        except Exception as exc:
            warnings.append(f"Unexpected error fetching page: {exc}")

        if html is None:
            return LumaPreviewResponse(
                source_url=source_url, extracted_fields=[], warnings=warnings
            )

        soup = BeautifulSoup(html, "html.parser")

        # ── Strategy 1–3: __NEXT_DATA__ ───────────────────────────────────────
        result = _extract_from_next_data(soup, warnings)

        # ── Strategy 4: JSON-LD ───────────────────────────────────────────────
        if not result:
            result = _extract_from_json_ld(soup, warnings)

        # ── Strategy 5: Open Graph / meta tags ────────────────────────────────
        if not result:
            result = _extract_from_og_tags(soup, warnings)
            if result:
                warnings.append(
                    "Only Open Graph tags found — start/end times could not be extracted"
                )

        if not result:
            warnings.append("Could not extract any event data from the page")
            return LumaPreviewResponse(
                source_url=source_url, extracted_fields=[], warnings=warnings
            )

        return _build_response(result, source_url, warnings)


# ── Strategy 0: Luma internal API ────────────────────────────────────────────

def _slug_from_url(url: str) -> str | None:
    m = re.search(r"(?:luma\.com|lu\.ma)/([A-Za-z0-9_-]+)", url)
    return m.group(1) if m else None


async def _fetch_luma_api(slug: str, warnings: list[str]) -> dict[str, Any] | None:
    api_url = f"https://api.lu.ma/public/v1/event/get?api_id={slug}"
    try:
        async with httpx.AsyncClient(
            headers=_API_HEADERS, follow_redirects=True, timeout=_FETCH_TIMEOUT
        ) as client:
            resp = await client.get(api_url)
            if resp.status_code in (401, 403, 404):
                return None
            resp.raise_for_status()
            payload = resp.json()
    except Exception as exc:
        logger.debug("Luma API fetch failed for slug %s: %s", slug, exc)
        return None

    event = payload.get("event") or payload
    if not isinstance(event, dict) or not event.get("name"):
        return None

    return _map_luma_data(event, payload.get("hosts") or [])


# ── Strategy 1–3: __NEXT_DATA__ ──────────────────────────────────────────────

def _extract_from_next_data(
    soup: BeautifulSoup,
    warnings: list[str],
) -> dict[str, Any] | None:
    tag = soup.find("script", {"id": "__NEXT_DATA__"})
    if not tag or not tag.string:
        return None

    try:
        root = json.loads(tag.string)
    except json.JSONDecodeError as exc:
        warnings.append(f"__NEXT_DATA__ JSON parse error: {exc}")
        return None

    page_props = _deep_get(root, "props", "pageProps") or {}

    # ── 1a. Confirmed 2025 structure: pageProps.initialData.data ─────────────
    data = _deep_get(page_props, "initialData", "data")
    if isinstance(data, dict) and data.get("start_at"):
        return _map_luma_data_envelope(data)

    # ── 1b. Other known fixed paths ───────────────────────────────────────────
    for path in [
        ("event",),
        ("initialData", "event"),
        ("initialEventData", "event"),
        ("data", "event"),
        ("eventData",),
    ]:
        candidate = _deep_get(page_props, *path)
        if _is_event_object(candidate):
            parent_path = path[:-1]
            parent = _deep_get(page_props, *parent_path) if parent_path else page_props
            hosts = (parent or {}).get("hosts") or candidate.get("hosts") or []
            return _map_luma_data(candidate, hosts)

    # ── 1c. dehydratedState.queries (React-Query / TanStack cache) ────────────
    queries = _deep_get(page_props, "dehydratedState", "queries")
    if isinstance(queries, list):
        for q in queries:
            state_data = _deep_get(q, "state", "data")
            if isinstance(state_data, dict):
                if _is_event_object(state_data):
                    return _map_luma_data(state_data, state_data.get("hosts") or [])
                inner = state_data.get("event")
                if _is_event_object(inner):
                    return _map_luma_data(inner, state_data.get("hosts") or [])
                # data-envelope pattern (start_at at top level)
                if state_data.get("start_at"):
                    return _map_luma_data_envelope(state_data)

    # ── 1d. Full recursive search ─────────────────────────────────────────────
    found = _recursive_find_event(root, max_depth=8)
    if found:
        return _map_luma_data(found, found.get("hosts") or [])

    warnings.append("__NEXT_DATA__ found but event object not located inside it")
    return None


def _is_event_object(obj: Any) -> bool:
    """Heuristic: dict with name + start_at = Luma event."""
    return isinstance(obj, dict) and bool(obj.get("name") and obj.get("start_at"))


def _recursive_find_event(obj: Any, max_depth: int, _depth: int = 0) -> dict | None:
    if _depth > max_depth:
        return None
    if isinstance(obj, dict):
        if _is_event_object(obj):
            score = sum(1 for k in ("name", "start_at", "end_at", "cover_url",
                                    "description", "hosts", "geo_address_info") if k in obj)
            if score >= 3:
                return obj
        for v in obj.values():
            r = _recursive_find_event(v, max_depth, _depth + 1)
            if r:
                return r
    elif isinstance(obj, list):
        for item in obj:
            r = _recursive_find_event(item, max_depth, _depth + 1)
            if r:
                return r
    return None


# ── Field mapping ─────────────────────────────────────────────────────────────

def _map_luma_data_envelope(data: dict) -> dict[str, Any]:
    """
    Map the confirmed 2025 __NEXT_DATA__ structure where:
      data.start_at           — start time
      data.hosts[]            — host list
      data.cover_image        — {url: …} or {public_id: …} object
      data.event              — sub-object containing name, end_at, geo_address_info, …
      data.description_mirror — ProseMirror JSON ("이벤트 소개" section)
    """
    event_sub = data.get("event") or {}
    hosts = data.get("hosts") or event_sub.get("hosts") or []

    result: dict[str, Any] = {}

    # Title lives inside data.event.name
    result["title"] = event_sub.get("name") or data.get("name")

    # Times: start_at is at data level; end_at may be in either place
    result["start_time"] = _normalise_datetime(data.get("start_at"))
    result["end_time"] = _normalise_datetime(
        data.get("end_at") or event_sub.get("end_at")
    )

    # Timezone — record for warning so staff knows KST conversion happened
    tz = event_sub.get("timezone") or data.get("timezone")
    if tz:
        result["_event_timezone"] = tz

    # Host
    if hosts and isinstance(hosts, list) and isinstance(hosts[0], dict):
        h = hosts[0]
        result["host"] = h.get("name") or h.get("display_name") or h.get("username")

    # Cover image — may be {url, public_id}, {public_id, blurDataURL}, or plain string
    cover = data.get("cover_image") or event_sub.get("cover_image") or {}
    result["cover_image"] = _extract_cover_url(cover) or event_sub.get("cover_url")

    # Location from event sub-object
    geo = event_sub.get("geo_address_info") or event_sub.get("location") or {}
    if isinstance(geo, dict):
        result["location"] = (
            geo.get("full_address") or geo.get("address") or geo.get("name")
        )
    elif isinstance(geo, str):
        result["location"] = geo or None
    if not result.get("location"):
        result["location"] = (
            event_sub.get("zoom_meeting_url")
            or event_sub.get("meeting_url")
            or (event_sub.get("virtual_info") or {}).get("url")
        )

    # Description — ProseMirror JSON stored in description_mirror
    desc_mirror = data.get("description_mirror") or event_sub.get("description_mirror")
    if desc_mirror and isinstance(desc_mirror, dict):
        md = _prosemirror_to_markdown(desc_mirror).strip()
        result["description"] = md or None
    else:
        # Fallback: plain description string
        result["description"] = (
            event_sub.get("description")
            or data.get("description")
        )

    return result


def _map_luma_data(event: dict, hosts: list) -> dict[str, Any]:
    """Map a classic Luma event dict (name + start_at at top level)."""
    result: dict[str, Any] = {}

    result["title"] = event.get("name") or event.get("title")
    result["start_time"] = _normalise_datetime(
        event.get("start_at") or event.get("start_time") or event.get("startDate")
    )
    result["end_time"] = _normalise_datetime(
        event.get("end_at") or event.get("end_time") or event.get("endDate")
    )

    tz = event.get("timezone")
    if tz:
        result["_event_timezone"] = tz

    geo = event.get("geo_address_info") or event.get("location") or {}
    if isinstance(geo, dict):
        result["location"] = geo.get("full_address") or geo.get("address") or geo.get("name")
    elif isinstance(geo, str):
        result["location"] = geo or None
    if not result.get("location"):
        result["location"] = (
            event.get("zoom_meeting_url")
            or event.get("meeting_url")
            or (event.get("virtual_info") or {}).get("url")
        )

    host_list = hosts or event.get("hosts") or event.get("organizers") or []
    if host_list and isinstance(host_list, list) and isinstance(host_list[0], dict):
        h = host_list[0]
        result["host"] = h.get("name") or h.get("display_name") or h.get("username")

    cover = event.get("cover_image") or {}
    result["cover_image"] = (
        _extract_cover_url(cover)
        or event.get("cover_url")
        or event.get("cover_image_url")
    )

    desc_mirror = event.get("description_mirror")
    if desc_mirror and isinstance(desc_mirror, dict):
        result["description"] = _prosemirror_to_markdown(desc_mirror).strip() or None
    else:
        result["description"] = event.get("description") or event.get("description_html")

    return result


# ── ProseMirror JSON → Markdown ───────────────────────────────────────────────

def _prosemirror_to_markdown(doc: dict) -> str:
    """
    Convert a ProseMirror/Tiptap JSON document to Markdown.
    Handles the most common node types Luma uses in event descriptions.
    """
    if not isinstance(doc, dict):
        return ""
    return _pm_nodes_to_md(doc.get("content") or []).strip()


def _pm_nodes_to_md(nodes: list) -> str:
    parts: list[str] = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        t = node.get("type", "")
        children = node.get("content") or []
        attrs = node.get("attrs") or {}

        if t == "text":
            parts.append(_pm_text_node(node))
        elif t == "paragraph":
            inner = _pm_inline(children)
            parts.append((inner or "") + "\n\n")
        elif t == "heading":
            level = int(attrs.get("level", 1))
            inner = _pm_inline(children)
            parts.append("#" * level + " " + (inner or "") + "\n\n")
        elif t == "bulletList":
            for item in children:
                item_text = _pm_nodes_to_md(item.get("content") or []).strip()
                parts.append("- " + item_text + "\n")
            parts.append("\n")
        elif t == "orderedList":
            start = int(attrs.get("start", 1))
            for i, item in enumerate(children, start):
                item_text = _pm_nodes_to_md(item.get("content") or []).strip()
                parts.append(f"{i}. " + item_text + "\n")
            parts.append("\n")
        elif t == "listItem":
            parts.append(_pm_nodes_to_md(children))
        elif t == "blockquote":
            inner = _pm_nodes_to_md(children).strip()
            quoted = "\n".join("> " + line for line in inner.splitlines())
            parts.append(quoted + "\n\n")
        elif t in ("codeBlock", "code_block"):
            lang = attrs.get("language") or ""
            text = _pm_inline(children)
            parts.append(f"```{lang}\n{text}\n```\n\n")
        elif t == "horizontalRule":
            parts.append("---\n\n")
        elif t == "hardBreak":
            parts.append("  \n")
        elif t == "image":
            src = attrs.get("src", "")
            alt = attrs.get("alt", "")
            parts.append(f"![{alt}]({src})\n\n")
        elif t == "link":
            href = attrs.get("href", "")
            inner = _pm_inline(children)
            parts.append(f"[{inner}]({href})")
        else:
            # Unknown node — recurse into children
            parts.append(_pm_nodes_to_md(children))

    return "".join(parts)


def _pm_inline(nodes: list) -> str:
    return "".join(_pm_text_node(n) for n in nodes if isinstance(n, dict))


def _pm_text_node(node: dict) -> str:
    """Apply marks (bold, italic, code, link, strike) to a text node."""
    text = node.get("text") or ""
    if not text and node.get("type") != "text":
        # Non-text inline node (e.g. inline image) — recurse
        return _pm_inline(node.get("content") or [])
    marks = node.get("marks") or []
    for mark in marks:
        mt = mark.get("type", "")
        if mt == "bold" or mt == "strong":
            text = f"**{text}**"
        elif mt == "italic" or mt == "em":
            text = f"*{text}*"
        elif mt == "code":
            text = f"`{text}`"
        elif mt == "strike":
            text = f"~~{text}~~"
        elif mt == "link":
            href = (mark.get("attrs") or {}).get("href", "")
            text = f"[{text}]({href})"
        elif mt == "underline":
            text = f"<u>{text}</u>"
    return text


# ── Strategy 4: JSON-LD ───────────────────────────────────────────────────────

def _extract_from_json_ld(
    soup: BeautifulSoup, warnings: list[str]
) -> dict[str, Any] | None:
    for tag in soup.find_all("script", {"type": "application/ld+json"}):
        if not tag.string:
            continue
        try:
            data = json.loads(tag.string)
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get("@type") not in ("Event", "SocialEvent", "BusinessEvent"):
                continue
            result: dict[str, Any] = {}
            result["title"] = item.get("name")
            result["description"] = item.get("description")
            result["start_time"] = _normalise_datetime(item.get("startDate"))
            result["end_time"] = _normalise_datetime(item.get("endDate"))
            img = item.get("image")
            result["cover_image"] = img if isinstance(img, str) else (img or {}).get("url")
            loc = item.get("location") or {}
            if isinstance(loc, dict):
                addr = loc.get("address") or {}
                result["location"] = (
                    loc.get("name")
                    or (addr if isinstance(addr, str) else addr.get("streetAddress"))
                )
            elif isinstance(loc, str):
                result["location"] = loc
            org = item.get("organizer") or {}
            result["host"] = org.get("name") if isinstance(org, dict) else str(org)
            if any(v for v in result.values()):
                return result
    return None


# ── Strategy 5: Open Graph / meta tags ───────────────────────────────────────

def _extract_from_og_tags(
    soup: BeautifulSoup, warnings: list[str]
) -> dict[str, Any] | None:
    def _meta(prop: str) -> str | None:
        tag = (
            soup.find("meta", property=prop)
            or soup.find("meta", attrs={"name": prop})
        )
        return tag["content"].strip() if tag and tag.get("content") else None  # type: ignore[index]

    title = _meta("og:title") or _meta("twitter:title")
    description = _meta("og:description") or _meta("twitter:description") or _meta("description")
    cover_image = _meta("og:image") or _meta("twitter:image")

    if not title and not cover_image:
        return None

    return {
        "title": title, "description": description, "cover_image": cover_image,
        "start_time": None, "end_time": None, "location": None, "host": None,
    }


# ── Shared builder ────────────────────────────────────────────────────────────

def _build_response(
    result: dict[str, Any], source_url: str, warnings: list[str]
) -> LumaPreviewResponse:
    description = result.get("description")
    if description:
        if _looks_like_html(description):
            description = _html_to_markdown(description)
            warnings.append(
                "Description was HTML — auto-converted to Markdown. Please review."
            )
        result["description"] = description.strip() or None

    # Extract timezone — surfaced to the frontend so it can pre-select the
    # timezone selector, showing the staff the times in the event's local tz.
    event_tz = result.pop("_event_timezone", None) or None

    field_keys = ["title", "description", "start_time", "end_time",
                  "location", "host", "cover_image"]
    extracted = [k for k in field_keys if result.get(k)]

    return LumaPreviewResponse(
        source_url=source_url,
        extracted_fields=extracted,
        warnings=warnings,
        event_timezone=event_tz,
        **{k: result.get(k) for k in field_keys},
    )


# ── Utilities ─────────────────────────────────────────────────────────────────

def _extract_cover_url(cover: Any) -> str | None:
    """
    Luma stores cover_image as an object (2–3 keys).
    Known structures:
      { "url": "https://images.lumacdn.com/cdn-cgi/image/…/event-covers/…" }
      { "public_id": "event-covers/0j/…", "blurDataURL": "data:…" }
    Falls back to constructing a CDN URL from public_id when url key is absent.
    """
    if isinstance(cover, str):
        return cover or None
    if not isinstance(cover, dict) or not cover:
        return None

    # Prefer explicit url keys
    url = (
        cover.get("url")
        or cover.get("cdn_url")
        or cover.get("original_url")
        or cover.get("image_url")
    )
    if url and isinstance(url, str):
        return url

    # Construct from public_id (Luma uses Cloudflare image transforms)
    public_id = cover.get("public_id") or cover.get("id")
    if public_id and isinstance(public_id, str):
        # Standard Luma CDN transform for event covers
        return (
            "https://images.lumacdn.com/cdn-cgi/image/"
            "format=auto,fit=cover,dpr=2,background=white,quality=75,width=800,height=800"
            f"/{public_id}"
        )
    return None


def _deep_get(obj: Any, *keys: str) -> Any:
    for key in keys:
        if not isinstance(obj, dict):
            return None
        obj = obj.get(key)
    return obj


def _normalise_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            ts = value / 1000 if value > 1e10 else value
            return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            return None
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            return value
    return None


def _looks_like_html(text: str) -> bool:
    return bool(re.search(r"<[a-zA-Z][^>]*>", text))


def _html_to_markdown(html: str) -> str:
    if _MARKDOWNIFY_AVAILABLE:
        return _md_convert(html, heading_style="ATX", bullets="-")
    return re.sub(r"<[^>]+>", "", html)
