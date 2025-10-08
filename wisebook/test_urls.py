"""
Test URL configuration
"""
from django.http import HttpResponse

def test_view(request):
    return HttpResponse("<h1>WiseBook Test Page</h1><p>Server is working!</p>")

urlpatterns = [
    # Import after function definition
]

from django.urls import path
urlpatterns = [
    path('', test_view, name='test'),
]