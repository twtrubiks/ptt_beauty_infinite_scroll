from rest_framework import serializers

from images.models import Image


class ImageSerializer(serializers.ModelSerializer):
    url = serializers.CharField(source='Url')
    createdAt = serializers.DateTimeField(source='CreateDate')

    class Meta:
        model = Image
        fields = ('id', 'url', 'createdAt')
