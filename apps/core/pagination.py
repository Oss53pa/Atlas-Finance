"""
Custom pagination classes for WiseBook API
"""
from rest_framework.pagination import PageNumberPagination


class CustomPageNumberPagination(PageNumberPagination):
    """
    Standard pagination for WiseBook API.
    Default: 25 items per page, max 100.
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'
