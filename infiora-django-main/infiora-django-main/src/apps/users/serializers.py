from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    short_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'full_name', 'short_name',
            'avatar', 'is_active', 'is_verified', 'date_joined', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'is_active', 'is_verified', 'date_joined', 'created_at', 'updated_at')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user information by staff only
    """
    
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'avatar', 'is_active', 'is_verified', 'is_staff')
        
    def update(self, instance, validated_data):
        """
        Update user instance with validated data
        """
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance