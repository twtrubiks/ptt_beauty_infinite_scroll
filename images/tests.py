from datetime import datetime, timezone as dt_timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from rest_framework.test import APIRequestFactory

from images.models import Image
from images.serializers import ImageSerializer
from images.views import ImageViewSet


class ImageListPaginationTests(TestCase):
    """驗證 /api/image/list/ 改為 DRF PageNumberPagination 後的契約。"""

    @classmethod
    def setUpTestData(cls):
        # 建立 25 張圖片 → 共 3 頁（10 / 10 / 5）
        now = timezone.now()
        for i in range(25):
            Image.objects.create(Url=f'https://example.com/{i}.jpg', CreateDate=now)

    def test_first_page_shape_and_next(self):
        response = self.client.get('/api/image/list/?page=1')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(set(body.keys()), {'count', 'next', 'previous', 'results'})
        self.assertEqual(body['count'], 25)
        self.assertEqual(len(body['results']), 10)
        self.assertIsNotNone(body['next'])
        self.assertIsNone(body['previous'])
        item = body['results'][0]
        self.assertEqual(set(item.keys()), {'id', 'url', 'createdAt'})

    def test_last_page_next_is_null(self):
        response = self.client.get('/api/image/list/?page=3')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body['results']), 5)
        self.assertIsNone(body['next'])
        self.assertIsNotNone(body['previous'])

    def test_out_of_range_page_returns_404(self):
        response = self.client.get('/api/image/list/?page=999')
        self.assertEqual(response.status_code, 404)

    def test_randoms_alias_removed(self):
        response = self.client.get('/api/image/randoms/?page=1')
        self.assertEqual(response.status_code, 404)

    def test_default_ordering_is_descending_id(self):
        response = self.client.get('/api/image/list/?page=1')
        ids = [item['id'] for item in response.json()['results']]
        self.assertEqual(ids, sorted(ids, reverse=True))


class ImageSerializerUnitTests(SimpleTestCase):
    """直接驗 ImageSerializer 的欄位 mapping，不需要 DB。"""

    def test_field_mapping_keys(self):
        fake = SimpleNamespace(
            id=1,
            Url='https://example.com/x.jpg',
            CreateDate=datetime(2026, 4, 26, 12, 0, 0, tzinfo=dt_timezone.utc),
        )
        data = ImageSerializer(instance=fake).data
        self.assertEqual(set(data.keys()), {'id', 'url', 'createdAt'})

    def test_field_values_pass_through(self):
        fake = SimpleNamespace(
            id=42,
            Url='https://example.com/cat.jpg',
            CreateDate=datetime(2026, 4, 26, 12, 0, 0, tzinfo=dt_timezone.utc),
        )
        data = ImageSerializer(instance=fake).data
        self.assertEqual(data['id'], 42)
        self.assertEqual(data['url'], 'https://example.com/cat.jpg')
        # DRF 預設輸出 ISO 8601 字串（含 'T' 分隔符）
        self.assertIsInstance(data['createdAt'], str)
        self.assertRegex(data['createdAt'], r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')


class ImageViewSetMockTests(SimpleTestCase):
    """測 ImageViewSet.list_images 走完 DRF 慣用呼叫鏈，不碰 DB。"""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.viewset = ImageViewSet()
        self.viewset.kwargs = {}
        self.viewset.format_kwarg = None
        self.viewset.request = self.factory.get('/api/image/list/')

    def test_list_images_invokes_drf_hooks_in_order(self):
        sentinel_qs = object()
        sentinel_filtered = object()
        sentinel_page = object()
        fake_serializer = MagicMock()
        fake_serializer.data = ['ITEM']

        with patch.object(self.viewset, 'get_queryset', return_value=sentinel_qs), \
             patch.object(self.viewset, 'filter_queryset', return_value=sentinel_filtered) as m_filter, \
             patch.object(self.viewset, 'paginate_queryset', return_value=sentinel_page) as m_paginate, \
             patch.object(self.viewset, 'get_serializer', return_value=fake_serializer) as m_get_ser, \
             patch.object(self.viewset, 'get_paginated_response', return_value=MagicMock()) as m_paged_resp:

            parent = MagicMock()
            parent.attach_mock(m_filter, 'filter_queryset')
            parent.attach_mock(m_paginate, 'paginate_queryset')
            parent.attach_mock(m_get_ser, 'get_serializer')
            parent.attach_mock(m_paged_resp, 'get_paginated_response')

            self.viewset.list_images(self.viewset.request)

            call_names = [c[0] for c in parent.mock_calls]
            self.assertEqual(call_names, [
                'filter_queryset',
                'paginate_queryset',
                'get_serializer',
                'get_paginated_response',
            ])

    def test_list_images_pipes_data_between_hooks(self):
        sentinel_qs = object()
        sentinel_filtered = object()
        sentinel_page = object()
        fake_serializer = MagicMock()
        fake_serializer.data = ['SERIALIZED']

        with patch.object(self.viewset, 'get_queryset', return_value=sentinel_qs), \
             patch.object(self.viewset, 'filter_queryset', return_value=sentinel_filtered) as m_filter, \
             patch.object(self.viewset, 'paginate_queryset', return_value=sentinel_page) as m_paginate, \
             patch.object(self.viewset, 'get_serializer', return_value=fake_serializer) as m_get_ser, \
             patch.object(self.viewset, 'get_paginated_response', return_value=MagicMock()) as m_paged_resp:

            self.viewset.list_images(self.viewset.request)

            m_filter.assert_called_once_with(sentinel_qs)
            m_paginate.assert_called_once_with(sentinel_filtered)
            m_get_ser.assert_called_once_with(sentinel_page, many=True)
            m_paged_resp.assert_called_once_with(['SERIALIZED'])
