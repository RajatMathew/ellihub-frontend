import pytest

from app.core.errors import TemplateSecurityError
from app.services.template_service import TemplateService


def test_sandbox_blocks_unsafe_globals(tmp_path) -> None:
    template_dir = tmp_path / "templates" / "unsafe"
    template_dir.mkdir(parents=True)
    (template_dir / "template.html").write_text("{{ cycler.__init__.__globals__ }}", encoding="utf-8")
    (template_dir / "styles.css").write_text("", encoding="utf-8")
    (template_dir / "schema.json").write_text('{"type":"object","properties":{"value":{"type":"string"}}}', encoding="utf-8")
    (template_dir / "metadata.json").write_text('{"name":"unsafe"}', encoding="utf-8")

    service = TemplateService(templates_dir=tmp_path / "templates")

    with pytest.raises(TemplateSecurityError):
        service.render_html("unsafe", {"value": "x"}, None, None)
