from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from images.models import Image
from images.serializers import ImageSerializer


PAGE_SIZE = 10


def index(request):
    return render(request, 'index.html')


class ImageViewSet(viewsets.ModelViewSet):

    queryset = Image.objects.all()
    serializer_class = ImageSerializer

    def _paginated_images(self, request):
        page_param = request.query_params.get('page', '1')
        try:
            page = int(page_param)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'page must be an integer'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if page < 1:
            return Response(
                {'detail': 'page must be >= 1'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        start = (page - 1) * PAGE_SIZE
        end = page * PAGE_SIZE
        images = Image.objects.all().order_by('-id')[start:end]
        serializer = ImageSerializer(images, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # [ GET ] /api/image/list/
    @action(detail=False, methods=['get'], url_path='list')
    def list_images(self, request):
        return self._paginated_images(request)

    # [ GET ] /api/image/randoms/  (deprecated alias - 保留以相容舊客戶端)
    @action(detail=False, methods=['get'], url_path='randoms')
    def get_random_image(self, request):
        return self._paginated_images(request)
