from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from images.models import Image
from images.serializers import ImageSerializer


def index(request):
    return render(request, 'index.html')


class ImageViewSet(viewsets.ModelViewSet):

    queryset = Image.objects.all()
    serializer_class = ImageSerializer

    # [ GET ] /api/image/list/?page=N
    @action(detail=False, methods=['get'], url_path='list')
    def list_images(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
