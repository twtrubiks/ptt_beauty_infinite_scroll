from django.test import TestCase
from django.utils import timezone

from images.models import Image


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
