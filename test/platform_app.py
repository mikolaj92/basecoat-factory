from __future__ import annotations

import argparse
import json
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import DictLoader, Environment

from app_factory.jinja import configure_jinja_env
from app_factory.platform import MenuGroup, MenuItem, PlatformConfig, PlatformPaths, PlatformUser, build_platform_context

ROOT = Path(__file__).resolve().parents[1]
ASSETS = json.loads((ROOT / "dist" / "MANIFEST.json").read_text())
USER = PlatformUser(display_name="Ada Lovelace", is_admin=True, user_id="ada")
CONFIG = PlatformConfig(
    app_name="Platform smoke",
    menu=(
        MenuItem("Account", "/account", key="account", use_htmx=True),
        MenuGroup("Administration", (MenuItem("Admin users", "/admin", key="admin", use_htmx=True),)),
    ),
    paths=PlatformPaths(login="/login", logout="/logout", account="/account", admin_users="/admin"),
)
TEMPLATES = {
    "login.html": """{% extends "app_factory/shell.html" %}
{% block title %}Login · Platform smoke{% endblock %}
{% block content %}<section class="app-page" data-surface="login"><div class="card" x-data="{ ready: false }"><header><h1>Login</h1></header><button class="btn" data-variant="primary" type="button" @click="ready = true">Continue with passkey</button><p x-show="ready" x-cloak>Passkey ready</p></div></section>{% endblock %}""",
    "account.html": """{% extends "app_factory/product_shell.html" %}
{% block content %}<section class="app-page" data-surface="account"><h1>Account</h1><div class="card"><p>Signed-in profile for {{ platform_user.display_name }}</p></div>{% include "app_factory/platform_session.html" %}</section>{% endblock %}""",
    "admin.html": """{% extends "app_factory/product_shell.html" %}
{% block content %}<section class="app-page" data-surface="admin" x-data="{ ready: false }"><h1>Admin users</h1><div class="card"><button class="btn" type="button" @click="ready = true">Load users</button><p x-show="ready" x-cloak>Users ready</p></div></section>{% endblock %}""",
}
environment = configure_jinja_env(Environment(loader=DictLoader(TEMPLATES), autoescape=True))
app = FastAPI()
app.mount("/static/platform", StaticFiles(directory=ROOT / "dist", follow_symlink=False))


def render(request: Request, template: str, *, user: PlatformUser | None, title: str, nav: str) -> HTMLResponse:
    context = build_platform_context(CONFIG, user=user, current_path=request.url.path)
    html = environment.get_template(template).render(**context, page_title=title, nav_active=nav)
    for entry in ASSETS.values():
        url = f'="/static/platform/{entry["filename"]}"'
        html = html.replace(url, f'{url} integrity="{entry["integrity"]}" crossorigin="anonymous"')
    return HTMLResponse(html)


@app.get("/login", response_class=HTMLResponse)
def login(request: Request) -> HTMLResponse:
    return render(request, "login.html", user=None, title="Login", nav="")


@app.get("/account", response_class=HTMLResponse)
def account(request: Request) -> HTMLResponse:
    return render(request, "account.html", user=USER, title="Account", nav="account")


@app.get("/admin", response_class=HTMLResponse)
def admin(request: Request) -> HTMLResponse:
    return render(request, "admin.html", user=USER, title="Admin users", nav="admin")


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    args = parser.parse_args()
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")
