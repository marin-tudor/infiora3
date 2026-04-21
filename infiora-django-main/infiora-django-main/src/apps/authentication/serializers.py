from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from apps.users.models import User
from apps.users.serializers import UserSerializer


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )

            if not user:
                raise serializers.ValidationError('Invalid credentials.')

            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')

            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include "email" and "password".')


class RegisterSerializer(serializers.ModelSerializer):
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


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class ForgotPasswordSerializer(serializers.Serializer):
    """Serializer for forgot password request"""
    email = serializers.EmailField()

    def validate_email(self, value):
        """
        Validate email exists but don't reveal if it doesn't for security
        """
        try:
            user = User.objects.get(email=value, is_active=True)
            self.context['user'] = user
        except User.DoesNotExist:
            # For security reasons, we don't reveal if email exists
            pass
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    new_password = serializers.CharField(
        write_only=True, 
        validators=[validate_password],
        help_text="New password must meet security requirements"
    )
    confirm_password = serializers.CharField(
        write_only=True,
        help_text="Must match the new password"
    )
    token = serializers.CharField(
        help_text="Password reset token received via email"
    )
    uid = serializers.CharField(
        help_text="User ID from the reset link"
    )

    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Password confirmation does not match.'
            })
        return attrs


class RefreshTokenSerializer(serializers.Serializer):
    """Serializer for token refresh"""
    refresh = serializers.CharField(
        help_text="Refresh token to generate new access token"
    )


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'avatar')
        
    def update(self, instance, validated_data):
        """Update user profile fields"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class DeleteAccountSerializer(serializers.Serializer):
    """Serializer for account deletion confirmation"""
    password = serializers.CharField(
        write_only=True,
        help_text="Current password for account deletion confirmation"
    )
    confirm_deletion = serializers.BooleanField(
        help_text="Must be True to confirm account deletion"
    )
    
    def validate_confirm_deletion(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must confirm deletion by setting this to true."
            )
        return value
    
    def validate_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Invalid password.")
        return value


class EmailVerificationSerializer(serializers.Serializer):
    """Serializer for email verification"""
    email = serializers.EmailField(
        help_text="Email address to verify"
    )


class VerifyEmailTokenSerializer(serializers.Serializer):
    """Serializer for email verification token"""
    token = serializers.CharField(
        help_text="Email verification token"
    )
    uid = serializers.CharField(
        help_text="User ID from verification link"
    )


class DeactivateAccountSerializer(serializers.Serializer):
    """Serializer for account deactivation confirmation"""
    password = serializers.CharField(
        write_only=True,
        help_text="Current password for account deactivation confirmation"
    )
    
    def validate_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Invalid password.")
        return value