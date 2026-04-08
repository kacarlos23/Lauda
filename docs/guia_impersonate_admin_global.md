# Guia de Implementação - Recurso "Impersonate" (Admin Global)

## 1. O Problema Atual

Com a nova arquitetura Multi-Ministério, o **Admin Global** não possui um `ministerio_id` atrelado nativamente à sua sessão. Por causa disso, ao acessar telas operacionais (como a agenda de Cultos), ele não consegue criar ou editar eventos, pois o Backend exige um escopo de ministério para salvar esses dados.

## 2. A Solução: Impersonate (Assumir Identidade)

A funcionalidade de "Impersonate" permite que o Admin Global selecione temporariamente um Ministério. O sistema gera um **novo token JWT** injetando o `ministerio_id` escolhido, permitindo que o Admin opere o painel exatamente como se fosse um líder daquele ministério específico.

---

## Passo 1: Criar Endpoint no Backend (Django)

Precisamos de uma view que receba o ID do ministério, valide se o usuário é Admin Global e devolva um novo token.

**Sugestão para adicionar em `backend/api/views.py`**:

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Ministerio

class AdminImpersonateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Valida se o usuário atual é realmente um Admin Global
        if not getattr(request.user, 'is_global_admin', False):
            return Response({"error": "Acesso negado. Apenas admins globais podem assumir ministérios."}, status=403)

        ministerio_id = request.data.get("ministerio_id")

        # 2. Valida se o ministério existe (ou permite 'null' para sair do impersonate)
        if ministerio_id:
            try:
                ministerio = Ministerio.objects.get(id=ministerio_id)
            except Ministerio.DoesNotExist:
                return Response({"error": "Ministério não encontrado."}, status=404)

        # 3. Gera um novo token
        refresh = RefreshToken.for_user(request.user)

        # 4. Injeta os dados do escopo no Token e Payload
        refresh["is_global_admin"] = True
        refresh["ministerio_id"] = ministerio_id
        refresh["ministerio_slug"] = ministerio.slug if ministerio_id else None

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": request.user.id,
                "email": request.user.email,
                "is_global_admin": True,
                "ministerio_id": ministerio_id,
                "ministerio_nome": ministerio.nome if ministerio_id else None,
                # (Inclua outros campos padrão do seu build_user_payload)
            }
        })
```

_Não se esqueça de registrar essa rota no `urls.py`, ex: `path("auth/admin/impersonate/", AdminImpersonateView.as_view())`_

---

## Passo 2: Atualizar Contexto no Frontend (`AuthContext.jsx`)

Adicione a seguinte função dentro do seu `AuthProvider` no frontend para consumir o endpoint e atualizar a sessão atual.

```javascript
const impersonateMinistry = async (ministerioId) => {
  try {
    const response = await fetch(
      "http://seu-backend/api/auth/admin/impersonate/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access}`,
        },
        body: JSON.stringify({ ministerio_id: ministerioId }),
      },
    );

    if (!response.ok) throw new Error("Falha ao assumir ministério");

    const data = await response.json();

    // Usa a mesma estrutura de sessão do projeto
    login(data);

    return true;
  } catch (error) {
    console.error("Erro no Impersonate:", error);
    return false;
  }
};
```

_Exporte essa função passando-a no objeto `value` retornado pelo `AuthContext.Provider`._

---

## Passo 3: Criar o Controle na UI (`AdminDashboard.jsx` ou Sidebar)

Crie um seletor visual exclusivo para o Admin Global escolher o ministério que quer gerenciar.

```javascript
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function MinistrySwitcher({ ministerios }) {
  const { user, impersonateMinistry } = useAuth();
  const navigate = useNavigate();

  if (!user?.is_global_admin) return null;

  const handleSelectMinistry = async (e) => {
    const ministerioId = e.target.value;
    const success = await impersonateMinistry(ministerioId || null);

    if (success && ministerioId) {
      navigate("/app/cultos"); // Redireciona para a tela operacional
    }
  };

  return (
    <select value={user?.ministerio_id || ""} onChange={handleSelectMinistry}>
      <option value="">Visão Global (Sair do Impersonate)</option>
      {ministerios.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nome}
        </option>
      ))}
    </select>
  );
}
```
