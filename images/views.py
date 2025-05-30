from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from images.models import Image
from images.serializers import ImageSerializer


# Create your views here.
def index(request):
    return render(request, 'index.html')


# Create your views here.
class ImageViewSet(viewsets.ModelViewSet):

    queryset = Image.objects.all()
    serializer_class = ImageSerializer

    # [ GET ] /api/image/randoms/
    @action(detail=False, methods=['get'], url_path='randoms')
    def get_random_image(self, request):
        page = int(request.query_params.get('page'))
        start = (page - 1) * 10
        end = page * 10
        image = Image.objects.all().order_by('-id')[start:end]
        result = ImageSerializer(image, many=True)
        return Response(result.data, status=status.HTTP_200_OK)
