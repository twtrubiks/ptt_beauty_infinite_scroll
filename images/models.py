from django.db import models

# Create your models here.
class Image(models.Model):
    Url = models.TextField()
    CreateDate = models.DateTimeField()

    class Meta:
        # managed = True
        db_table = 'Images'