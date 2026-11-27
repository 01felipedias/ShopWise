from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('produtos', '0016_avaliacaosupermercado_nota_entrega_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='produto',
            name='ativo',
            field=models.BooleanField(default=True),
        ),
    ]
