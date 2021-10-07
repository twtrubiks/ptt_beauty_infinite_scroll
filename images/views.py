from django.shortcuts import render
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Image
from .serializers import ImageSerializer

def index(request):
    return render(request, 'index.html')

class ImageViewSet(viewsets.ModelViewSet):

    queryset = Image.objects.all()
    serializer_class = ImageSerializer

    @action(detail=False, methods=['get'], url_path='randoms')
    def get_randoms_image(self, request):
        page = int(request.query_params.get('page'))
        print(page)
        start = (page - 1) * 10
        end = page * 10
        image = Image.objects.all().order_by('-id')[start:end]
        result = ImageSerializer(image, many=True)
        return Response(result.data, status=status.HTTP_200_OK)
