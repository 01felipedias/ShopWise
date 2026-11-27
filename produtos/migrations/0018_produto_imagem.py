from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('produtos', '0017_produto_ativo'),
    ]

    operations = [
        migrations.AddField(
            model_name='produto',
            name='imagem',
            field=models.ImageField(blank=True, null=True, upload_to='produtos/'),
        ),
    ]
