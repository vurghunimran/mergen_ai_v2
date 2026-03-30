#!/usr/bin/env python3

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageChops, ImageColor, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent.parent
DESKTOP = ROOT.parent

W = 1280
H = 720
FPS = 24
TRANSITION = 0.45

ORANGE = "#FF5F00"
ORANGE_DARK = "#D74A00"
ORANGE_LIGHT = "#FFB171"
BEIGE = "#FAF0E6"
BEIGE_DEEP = "#F1DDCB"
INK = "#2E241E"
INK_SOFT = "#68594E"
WHITE = "#FFFDFC"
PANEL = "#FFF8F2"
PANEL_ALT = "#FFF3E9"
MUTED = "#8C7768"
GREEN = "#3BA76B"

LOGO_MARK = ROOT / "public/logo-symbol-orange-hq.png"
INTRO_BG_VIDEO = DESKTOP / (
    "Mergen Posts/Brand_colors__primary_orange__FF5F00,_background_beige__FAF0E6,"
    "_accent_purple__6B4EFF._The_MERGEN_lo_seed1822330733.mp4"
)
PROBLEMS_POSTER = DESKTOP / "Mergen Posts/Problems.png"
CLIENTS_POSTER = DESKTOP / "Mergen Posts/clients.png"
REWARDS_POSTER = DESKTOP / "Mergen Posts/REWARDS.png"
FIRST_COMERS_POSTER = DESKTOP / "Mergen Posts/first comers.png"
SHARE_POSTER = DESKTOP / "Mergen Posts/Gemini_Generated_Image_xoje64xoje64xoje.png"

CREATE_SURVEY_SCREEN = ROOT / "Untitled.png"
PROJECTS_SCREEN = ROOT / "Design samples/mergen_home_page_1/stitch_mergen_home_page 2/client_my_projects_screen/screen.png"
ANALYTICS_SCREEN = ROOT / "Design samples/mergen_home_page_1/stitch_mergen_home_page 2/company_analytics_overview/screen.png"

OUTPUT_VIDEO = ROOT / "public/vision-goals-2026.mp4"
OUTPUT_POSTER = ROOT / "public/vision-goals-2026-poster.jpg"


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def ease_out_cubic(value: float) -> float:
    value = clamp(value, 0.0, 1.0)
    return 1 - (1 - value) ** 3


def ease_in_out(value: float) -> float:
    value = clamp(value, 0.0, 1.0)
    return value * value * (3 - 2 * value)


def lerp(a: float, b: float, value: float) -> float:
    return a + (b - a) * value


def hex_to_rgba(value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    red, green, blue = ImageColor.getrgb(value)
    return red, green, blue, alpha


def find_font_path(name: str) -> str:
    candidates = {
        "bold": [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ],
        "regular": [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ],
    }
    for candidate in candidates[name]:
        if Path(candidate).exists():
            return candidate
    raise FileNotFoundError(f"Missing a usable {name} font.")


FONT_BOLD = find_font_path("bold")
FONT_REGULAR = find_font_path("regular")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size=size)


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def fit_cover(image: Image.Image, size: tuple[int, int], scale: float = 1.0) -> Image.Image:
    target_w, target_h = size
    width, height = image.size
    ratio = max(target_w / width, target_h / height) * scale
    resized = image.resize((max(1, int(width * ratio)), max(1, int(height * ratio))), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - target_w) // 2)
    top = max(0, (resized.height - target_h) // 2)
    return resized.crop((left, top, left + target_w, top + target_h))


def fit_contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    width, height = size
    result = image.copy()
    result.thumbnail((width, height), Image.Resampling.LANCZOS)
    return result


def add_rounded_corners(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, image.width, image.height), radius=radius, fill=255)
    result = image.copy()
    result.putalpha(mask)
    return result


def add_shadow(image: Image.Image, offset: tuple[int, int] = (0, 18), blur: int = 28, alpha: int = 55) -> Image.Image:
    shadow = Image.new("RGBA", (image.width + blur * 2, image.height + blur * 2), (0, 0, 0, 0))
    shadow_mask = Image.new("L", image.size, alpha)
    shadow_draw = ImageDraw.Draw(shadow_mask)
    shadow_draw.rounded_rectangle((0, 0, image.width, image.height), radius=28, fill=alpha)
    shadow.paste((0, 0, 0, alpha), (blur + offset[0], blur + offset[1]), shadow_mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    result = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
    result.alpha_composite(shadow)
    result.alpha_composite(image, (blur, blur))
    return result


def paste_center(base: Image.Image, image: Image.Image, center_x: int, center_y: int) -> None:
    base.alpha_composite(image, (int(center_x - image.width / 2), int(center_y - image.height / 2)))


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    box: tuple[int, int, int, int],
    text_font: ImageFont.FreeTypeFont,
    fill: str,
    line_gap: int = 8,
    align: str = "left",
) -> int:
    left, top, right, bottom = box
    words = text.split()
    lines: list[str] = []
    current = ""

    for word in words:
        proposal = word if not current else f"{current} {word}"
        text_box = draw.textbbox((0, 0), proposal, font=text_font)
        if text_box[2] - text_box[0] <= right - left:
            current = proposal
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)

    line_height = draw.textbbox((0, 0), "Ag", font=text_font)[3]
    y = top
    for line in lines:
        width = draw.textbbox((0, 0), line, font=text_font)[2]
        if align == "center":
            x = left + ((right - left) - width) // 2
        elif align == "right":
            x = right - width
        else:
            x = left
        draw.text((x, y), line, font=text_font, fill=fill)
        y += line_height + line_gap
        if y > bottom:
            break
    return y


def make_background() -> Image.Image:
    base = Image.new("RGBA", (W, H), hex_to_rgba(BEIGE))

    linear = Image.linear_gradient("L").resize((W, H))
    linear = ImageOps.colorize(linear, "#FFF8F1", "#F4D7BE").convert("RGBA")
    linear.putalpha(120)
    base.alpha_composite(linear)

    for color, bbox, blur, alpha in [
        (ORANGE_LIGHT, (-160, 340, 360, 860), 110, 105),
        (ORANGE, (820, -80, 1440, 520), 150, 62),
        ("#FFDDBD", (160, -120, 920, 520), 120, 85),
    ]:
        blob = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        blob_draw = ImageDraw.Draw(blob)
        blob_draw.ellipse(bbox, fill=hex_to_rgba(color, alpha))
        blob = blob.filter(ImageFilter.GaussianBlur(blur))
        base.alpha_composite(blob)

    noise = Image.effect_noise((W, H), 9).convert("L")
    noise_rgba = ImageOps.colorize(noise, "#F6E6D8", "#FFF9F4").convert("RGBA")
    noise_rgba.putalpha(18)
    base.alpha_composite(noise_rgba)
    return base


def draw_badge(base: Image.Image, xy: tuple[int, int], text: str, fill: str = ORANGE, text_fill: str = WHITE) -> None:
    draw = ImageDraw.Draw(base)
    badge_font = font(20, bold=True)
    text_box = draw.textbbox((0, 0), text, font=badge_font)
    width = text_box[2] - text_box[0] + 28
    height = text_box[3] - text_box[1] + 18
    x, y = xy
    draw.rounded_rectangle((x, y, x + width, y + height), radius=height // 2, fill=fill)
    draw.text((x + 14, y + 8), text, font=badge_font, fill=text_fill)


def draw_label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill: str = MUTED) -> None:
    draw.text(xy, text.upper(), font=font(18, bold=True), fill=fill)


def browser_panel(source: Path, size: tuple[int, int], title: str, zoom: float = 1.0) -> Image.Image:
    screenshot = load_rgba(source)
    panel = Image.new("RGBA", size, hex_to_rgba(WHITE))
    top_bar_h = 44
    panel_draw = ImageDraw.Draw(panel)
    panel_draw.rounded_rectangle((0, 0, size[0], size[1]), radius=30, fill=hex_to_rgba(WHITE))
    panel_draw.rectangle((0, 0, size[0], top_bar_h), fill=hex_to_rgba("#FFF3E8"))

    for index, color in enumerate(["#FF5F57", "#FEBB2E", "#28C840"]):
        panel_draw.ellipse((20 + index * 18, 15, 32 + index * 18, 27), fill=hex_to_rgba(color))

    title_font = font(17, bold=True)
    panel_draw.text((86, 12), title, font=title_font, fill=hex_to_rgba(INK))

    inner = fit_cover(screenshot, (size[0] - 28, size[1] - top_bar_h - 20), scale=zoom)
    inner = add_rounded_corners(inner, 18)
    panel.alpha_composite(inner, (14, top_bar_h + 6))
    return add_shadow(add_rounded_corners(panel, 30), offset=(0, 12), blur=20, alpha=40)


def image_card(source: Path, size: tuple[int, int], zoom: float = 1.0) -> Image.Image:
    image = fit_cover(load_rgba(source), size, scale=zoom)
    image = add_rounded_corners(image, 32)
    return add_shadow(image, offset=(0, 16), blur=22, alpha=42)


def number_card(title: str, value: str, subtitle: str, accent: str = ORANGE) -> Image.Image:
    card = Image.new("RGBA", (270, 220), hex_to_rgba(PANEL))
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((0, 0, 270, 220), radius=28, fill=hex_to_rgba(PANEL), outline=hex_to_rgba("#F1D3BA"), width=2)
    draw_label(draw, (26, 24), title, fill=accent)
    draw.text((26, 70), value, font=font(56, bold=True), fill=hex_to_rgba(INK))
    draw_wrapped(draw, subtitle, (26, 136, 246, 198), font(24), INK_SOFT, line_gap=4)
    return add_shadow(add_rounded_corners(card, 28), offset=(0, 12), blur=20, alpha=36)


def poster_with_frame(source: Path, size: tuple[int, int], zoom: float = 1.0) -> Image.Image:
    poster = fit_contain(load_rgba(source), (size[0] - 20, size[1] - 20))
    frame = Image.new("RGBA", size, hex_to_rgba(WHITE))
    draw = ImageDraw.Draw(frame)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=30, fill=hex_to_rgba(WHITE), outline=hex_to_rgba("#EBCDB5"), width=2)
    paste_center(frame, poster, size[0] // 2, size[1] // 2)
    frame = add_rounded_corners(frame, 30)
    return add_shadow(frame, offset=(0, 16), blur=22, alpha=42)


def generate_bg_video_frames() -> list[Image.Image]:
    reader = imageio.get_reader(str(INTRO_BG_VIDEO))
    frames: list[Image.Image] = []
    try:
        for frame in reader:
            frames.append(Image.fromarray(frame).convert("RGBA"))
    finally:
        reader.close()
    return frames


@dataclass
class Scene:
    duration: float
    builder: Callable[[float, float], Image.Image]


BACKGROUND = make_background()
BG_VIDEO_FRAMES = generate_bg_video_frames()


def video_backdrop(time_value: float, dim_alpha: int = 120) -> Image.Image:
    frame = BG_VIDEO_FRAMES[int(time_value * FPS) % len(BG_VIDEO_FRAMES)]
    frame = fit_cover(frame, (W, H), scale=1.08)
    overlay = Image.new("RGBA", (W, H), hex_to_rgba(BEIGE, dim_alpha))
    frame.alpha_composite(overlay)
    return frame


def build_intro(local_t: float, duration: float) -> Image.Image:
    frame = video_backdrop(local_t, dim_alpha=132)
    draw = ImageDraw.Draw(frame)

    progress = ease_out_cubic(local_t / min(duration, 2.2))
    mark = load_rgba(LOGO_MARK)
    target_size = int(148 * (0.76 + 0.24 * progress))
    mark = fit_contain(mark, (target_size, target_size))
    paste_center(frame, mark, W // 2, 212)

    if local_t > 0.55:
        alpha = int(255 * ease_out_cubic((local_t - 0.55) / 0.9))
        word_font = font(92, bold=True)
        word_mask = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        word_draw = ImageDraw.Draw(word_mask)
        word_draw.text((W // 2, 300), "Mergen", anchor="ma", font=word_font, fill=hex_to_rgba(ORANGE, alpha))
        frame.alpha_composite(word_mask)

    if local_t > 1.35:
        alpha = int(255 * ease_out_cubic((local_t - 1.35) / 0.9))
        tagline_font = font(28)
        draw.text((W // 2, 394), "AI-powered surveys for faster local insight", anchor="ma", font=tagline_font, fill=hex_to_rgba(INK, alpha))

    if local_t > 2.05:
        alpha = int(255 * ease_out_cubic((local_t - 2.05) / 0.8))
        draw.text((W // 2 - 214, 504), "Wisdom in", anchor="la", font=font(78, bold=True), fill=hex_to_rgba(INK, alpha))
        draw.text((W // 2 + 34, 504), "the Data.", anchor="la", font=font(78, bold=True), fill=hex_to_rgba(ORANGE, alpha))
        draw.text(
            (W // 2, 584),
            "Turn complex questions into verified, decision-ready answers.",
            anchor="ma",
            font=font(28),
            fill=hex_to_rgba(INK_SOFT, alpha),
        )

    return frame


def build_problems(local_t: float, duration: float) -> Image.Image:
    frame = BACKGROUND.copy()
    draw = ImageDraw.Draw(frame)
    draw_badge(frame, (80, 60), "The problem")

    title_bottom = draw_wrapped(draw, "Surveys break before insight.", (80, 126, 1180, 236), font(60, bold=True), INK, line_gap=6)
    draw.text((80, title_bottom + 8), "Too slow. Too noisy. Too hard to reach the right audience.", font=font(28), fill=hex_to_rgba(INK_SOFT))

    poster = poster_with_frame(PROBLEMS_POSTER, (520, 520), zoom=1.04)
    poster_y = int(430 + 10 * math.sin(local_t * 1.2))
    paste_center(frame, poster, 365, poster_y)

    chips = [
        ("Surveys take time", 800, 270, 0.0),
        ("Low-quality responses", 850, 370, 0.2),
        ("Lack of audience access", 820, 470, 0.4),
    ]
    for text, x, y, delay in chips:
        appear = ease_out_cubic((local_t - delay) / 0.8)
        if appear <= 0:
            continue
        card = Image.new("RGBA", (360, 84), (0, 0, 0, 0))
        card_draw = ImageDraw.Draw(card)
        card_draw.rounded_rectangle((0, 0, 360, 84), radius=24, fill=hex_to_rgba(PANEL_ALT), outline=hex_to_rgba("#F1D3BA"), width=2)
        card_draw.ellipse((22, 22, 62, 62), fill=hex_to_rgba("#FFE5D4"))
        card_draw.text((42, 42), "!", anchor="mm", font=font(26, bold=True), fill=hex_to_rgba(ORANGE))
        card_draw.text((84, 23), text, font=font(28, bold=True), fill=hex_to_rgba(INK))
        card_draw.text((84, 50), "Manual work adds weeks.", font=font(19), fill=hex_to_rgba(MUTED))
        card = add_shadow(add_rounded_corners(card, 24), offset=(0, 8), blur=18, alpha=28)
        frame.alpha_composite(card, (x - int((1 - appear) * 80), y))

    draw.text((80, 646), "From the MERGEN pitch deck: manual analysis can take weeks, while poor networks drag response rates down.", font=font(20), fill=hex_to_rgba(MUTED))
    return frame


def build_solution(local_t: float, duration: float) -> Image.Image:
    frame = BACKGROUND.copy()
    draw = ImageDraw.Draw(frame)
    draw_badge(frame, (80, 60), "MERGEN solution")
    title_bottom = draw_wrapped(draw, "One platform to build, distribute, and understand surveys.", (80, 124, 1180, 254), font(56, bold=True), INK, line_gap=6)
    draw.text((80, title_bottom + 8), "AI drafts the survey, verified communities answer it, and reports arrive without weeks of manual cleanup.", font=font(28), fill=hex_to_rgba(INK_SOFT))

    poster = poster_with_frame(CLIENTS_POSTER, (510, 410), zoom=1.02)
    paste_center(frame, poster, 330, 445)

    browser = browser_panel(CREATE_SURVEY_SCREEN, (520, 336), "Create survey", zoom=1.02 + 0.02 * math.sin(local_t * 1.6))
    paste_center(frame, browser, 938, 415)

    features = [
        ("AI survey building", "From prompt to first draft in minutes"),
        ("Audience targeting", "Match by region, profile, and research need"),
        ("Instant reporting", "See response quality and signal fast"),
    ]
    y = 584
    for index, (title, body) in enumerate(features):
        x = 614 + index * 208
        card = Image.new("RGBA", (196, 92), (0, 0, 0, 0))
        card_draw = ImageDraw.Draw(card)
        card_draw.rounded_rectangle((0, 0, 196, 92), radius=22, fill=hex_to_rgba(PANEL), outline=hex_to_rgba("#EECDB4"), width=2)
        card_draw.text((18, 16), title, font=font(22, bold=True), fill=hex_to_rgba(INK))
        draw_wrapped(card_draw, body, (18, 44, 178, 84), font(16), MUTED, line_gap=2)
        frame.alpha_composite(add_shadow(add_rounded_corners(card, 22), offset=(0, 8), blur=16, alpha=24), (x, y))
    return frame


def build_how_it_works(local_t: float, duration: float) -> Image.Image:
    frame = BACKGROUND.copy()
    draw = ImageDraw.Draw(frame)
    draw_badge(frame, (80, 54), "How it works")
    title_bottom = draw_wrapped(draw, "Move from idea to insight on one connected workflow.", (80, 122, 1180, 252), font(54, bold=True), INK, line_gap=6)
    draw.text((80, title_bottom + 8), "Build the survey, monitor the rollout, then read the analytics.", font=font(28), fill=hex_to_rgba(INK_SOFT))

    panels = [
        (browser_panel(CREATE_SURVEY_SCREEN, (346, 300), "1. Build survey", zoom=1.02), 222, 470),
        (browser_panel(PROJECTS_SCREEN, (346, 300), "2. Launch and manage", zoom=1.02), 640, 470),
        (browser_panel(ANALYTICS_SCREEN, (346, 300), "3. Read analytics", zoom=1.02), 1058, 470),
    ]
    for panel, cx, cy in panels:
        float_y = cy + int(6 * math.sin(local_t * 1.4 + cx * 0.01))
        paste_center(frame, panel, cx, float_y)

    arrow_draw = ImageDraw.Draw(frame)
    arrow_y = 470
    for start_x in [394, 812]:
        arrow_draw.line((start_x, arrow_y, start_x + 92, arrow_y), fill=hex_to_rgba(ORANGE, 180), width=8)
        arrow_draw.polygon(
            [(start_x + 92, arrow_y), (start_x + 66, arrow_y - 16), (start_x + 66, arrow_y + 16)],
            fill=hex_to_rgba(ORANGE, 180),
        )

    captions = [
        ("State the research goal and let AI propose the questionnaire.", 80, 640),
        ("Watch active projects and keep the launch organized.", 470, 640),
        ("Track trust score, response speed, and audience reach.", 860, 640),
    ]
    for text, x, y in captions:
        draw_wrapped(draw, text, (x, y, x + 300, y + 80), font(22), INK_SOFT, line_gap=4)
    return frame


def build_industries(local_t: float, duration: float) -> Image.Image:
    frame = BACKGROUND.copy()
    draw = ImageDraw.Draw(frame)
    draw_badge(frame, (80, 58), "Target clients")
    title_bottom = draw_wrapped(draw, "Start with the sectors that need fast local insight.", (80, 126, 1180, 250), font(54, bold=True), INK, line_gap=6)
    draw_wrapped(
        draw,
        "The deck and product point first toward universities, NGOs, research teams, media, finance, and public institutions.",
        (80, title_bottom + 8, 1180, title_bottom + 88),
        font(28),
        INK_SOFT,
        line_gap=4,
    )

    chips = [
        "Universities",
        "Research institutes",
        "NGOs",
        "Media",
        "Finance",
        "Public sector",
    ]
    chip_positions = [(80, 300), (286, 300), (80, 386), (286, 386), (80, 472), (286, 472)]
    for (x, y), text in zip(chip_positions, chips):
        chip = Image.new("RGBA", (190, 66), (0, 0, 0, 0))
        chip_draw = ImageDraw.Draw(chip)
        chip_draw.rounded_rectangle((0, 0, 190, 66), radius=18, fill=hex_to_rgba(PANEL), outline=hex_to_rgba("#EECDB4"), width=2)
        chip_draw.text((22, 18), text, font=font(21, bold=True), fill=hex_to_rgba(INK))
        frame.alpha_composite(add_shadow(add_rounded_corners(chip, 18), offset=(0, 8), blur=16, alpha=22), (x, y))

    map_panel = poster_with_frame(CLIENTS_POSTER, (590, 410), zoom=1.03)
    paste_center(frame, map_panel, 925, 418)

    notes = Image.new("RGBA", (530, 74), (0, 0, 0, 0))
    notes_draw = ImageDraw.Draw(notes)
    notes_draw.rounded_rectangle((0, 0, 530, 74), radius=22, fill=hex_to_rgba(PANEL_ALT), outline=hex_to_rgba("#F0D5C0"), width=2)
    notes_draw.text((24, 18), "Regional launch plan", font=font(24, bold=True), fill=hex_to_rgba(ORANGE))
    notes_draw.text((24, 44), "Azerbaijan first, then Georgia and Kazakhstan.", font=font(20), fill=hex_to_rgba(INK_SOFT))
    frame.alpha_composite(add_shadow(add_rounded_corners(notes, 22), offset=(0, 10), blur=16, alpha=22), (674, 578))
    return frame


def animated_number(end_value: int, local_t: float, delay: float = 0.0) -> int:
    progress = ease_out_cubic((local_t - delay) / 1.0)
    return int(round(end_value * progress))


def build_metrics(local_t: float, duration: float) -> Image.Image:
    frame = video_backdrop(local_t + 0.9, dim_alpha=152)
    frame.alpha_composite(BACKGROUND.copy().crop((0, 0, W, H)))
    draw = ImageDraw.Draw(frame)
    draw_badge(frame, (80, 56), "Targets and traction")
    title_bottom = draw_wrapped(draw, "The launch numbers already tell a credible story.", (80, 124, 1180, 250), font(54, bold=True), INK, line_gap=6)
    draw_wrapped(
        draw,
        "Community scale, pilot clients, and waitlist demand are already defined in the product and deck.",
        (80, title_bottom + 8, 1180, title_bottom + 92),
        font(28),
        INK_SOFT,
        line_gap=4,
    )

    cards = [
        ("Community target", f"{animated_number(10000, local_t):,}", "Launch target defined in the community distribution plan"),
        ("Pilot clients", str(animated_number(5, local_t, 0.08)), "Phase 1 Azerbaijan MVP companies in 2026"),
        ("Waitlist", f"{animated_number(1000, local_t, 0.16):,}+", "Potential respondents already showing launch interest"),
        ("Validation", f"{animated_number(15, local_t, 0.24)}+", "Expert interviews completed across Azerbaijan and Georgia"),
    ]
    positions = [(80, 332), (378, 332), (676, 332), (974, 332)]
    for (title, value, subtitle), (x, y) in zip(cards, positions):
        frame.alpha_composite(number_card(title, value, subtitle), (x, y))

    draw.text((80, 620), "No explicit revenue target appeared in the project materials, so this cut focuses on verified launch metrics instead.", font=font(20), fill=hex_to_rgba(MUTED))
    return frame


def build_rewards(local_t: float, duration: float) -> Image.Image:
    frame = BACKGROUND.copy()
    draw = ImageDraw.Draw(frame)
    draw_badge(frame, (80, 56), "Community rewards")
    title_bottom = draw_wrapped(draw, "Reward the people who power the research.", (80, 126, 1180, 250), font(54, bold=True), INK, line_gap=6)
    draw_wrapped(
        draw,
        "Cash-out options, brand perks, first-comer bonuses, and referral credits keep the community active and honest.",
        (80, title_bottom + 8, 1180, title_bottom + 92),
        font(28),
        INK_SOFT,
        line_gap=4,
    )

    posters = [
        (poster_with_frame(REWARDS_POSTER, (300, 300), zoom=1.04), 715, 430),
        (poster_with_frame(FIRST_COMERS_POSTER, (300, 300), zoom=1.04), 955, 462),
        (poster_with_frame(SHARE_POSTER, (300, 300), zoom=1.04), 1175, 430),
    ]
    for panel, cx, cy in posters:
        paste_center(frame, panel, cx, cy)

    bullets = [
        "Cash-out to the community",
        "Gift cards and brand partnerships",
        "Early-joiner credits",
        "Share-and-earn referral boosts",
    ]
    for index, text in enumerate(bullets):
        y = 356 + index * 78
        draw.rounded_rectangle((80, y, 548, y + 58), radius=20, fill=hex_to_rgba(PANEL), outline=hex_to_rgba("#EED1BC"), width=2)
        draw.ellipse((98, y + 13, 130, y + 45), fill=hex_to_rgba("#FFE5D4"))
        draw.ellipse((109, y + 24, 119, y + 34), fill=hex_to_rgba(ORANGE))
        draw.text((150, y + 13), text, font=font(24, bold=True), fill=hex_to_rgba(INK))
    return frame


def build_outro(local_t: float, duration: float) -> Image.Image:
    frame = video_backdrop(local_t + 2.1, dim_alpha=128)
    draw = ImageDraw.Draw(frame)

    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(halo)
    halo_draw.ellipse((420, 80, 860, 520), fill=hex_to_rgba("#FFF4E8", 210))
    halo = halo.filter(ImageFilter.GaussianBlur(70))
    frame.alpha_composite(halo)

    mark = fit_contain(load_rgba(LOGO_MARK), (140, 140))
    paste_center(frame, mark, W // 2, 214)
    draw.text((W // 2, 320), "MERGEN", anchor="ma", font=font(78, bold=True), fill=hex_to_rgba(ORANGE))
    draw.text((W // 2, 408), "Wisdom in the Data.", anchor="ma", font=font(64, bold=True), fill=hex_to_rgba(INK))
    draw.text((W // 2, 474), "Faster surveys. Better responses. Clearer decisions.", anchor="ma", font=font(28), fill=hex_to_rgba(INK_SOFT))

    cta = Image.new("RGBA", (420, 82), (0, 0, 0, 0))
    cta_draw = ImageDraw.Draw(cta)
    cta_draw.rounded_rectangle((0, 0, 420, 82), radius=40, fill=hex_to_rgba(ORANGE), outline=hex_to_rgba(ORANGE_DARK), width=2)
    cta_draw.text((210, 26), "Explore the platform", anchor="ma", font=font(30, bold=True), fill=hex_to_rgba(WHITE))
    cta_draw.text((210, 52), "mergen-ai.com", anchor="ma", font=font(20), fill=hex_to_rgba("#FFE6D4"))
    cta = add_shadow(add_rounded_corners(cta, 40), offset=(0, 14), blur=24, alpha=44)
    paste_center(frame, cta, W // 2, 582)
    return frame


SCENES: list[Scene] = [
    Scene(4.6, build_intro),
    Scene(5.0, build_problems),
    Scene(5.0, build_solution),
    Scene(7.0, build_how_it_works),
    Scene(5.0, build_industries),
    Scene(6.0, build_metrics),
    Scene(6.0, build_rewards),
    Scene(4.4, build_outro),
]


def render_scene_frame(index: int, scene_time: float) -> Image.Image:
    scene = SCENES[index]
    return scene.builder(scene_time, scene.duration)


def build_timeline() -> list[float]:
    offsets = [0.0]
    current = 0.0
    for scene in SCENES[:-1]:
        current += scene.duration
        offsets.append(current)
    return offsets


SCENE_OFFSETS = build_timeline()
TOTAL_DURATION = sum(scene.duration for scene in SCENES)


def compose_frame(global_time: float) -> Image.Image:
    scene_index = len(SCENES) - 1
    for index, start in enumerate(SCENE_OFFSETS):
        if global_time < start + SCENES[index].duration:
            scene_index = index
            break

    scene_start = SCENE_OFFSETS[scene_index]
    scene = SCENES[scene_index]
    local_t = global_time - scene_start
    current = render_scene_frame(scene_index, local_t)

    if scene_index < len(SCENES) - 1 and local_t > scene.duration - TRANSITION:
        next_progress = ease_in_out((local_t - (scene.duration - TRANSITION)) / TRANSITION)
        next_frame = render_scene_frame(scene_index + 1, 0.0)
        current = Image.blend(current, next_frame, next_progress)

    return current


def render_video() -> None:
    OUTPUT_VIDEO.parent.mkdir(parents=True, exist_ok=True)
    frame_count = int(TOTAL_DURATION * FPS)

    writer = imageio.get_writer(
        str(OUTPUT_VIDEO),
        fps=FPS,
        codec="libx264",
        quality=8,
        macro_block_size=None,
        pixelformat="yuv420p",
    )
    try:
        for index in range(frame_count):
            current_time = index / FPS
            frame = compose_frame(current_time)
            if index == int(2.5 * FPS):
                frame.convert("RGB").save(OUTPUT_POSTER, quality=92)
            writer.append_data(np.asarray(frame.convert("RGB")))
            if index % FPS == 0:
                print(f"rendered {index // FPS:02d}s / {int(TOTAL_DURATION):02d}s")
    finally:
        writer.close()


if __name__ == "__main__":
    render_video()
