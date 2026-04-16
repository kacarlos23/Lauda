from django.db import models


class Evento(models.Model):
    STATUS_CHOICES = [
        ("AGENDADO", "Agendado"),
        ("REALIZADO", "Realizado"),
        ("CANCELADO", "Cancelado"),
    ]

    igreja = models.ForeignKey(
        "api.Igreja",
        on_delete=models.CASCADE,
        related_name="eventos",
    )
    ministerio = models.ForeignKey(
        "api.Ministerio",
        on_delete=models.CASCADE,
        related_name="eventos",
        blank=True,
        null=True,
    )
    nome = models.CharField(max_length=150)
    descricao = models.TextField(blank=True, null=True)
    data = models.DateField()
    horario_inicio = models.TimeField()
    horario_termino = models.TimeField(blank=True, null=True)
    local = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="AGENDADO")
    source_module = models.SlugField(blank=True, null=True)
    source_type = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "api"
        ordering = ["data", "horario_inicio", "nome"]
        verbose_name = "Evento"
        verbose_name_plural = "Eventos"
        indexes = [
            models.Index(fields=["igreja", "status", "data"]),
            models.Index(fields=["ministerio", "status", "data"]),
            models.Index(fields=["source_module", "status"]),
        ]

    def __str__(self):
        return f"{self.nome} - {self.data.strftime('%d/%m/%Y')}"


class Culto(models.Model):
    STATUS_CHOICES = [
        ("AGENDADO", "Agendado"),
        ("REALIZADO", "Realizado"),
        ("CANCELADO", "Cancelado"),
    ]

    ministerio = models.ForeignKey(
        "api.Ministerio",
        on_delete=models.CASCADE,
        related_name="cultos",
        blank=True,
        null=True,
    )
    evento = models.OneToOneField(
        "api.Evento",
        on_delete=models.SET_NULL,
        related_name="culto_musical",
        blank=True,
        null=True,
    )
    nome = models.CharField(max_length=150)
    data = models.DateField()
    horario_inicio = models.TimeField()
    horario_termino = models.TimeField(blank=True, null=True)
    local = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="AGENDADO")

    def __str__(self):
        return f"{self.nome} - {self.data.strftime('%d/%m/%Y')}"

    class Meta:
        app_label = "api"
        indexes = [
            models.Index(fields=["ministerio", "status", "data"]),
        ]


class Escala(models.Model):
    STATUS_CONFIRMACAO = [
        ("PENDENTE", "Pendente"),
        ("CONFIRMADO", "Confirmado"),
        ("RECUSADO", "Recusado"),
    ]

    ministerio = models.ForeignKey(
        "api.Ministerio",
        on_delete=models.CASCADE,
        related_name="escalas",
        blank=True,
        null=True,
    )
    culto = models.ForeignKey("api.Culto", on_delete=models.CASCADE, related_name="escalas")
    membro = models.ForeignKey(
        "accounts.Usuario",
        on_delete=models.CASCADE,
        related_name="minhas_escalas",
    )
    status_confirmacao = models.CharField(
        max_length=20,
        choices=STATUS_CONFIRMACAO,
        default="PENDENTE",
    )

    def __str__(self):
        return f"{self.membro.first_name} em {self.culto.nome}"

    class Meta:
        app_label = "api"
        indexes = [
            models.Index(fields=["ministerio", "status_confirmacao"]),
            models.Index(fields=["culto", "membro"]),
        ]
