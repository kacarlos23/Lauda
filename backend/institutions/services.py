import random
import string

from institutions.models import Ministerio


def generate_unique_access_code(length: int = 12, max_attempts: int = 50) -> str:
    """
    Gera codigo alfanumerico unico com verificacao eficiente via .exists().
    Falha explicitamente se o limite de tentativas for excedido.
    """
    charset = string.ascii_uppercase + string.digits

    for _ in range(max_attempts):
        code = "".join(random.choices(charset, k=length))
        if not Ministerio.objects.filter(access_code=code, is_active=True).exists():
            return code

    raise RuntimeError(
        f"Nao foi possivel gerar access_code unico apos {max_attempts} tentativas. "
        "Verifique volume de ministerios ou aumente o tamanho do codigo."
    )
