from __future__ import annotations

import asyncio
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile

from src.api.routes import upload_contract
from src.config import Settings


def test_upload_contract_extracts_text_from_txt_file(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "src.api.routes.get_settings",
        lambda: Settings(upload_dir=tmp_path),
    )

    response = asyncio.run(
        upload_contract(
            UploadFile(
                file=BytesIO(b"Confidentiality\n\nRecipient shall keep sponsor data confidential."),
                filename="sample-contract.txt",
            )
        )
    )

    assert response["filename"] == "sample-contract.txt"
    assert response["char_count"] > 20
    assert "Recipient shall keep sponsor data confidential." in response["full_text"]
