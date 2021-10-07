"""ptt_beauty_infinite_scroll URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# from django.contrib import admin
from django.urls import include, path
from images.views import ImageViewSet, index
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('image', ImageViewSet)

urlpatterns = [
    # path('admin/', admin.site.urls),
    path('', index),
    path('api/', include(router.urls)),
]
