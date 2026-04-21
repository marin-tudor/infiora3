from rest_framework import generics, status, permissions
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.common.pagination import StandardResultsSetPagination
from .models import User
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
from .schemas_simple import (
    LIST_USERS_SCHEMA,
    CREATE_USER_SCHEMA,
    RETRIEVE_USER_SCHEMA,
    UPDATE_USER_SCHEMA,
    PARTIAL_UPDATE_USER_SCHEMA,
    DELETE_USER_SCHEMA
)


class UserViewSet(ModelViewSet):
    """
    Basic CRUD operations for user management.
    
    Provides standard Create, Read, Update, Delete operations for users.
    Only staff users can access these endpoints.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'is_verified', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['email', 'date_joined', 'first_name', 'last_name']
    ordering = ['-date_joined']

    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        """Only staff users can perform CRUD operations"""
        permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

    @LIST_USERS_SCHEMA
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @CREATE_USER_SCHEMA
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @RETRIEVE_USER_SCHEMA
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @UPDATE_USER_SCHEMA
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @PARTIAL_UPDATE_USER_SCHEMA
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @DELETE_USER_SCHEMA
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)